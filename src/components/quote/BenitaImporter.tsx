import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Sun, Loader2 } from 'lucide-react';

interface BenitaImporterProps {
  onImportComplete: () => void;
}

interface BenitaRow {
  codigo: string;
  colecao: string;
  categoria: string;
  descricao: string;
  dimensoes: string;
  preco: number;
}

// Maps spreadsheet column headers (uppercase, trimmed) -> internal field
const COLUMN_MAP: Record<string, keyof BenitaRow> = {
  CODIGO: 'codigo',
  CÓDIGO: 'codigo',
  COD: 'codigo',
  COLECAO: 'colecao',
  COLEÇÃO: 'colecao',
  LINHA: 'colecao',
  CATEGORIA: 'categoria',
  TIPO: 'categoria',
  DESCRICAO: 'descricao',
  DESCRIÇÃO: 'descricao',
  PRODUTO: 'descricao',
  DIMENSOES: 'dimensoes',
  DIMENSÕES: 'dimensoes',
  MEDIDAS: 'dimensoes',
  PRECO: 'preco',
  PREÇO: 'preco',
  VALOR: 'preco',
};

const VALID_CATEGORIES = [
  'Sofás', 'Poltronas', 'Cadeiras', 'Mesas', 'Buffets', 'Puffs',
  'Banquetas', 'Mesas Laterais', 'Mesas de Centro', 'Tapetes',
  'Área Externa', 'Outros',
];

function inferCategory(desc: string, fallback: string): string {
  if (fallback && VALID_CATEGORIES.includes(fallback)) return fallback;
  const d = (desc || '').toUpperCase();
  if (/CHAISE|SOF[ÁA]/.test(d)) return 'Sofás';
  if (/POLTRONA|BALAN[ÇC]O|ESPREGUI/.test(d)) return 'Poltronas';
  if (/CADEIRA/.test(d)) return 'Cadeiras';
  if (/BANQUETA|^BANCO\b/.test(d)) return 'Banquetas';
  if (/MESA|BIST[RÔO]/.test(d)) return 'Mesas';
  if (/PUFF/.test(d)) return 'Puffs';
  if (/BUFFET/.test(d)) return 'Buffets';
  return 'Área Externa';
}

function parseNumber(val: any): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
  return parseFloat(s) || 0;
}

export function BenitaImporter({ onImportComplete }: BenitaImporterProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BenitaRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary', raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (json.length === 0) {
          toast.error('Planilha vazia');
          return;
        }

        const headers = Object.keys(json[0]);
        const colMapping: Record<string, keyof BenitaRow> = {};
        for (const h of headers) {
          const norm = h.trim().toUpperCase();
          for (const [key, field] of Object.entries(COLUMN_MAP)) {
            if (norm === key || norm.includes(key)) {
              colMapping[h] = field;
              break;
            }
          }
        }

        const parsed: BenitaRow[] = json.map((row) => {
          const mapped: any = {};
          for (const [origCol, field] of Object.entries(colMapping)) {
            mapped[field] = row[origCol];
          }
          const descricao = String(mapped.descricao || '').trim();
          return {
            codigo: String(mapped.codigo || '').trim(),
            colecao: String(mapped.colecao || '').trim(),
            categoria: inferCategory(descricao, String(mapped.categoria || '').trim()),
            descricao,
            dimensoes: String(mapped.dimensoes || '').trim(),
            preco: parseNumber(mapped.preco),
          };
        }).filter(r => r.descricao && r.preco > 0);

        if (parsed.length === 0) {
          toast.error('Nenhuma linha válida encontrada. Verifique se as colunas estão corretas (CODIGO, DESCRICAO, PRECO obrigatórios).');
          return;
        }

        setRows(parsed);
        setOpen(true);
      } catch (err: any) {
        toast.error('Erro ao ler arquivo: ' + (err.message || 'erro desconhecido'));
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress(0);

    try {
      let created = 0;
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        // 1) Insere o produto
        const { data: product, error: pErr } = await supabase
          .from('products')
          .insert({
            code: r.codigo || `BENITA-${Date.now()}-${i}`,
            name: r.descricao.slice(0, 200),
            description: r.colecao ? `Coleção ${r.colecao}` : '',
            category: r.categoria,
            factory: 'BENITA CASA',
            has_base: false,
            available_bases: [],
          })
          .select()
          .single();

        if (pErr || !product) {
          console.error('Erro ao inserir produto', r, pErr);
          continue;
        }

        // 2) Cria modulação única (padrão)
        const { data: modulation, error: mErr } = await supabase
          .from('product_modulations')
          .insert({
            product_id: product.id,
            name: 'Padrão',
            description: r.descricao.slice(0, 300),
          })
          .select()
          .single();

        if (mErr || !modulation) {
          console.error('Erro ao inserir modulação', r, mErr);
          continue;
        }

        // 3) Cria tamanho com preço APENAS em SEM TEC
        const { error: sErr } = await supabase
          .from('modulation_sizes')
          .insert({
            modulation_id: modulation.id,
            description: r.dimensoes || 'Único',
            dimensions: r.dimensoes,
            length: '',
            depth: '',
            height: '',
            fabric_quantity: 0,
            price_sem_tec: r.preco,
            price_fx_b: 0,
            price_fx_c: 0,
            price_fx_d: 0,
            price_fx_e: 0,
            price_fx_f: 0,
            price_fx_g: 0,
            price_fx_h: 0,
            price_fx_i: 0,
            price_fx_j: 0,
            price_fx_3d: 0,
            price_fx_couro: 0,
          });

        if (sErr) {
          console.error('Erro ao inserir tamanho', r, sErr);
          continue;
        }

        created++;
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      toast.success(`${created} de ${total} produtos importados com sucesso`);
      setOpen(false);
      setRows([]);
      onImportComplete();
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err.message || 'erro desconhecido'));
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Sun className="h-4 w-4 mr-2" />
        Importar Benita Casa
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />

      <Dialog open={open} onOpenChange={(v) => !importing && setOpen(v)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Pré-visualização — Benita Casa ({rows.length} produtos)
            </DialogTitle>
            <DialogDescription>
              Preço único cadastrado na coluna SEM TEC. Categoria: Área Externa (ou inferida pela descrição).
            </DialogDescription>
          </DialogHeader>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Importando... {progress}%
              </p>
            </div>
          )}

          <div className="overflow-auto flex-1 border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Coleção</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Dimensões</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-xs">{r.colecao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={r.descricao}>
                      {r.descricao}
                    </TableCell>
                    <TableCell className="text-xs">{r.dimensoes}</TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      R$ {r.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 100 && (
              <p className="text-xs text-muted-foreground p-2 text-center">
                Mostrando 100 de {rows.length} linhas. Todas serão importadas.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {rows.length} produtos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
