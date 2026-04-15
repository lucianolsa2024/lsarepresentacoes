import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface ShowroomRow {
  tipo_pedido: string;
  dt_fat: string;
  cidade: string;
  produto: string;
  segmento_cliente: string;
  cliente: string;
  oc: string;
  numero_pedido: string;
  nf_numero: string;
  representante: string;
  dt_cli: string;
  quantidade: number;
  valor: number;
}

const COLUMN_MAP: Record<string, keyof ShowroomRow> = {
  'TIPO PEDIDO': 'tipo_pedido',
  'DT FAT': 'dt_fat',
  'CIDADE': 'cidade',
  'PRODUTO': 'produto',
  'SEGMENTO CLIENTE': 'segmento_cliente',
  'CLIENTE': 'cliente',
  'OC': 'oc',
  'NUMERO PEDIDO': 'numero_pedido',
  'NUMERO NF': 'nf_numero',
  'REPRESENTANTE PF': 'representante',
  'DT CLI': 'dt_cli',
  'QTDE ( # )': 'quantidade',
  'VALOR ( R$ )': 'valor',
};

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const br = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
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

export function ShowroomImporter({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ShowroomRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary', raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const headers = Object.keys(json[0] || {});
      const colMapping: Record<string, string> = {};
      for (const h of headers) {
        const normalized = h.trim().toUpperCase();
        for (const [key, field] of Object.entries(COLUMN_MAP)) {
          if (normalized === key || normalized.includes(key)) {
            colMapping[h] = field;
            break;
          }
        }
      }

      const parsed: ShowroomRow[] = json.map((row) => {
        const mapped: any = {};
        for (const [origCol, field] of Object.entries(colMapping)) {
          mapped[field] = row[origCol];
        }
        return {
          tipo_pedido: String(mapped.tipo_pedido || '').trim(),
          dt_fat: parseExcelDate(mapped.dt_fat) || '',
          cidade: String(mapped.cidade || '').trim(),
          produto: String(mapped.produto || '').trim(),
          segmento_cliente: String(mapped.segmento_cliente || '').trim(),
          cliente: String(mapped.cliente || '').trim(),
          oc: String(mapped.oc || '').trim(),
          numero_pedido: String(mapped.numero_pedido || '').trim(),
          nf_numero: String(mapped.nf_numero || '').trim(),
          representante: String(mapped.representante || '').trim(),
          dt_cli: parseExcelDate(mapped.dt_cli) || '',
          quantidade: parseNumber(mapped.quantidade),
          valor: parseNumber(mapped.valor),
        };
      }).filter(r => r.cliente && r.nf_numero);

      // Filter only SHOW ROOM and ESTOQUE types (sell-in)
      const filtered = parsed.filter(r => {
        const t = r.tipo_pedido.toUpperCase();
        return t.includes('SHOW') || t.includes('ESTOQUE');
      });

      setRows(filtered);
      setOpen(true);
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const batch = rows.map(r => ({
        nf_numero: r.nf_numero,
        dt_faturamento: r.dt_fat || null,
        cliente: r.cliente,
        segmento_cliente: r.segmento_cliente || null,
        produto: r.produto,
        cidade: r.cidade || null,
        representante: r.representante || null,
        quantidade: r.quantidade,
        valor: r.valor,
        status_exposicao: 'pendente',
        status_treinamento: 'pendente',
      }));

      const CHUNK = 200;
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        const { error } = await supabase.from('showroom_tracking' as any).insert(chunk as any);
        if (error) throw error;
      }

      toast.success(`${rows.length} itens importados com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['showroom-tracking'] });
      setOpen(false);
      setRows([]);
      onSuccess?.();
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err.message || 'erro desconhecido'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Importar Excel
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Pré-visualização — {rows.length} itens (Show Room / Estoque)
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Dt Fat</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.tipo_pedido}</TableCell>
                    <TableCell className="font-mono text-xs">{r.nf_numero}</TableCell>
                    <TableCell className="text-xs">{r.dt_fat ? new Date(r.dt_fat + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{r.cliente}</TableCell>
                    <TableCell className="text-xs">{r.segmento_cliente}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{r.produto}</TableCell>
                    <TableCell className="text-xs">{r.cidade}</TableCell>
                    <TableCell className="text-xs">{r.representante}</TableCell>
                    <TableCell className="text-right text-xs">{r.quantidade}</TableCell>
                    <TableCell className="text-right text-xs">R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 50 && <p className="text-xs text-muted-foreground p-2">Mostrando 50 de {rows.length} linhas</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importando...' : `Importar ${rows.length} itens`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
