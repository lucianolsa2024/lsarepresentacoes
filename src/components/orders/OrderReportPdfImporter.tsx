import { useState, useRef, useMemo } from 'react';
import { OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface OrderWithMeta {
  order: OrderFormData;
  clientId?: string | null;
  nfNumber?: string | null;
  status?: string;
}

interface Props {
  clients: Client[];
  existingOrderKeys?: Set<string>;
  onImport: (orders: OrderWithMeta[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

interface ParsedRow {
  data: string;
  representante: string;
  cliente: string;
  fornecedor: string;
  oc: string;
  pedido: string;
  produto: string;
  tecido: string;
  dimensoes: string;
  entrega: string;
  qtde: number;
  valor: number;
  tipo: string;
  pagamento: string;
}

// ─── Helpers ───

function parseBrDate(str: string): string | null {
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function parseBrMoney(str: string): number {
  if (!str) return 0;
  const raw = str.replace(/[R$\s]/g, '');
  if (!raw) return 0;
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;
  if (hasComma && hasDot) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = raw.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// Column headers expected in the PDF table
const HEADER_KEYS = ['DATA', 'REPRESENTANTE', 'CLIENTE', 'FORNECEDOR', 'OC', 'PEDIDO', 'PRODUTO', 'TECIDO', 'DIMENSÕES', 'ENTREGA', 'QTDE', 'VALOR', 'TIPO', 'PAGAMENTO'];

interface TextItem {
  str: string;
  x: number;
  y: number;
}

async function extractTableFromPdf(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allRows: ParsedRow[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items: TextItem[] = (content.items as any[]).map(item => ({
      str: item.str || '',
      x: item.transform ? item.transform[4] : 0,
      y: item.transform ? item.transform[5] : 0,
    }));

    if (items.length === 0) continue;

    // Group items by Y position (same row = Y within 3px)
    const rowMap = new Map<number, TextItem[]>();
    for (const item of items) {
      let foundY: number | null = null;
      for (const key of rowMap.keys()) {
        if (Math.abs(key - item.y) <= 3) { foundY = key; break; }
      }
      const yKey = foundY ?? item.y;
      if (!rowMap.has(yKey)) rowMap.set(yKey, []);
      rowMap.get(yKey)!.push(item);
    }

    // Sort rows top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);

    // Find the header row to determine column X positions
    let headerColPositions: { key: string; x: number }[] = [];
    let headerYIndex = -1;

    for (let i = 0; i < sortedYs.length; i++) {
      const rowItems = rowMap.get(sortedYs[i])!;
      const rowText = rowItems.map(it => it.str.trim()).join(' ').toUpperCase();
      // Check if this row contains most header keywords
      const matchCount = HEADER_KEYS.filter(h => rowText.includes(h)).length;
      if (matchCount >= 8) {
        // Found header row — extract X positions for each header
        for (const hk of HEADER_KEYS) {
          const match = rowItems.find(it => it.str.trim().toUpperCase() === hk || it.str.trim().toUpperCase().startsWith(hk));
          if (match) {
            headerColPositions.push({ key: hk, x: match.x });
          }
        }
        headerColPositions.sort((a, b) => a.x - b.x);
        headerYIndex = i;
        break;
      }
    }

    if (headerColPositions.length < 8) {
      // Fallback: try to parse line-by-line with regex
      continue;
    }

    // Parse data rows after header
    for (let i = headerYIndex + 1; i < sortedYs.length; i++) {
      const rowItems = rowMap.get(sortedYs[i])!.sort((a, b) => a.x - b.x);

      // Assign each text item to the nearest column
      const colValues: Record<string, string> = {};
      for (const hc of headerColPositions) colValues[hc.key] = '';

      for (const item of rowItems) {
        if (!item.str.trim()) continue;
        // Find closest column
        let bestCol = headerColPositions[0];
        let bestDist = Math.abs(item.x - bestCol.x);
        for (const hc of headerColPositions) {
          const dist = Math.abs(item.x - hc.x);
          if (dist < bestDist) { bestDist = dist; bestCol = hc; }
        }
        colValues[bestCol.key] = colValues[bestCol.key]
          ? colValues[bestCol.key] + ' ' + item.str.trim()
          : item.str.trim();
      }

      // Skip empty rows or rows without a pedido number
      const pedido = colValues['PEDIDO']?.trim();
      if (!pedido || !/\d/.test(pedido)) continue;

      const qtdeRaw = parseInt(colValues['QTDE']?.trim() || '1', 10);

      allRows.push({
        data: colValues['DATA']?.trim() || '',
        representante: colValues['REPRESENTANTE']?.trim() || '',
        cliente: colValues['CLIENTE']?.trim() || '',
        fornecedor: colValues['FORNECEDOR']?.trim() || '',
        oc: colValues['OC']?.trim() || '',
        pedido,
        produto: colValues['PRODUTO']?.trim() || '',
        tecido: colValues['TECIDO']?.trim() || '',
        dimensoes: (colValues['DIMENSÕES'] || colValues['DIMENSOES'] || '').trim(),
        entrega: colValues['ENTREGA']?.trim() || '',
        qtde: isNaN(qtdeRaw) || qtdeRaw <= 0 ? 1 : qtdeRaw,
        valor: parseBrMoney(colValues['VALOR'] || ''),
        tipo: colValues['TIPO']?.trim() || 'ENCOMENDA',
        pagamento: colValues['PAGAMENTO']?.trim() || '',
      });
    }
  }

  return allRows;
}

export function OrderReportPdfImporter({ clients, existingOrderKeys, onImport, onAddClient, onComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [stats, setStats] = useState<{ total: number; duplicatas: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { nameToEmail } = useRepresentatives();
  const normalizedNameToEmail = useMemo(() => {
    return Object.fromEntries(
      Object.entries(nameToEmail).map(([name, email]) => [
        name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim(),
        email,
      ])
    );
  }, [nameToEmail]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await extractTableFromPdf(file);
      if (rows.length === 0) {
        toast.error('Nenhum pedido encontrado no PDF');
        return;
      }

      // Dedup
      const dedupKeys = existingOrderKeys ? new Set(existingOrderKeys) : new Set<string>();
      const unique: ParsedRow[] = [];
      let dupCount = 0;

      for (const r of rows) {
        const key = `${r.cliente.toLowerCase().trim()}::${r.pedido.trim()}::${r.produto.toLowerCase().trim()}`;
        const simpleKey = `${r.cliente.toLowerCase().trim()}::${r.pedido.trim()}`;
        if (dedupKeys.has(key) || dedupKeys.has(simpleKey)) {
          dupCount++;
          continue;
        }
        dedupKeys.add(key);
        unique.push(r);
      }

      setPreview(unique);
      setStats({ total: rows.length, duplicatas: dupCount });
      toast.success(`${unique.length} pedidos prontos para importar${dupCount > 0 ? ` (${dupCount} duplicatas ignoradas)` : ''}`);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      toast.error('Erro ao ler o PDF');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    try {
      const clientMap = new Map<string, string>();
      clients.forEach(c => clientMap.set(c.company.toLowerCase(), c.id));

      const newClientNames = [...new Set(
        preview
          .map(r => r.cliente)
          .filter(name => !clientMap.has(name.toLowerCase()))
      )];

      for (const name of newClientNames) {
        const firstRow = preview.find(r => r.cliente === name);
        const repEmail = firstRow?.representante
          ? normalizedNameToEmail[firstRow.representante.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()] || undefined
          : undefined;
        const newClient = await onAddClient({
          name: '',
          company: name,
          document: '',
          phone: '',
          email: '',
          isNewClient: true,
          ownerEmail: repEmail,
          address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
        });
        if (newClient) clientMap.set(name.toLowerCase(), newClient.id);
      }

      const isFabricProvided = (tecido: string) => /tecido\s*forn/i.test(tecido);
      const placeholder2027 = (dateStr: string) => {
        const parsed = parseBrDate(dateStr);
        return parsed === '2027-12-31' ? null : parsed;
      };

      const ordersWithClients: OrderWithMeta[] = preview.map(r => ({
        order: {
          issueDate: parseBrDate(r.data) || new Date().toISOString().split('T')[0],
          clientName: r.cliente,
          supplier: r.fornecedor || 'SOHOME',
          representative: r.representante,
          orderNumber: r.pedido,
          oc: r.oc,
          product: r.produto,
          fabricProvided: isFabricProvided(r.tecido) ? 'SIM' : 'NAO',
          fabric: isFabricProvided(r.tecido) ? '' : r.tecido,
          dimensions: r.dimensoes,
          deliveryDate: placeholder2027(r.entrega) || '',
          quantity: r.qtde,
          price: r.valor,
          orderType: r.tipo || 'ENCOMENDA',
          paymentTerms: r.pagamento,
        },
        clientId: clientMap.get(r.cliente.toLowerCase()) || null,
        status: 'pendente',
      }));

      const count = await onImport(ordersWithClients);
      toast.success(`${count} pedidos importados com sucesso!`);
      if (newClientNames.length > 0) toast.info(`${newClientNames.length} novo(s) cliente(s) criado(s)`);
      setPreview([]);
      setStats(null);
      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro na importação');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Relatório de Pedidos (PDF)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa o relatório tabular de pedidos em PDF (formato padrão com colunas: Data, Representante, Cliente, Fornecedor, etc.). Duplicatas são ignoradas.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleFile}
          className="hidden"
        />

        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4 mr-2" />
          Selecionar PDF
        </Button>

        {stats && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Resultado do parsing:
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span>Total no PDF: <strong>{stats.total}</strong></span>
              <span>Para importar: <strong>{preview.length}</strong></span>
              {stats.duplicatas > 0 && (
                <span className="text-destructive">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Duplicatas: <strong>{stats.duplicatas}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{preview.length} pedidos prontos para importar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes: {[...new Set(preview.map(r => r.cliente))].length} |
                Novos: {[...new Set(preview.map(r => r.cliente).filter(name => !clients.some(c => c.company.toLowerCase() === name.toLowerCase())))].length} |
                Valor total: {preview.reduce((s, r) => s + r.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Fornecedor</th>
                    <th className="p-2 text-left">Entrega</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.data}</td>
                      <td className="p-2">{r.cliente}</td>
                      <td className="p-2">{r.pedido}</td>
                      <td className="p-2 max-w-[200px] truncate">{r.produto}</td>
                      <td className="p-2">{r.fornecedor}</td>
                      <td className="p-2">{r.entrega}</td>
                      <td className="p-2 text-right">{r.qtde}</td>
                      <td className="p-2 text-right">{r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="p-2 text-xs text-muted-foreground text-center">... e mais {preview.length - 50} pedidos</p>
              )}
            </div>

            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Importar {preview.length} pedidos
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
