import { useState, useRef, useMemo } from 'react';
import { OrderFormData } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, FileText, AlertCircle, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  clients: Client[];
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

export interface ImportLogEntry {
  row: number;
  clientName: string;
  orderNumber: string;
  product: string;
  price: number;
  status: 'success' | 'error' | 'duplicate';
  message?: string;
}

// Column header patterns (same as Excel importer)
const COLUMN_KEYWORDS: Record<string, string[]> = {
  issueDate: ['dt emissao', 'data emissao', 'emissao', 'dt ped', 'data pedido'],
  clientName: ['cliente', 'client', 'razao social', 'empresa'],
  orderNumber: ['numero pedido', 'num ped', 'pedido', 'n ped'],
  oc: ['oc', 'ordem comp', 'o c'],
  product: ['produto completo', 'produto', 'prod', 'modelo', 'descricao prod'],
  fabric: ['tecido', 'tec', 'revestimento'],
  supplier: ['fornecedor', 'forn', 'fabrica', 'marca'],
  deliveryDate: ['dt entrega', 'data entrega', 'entrega', 'prev entrega', 'previsao'],
  paymentTerms: ['cond pgto', 'cond pagto', 'cond pag', 'condicoes', 'prazo pag', 'pagamento'],
  representative: ['representante pf', 'representante', 'rep', 'vendedor', 'consultor'],
  quantity: ['qtde #', 'qtde', 'qtd', 'quantidade', 'quant'],
  price: ['valor r', 'valor', 'preco', 'vlr', 'total', 'vl'],
  fabricProvided: ['tecido forn', 'tec forn', 'fornece tec'],
  dimensions: ['comp prof', 'dimensao', 'dim', 'medida', 'tamanho'],
  orderType: ['tipo pedido', 'tipo ped', 'tipo', 'order type'],
};

function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function detectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalized = headers.map(normalizeForMatch);

  for (const field of Object.keys(COLUMN_KEYWORDS)) {
    const keywords = COLUMN_KEYWORDS[field];
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (!h) continue;
      let score = -1;
      if (keywords.some(k => h === k)) score = 3;
      else if (keywords.some(k => h.startsWith(k))) score = 2;
      else if (keywords.some(k => h.includes(k))) score = 1;

      if (score > bestScore) { bestScore = score; bestIndex = i; }
    }
    if (bestIndex >= 0) mapping[field] = bestIndex;
  }
  return mapping;
}

// Parse CSV respecting quoted fields
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

function parseDate(value: string): string {
  if (!value) return '';
  const str = value.trim();
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    let [a, b, c] = slashParts;
    let year = c.length === 2 ? `20${c}` : c;
    if (parseInt(a) > 12) {
      return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return str;
}

function parsePrice(value: string): number {
  if (!value) return 0;
  let str = value.replace(/[^\d.,\-]/g, '');
  if (!str) return 0;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) return parseFloat(str) || 0;

  if (lastComma > lastDot) {
    // European/BR format: 1.234,56 or 1234,56
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const afterDot = str.substring(lastDot + 1);
    if (afterDot.length === 3 && lastComma === -1) {
      // Brazilian thousands separator: "9.463" = 9463
      str = str.replace(/\./g, '');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  return parseFloat(str) || 0;
}

export function OrderCsvImporter({ clients, onImport, onAddClient, onComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OrderFormData[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, number>>({});
  const [headerNames, setHeaderNames] = useState<string[]>([]);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [progress, setProgress] = useState(0);
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
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error('Arquivo vazio ou sem dados'); return; }

      const delimiter = detectDelimiter(lines[0]);
      console.log('[CsvImporter] Delimiter:', JSON.stringify(delimiter), 'Lines:', lines.length);

      const headers = parseCsvLine(lines[0], delimiter);
      console.log('[CsvImporter] Headers:', headers);

      const mapping = detectMapping(headers);
      console.log('[CsvImporter] Mapping:', mapping);
      setDetectedColumns(mapping);
      setHeaderNames(headers);

      if (mapping.clientName == null) {
        toast.error('Coluna de cliente não encontrada no CSV');
        return;
      }

      const rows: OrderFormData[] = [];
      for (let i = 1; i < lines.length; i++) {
        try {
          const vals = parseCsvLine(lines[i], delimiter);
          const clientName = (vals[mapping.clientName] || '').trim();
          if (!clientName) continue;

          const rawFabric = mapping.fabric != null ? (vals[mapping.fabric] || '').trim() : '';
          const isFabricProvided = /tecido\s*forn/i.test(rawFabric);

          let rawOrderType = mapping.orderType != null ? (vals[mapping.orderType] || 'ENCOMENDA').trim() : 'ENCOMENDA';
          if (/^\d+$/.test(rawOrderType)) rawOrderType = 'ENCOMENDA';

          rows.push({
            issueDate: mapping.issueDate != null ? parseDate(vals[mapping.issueDate]) : new Date().toISOString().split('T')[0],
            clientName,
            supplier: mapping.supplier != null ? (vals[mapping.supplier] || 'SOHOME').trim().toUpperCase() : 'SOHOME',
            representative: mapping.representative != null ? (vals[mapping.representative] || '').trim() : '',
            orderNumber: mapping.orderNumber != null ? (vals[mapping.orderNumber] || '').trim() : '',
            oc: mapping.oc != null ? (vals[mapping.oc] || '').trim() : '',
            product: mapping.product != null ? (vals[mapping.product] || '').trim() : '',
            fabricProvided: isFabricProvided ? 'SIM' : 'NAO',
            fabric: isFabricProvided ? '' : rawFabric,
            dimensions: mapping.dimensions != null ? (vals[mapping.dimensions] || '').trim() : '',
            deliveryDate: mapping.deliveryDate != null ? parseDate(vals[mapping.deliveryDate]) : '',
            quantity: mapping.quantity != null ? (parseInt(vals[mapping.quantity] || '1') || 1) : 1,
            price: mapping.price != null ? parsePrice(vals[mapping.price]) : 0,
            orderType: rawOrderType.toUpperCase(),
            paymentTerms: mapping.paymentTerms != null ? (vals[mapping.paymentTerms] || '').trim() : '',
          });
        } catch (err) {
          console.warn(`[CsvImporter] Skipping row ${i + 1}:`, err);
        }
      }

      setPreview(rows);
      setImportLog([]);
      setShowLog(false);
      toast.success(`${rows.length} pedidos encontrados no CSV.`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Erro ao ler o arquivo CSV. Verifique o formato.');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setProgress(0);
    const log: ImportLogEntry[] = [];

    try {
      // Step 1: Create missing clients
      const clientMap = new Map<string, string>();
      clients.forEach(c => clientMap.set(c.company.toLowerCase(), c.id));

      const newClientNames = [...new Set(
        preview.map(o => o.clientName).filter(name => !clientMap.has(name.toLowerCase()))
      )];

      for (const name of newClientNames) {
        try {
          const firstOrder = preview.find(o => o.clientName === name);
          const repEmail = firstOrder?.representative
            ? normalizedNameToEmail[firstOrder.representative.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()] || undefined
            : undefined;
          const newClient = await onAddClient({
            name: '', company: name, document: '', phone: '', email: '',
            isNewClient: true, ownerEmail: repEmail,
            address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
          });
          if (newClient) clientMap.set(name.toLowerCase(), newClient.id);
        } catch (err) {
          console.warn(`[CsvImporter] Failed to create client ${name}:`, err);
        }
      }

      // Step 2: Import in batches of 50
      const BATCH_SIZE = 50;
      let importedCount = 0;

      for (let i = 0; i < preview.length; i += BATCH_SIZE) {
        const batch = preview.slice(i, i + BATCH_SIZE);
        const batchData = batch.map(order => ({
          order,
          clientId: clientMap.get(order.clientName.toLowerCase()) || null,
        }));

        try {
          const count = await onImport(batchData);
          importedCount += count;

          // Log success for each row in batch
          batch.forEach((order, j) => {
            log.push({
              row: i + j + 2,
              clientName: order.clientName,
              orderNumber: order.orderNumber,
              product: order.product,
              price: order.price,
              status: 'success',
            });
          });
        } catch (err: any) {
          // Log error for batch
          batch.forEach((order, j) => {
            log.push({
              row: i + j + 2,
              clientName: order.clientName,
              orderNumber: order.orderNumber,
              product: order.product,
              price: order.price,
              status: 'error',
              message: err?.message || 'Erro desconhecido',
            });
          });
        }

        setProgress(Math.round(((i + batch.length) / preview.length) * 100));
        // Yield to UI thread
        await new Promise(r => setTimeout(r, 50));
      }

      setImportLog(log);
      setShowLog(true);

      const successCount = log.filter(l => l.status === 'success').length;
      const errorCount = log.filter(l => l.status === 'error').length;

      if (errorCount === 0) {
        toast.success(`${successCount} pedidos importados com sucesso!`);
      } else {
        toast.warning(`${successCount} importados, ${errorCount} com erro. Veja o log.`);
      }

      if (newClientNames.length > 0) {
        toast.info(`${newClientNames.length} novo(s) cliente(s) criado(s)`);
      }

      if (errorCount === 0) {
        setPreview([]);
        setDetectedColumns({});
        setHeaderNames([]);
        onComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro geral na importação');
    } finally {
      setImporting(false);
    }
  };

  const downloadLog = () => {
    if (importLog.length === 0) return;
    const header = 'Linha;Cliente;Pedido;Produto;Valor;Status;Mensagem\n';
    const rows = importLog.map(l =>
      `${l.row};"${l.clientName}";"${l.orderNumber}";"${l.product}";${l.price.toFixed(2)};${l.status};${l.message || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-importacao-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldLabels: Record<string, string> = {
    issueDate: 'Data Emissão', clientName: 'Cliente', orderNumber: 'Nº Pedido', oc: 'OC',
    product: 'Produto', fabric: 'Tecido', supplier: 'Fornecedor', deliveryDate: 'Data Entrega',
    paymentTerms: 'Cond. Pagamento', representative: 'Representante', quantity: 'Quantidade',
    price: 'Valor', fabricProvided: 'Tecido Fornecido', dimensions: 'Dimensão', orderType: 'Tipo Pedido',
  };

  const mappedFields = Object.entries(detectedColumns);
  const successCount = importLog.filter(l => l.status === 'success').length;
  const errorCount = importLog.filter(l => l.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Pedidos via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exporte sua planilha como CSV (separado por <code>;</code> ou <code>,</code>). 
          O sistema detecta automaticamente as colunas e o delimitador.
        </p>

        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />

        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4 mr-2" />
          Selecionar CSV
        </Button>

        {/* Column mapping feedback */}
        {mappedFields.length > 0 && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Colunas detectadas:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mappedFields.map(([field, colIndex]) => (
                <span key={field} className="inline-flex items-center gap-1 text-xs bg-background border rounded-md px-2 py-1">
                  <span className="font-medium">{fieldLabels[field] || field}</span>
                  <span className="text-muted-foreground">← {headerNames[colIndex] || ''}</span>
                </span>
              ))}
            </div>
            {Object.keys(COLUMN_KEYWORDS).filter(f => !(f in detectedColumns)).length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Não encontradas: {Object.keys(COLUMN_KEYWORDS).filter(f => !(f in detectedColumns)).map(f => fieldLabels[f] || f).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Progress bar */}
        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && !showLog && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{preview.length} pedidos prontos para importar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes: {[...new Set(preview.map(o => o.clientName))].length} |
                Novos: {[...new Set(preview.map(o => o.clientName).filter(name => !clients.some(c => c.company.toLowerCase() === name.toLowerCase())))].length}
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
                    <th className="p-2 text-left">Tecido</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((o, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 whitespace-nowrap">{o.issueDate}</td>
                      <td className="p-2 max-w-[150px] truncate">{o.clientName}</td>
                      <td className="p-2">{o.orderNumber || '-'}</td>
                      <td className="p-2">{o.product}</td>
                      <td className="p-2">{o.fabric}</td>
                      <td className="p-2 text-right">{o.quantity}</td>
                      <td className="p-2 text-right whitespace-nowrap">{o.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="text-xs text-center py-2 text-muted-foreground">... e mais {preview.length - 50} pedidos</p>
              )}
            </div>

            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Importar {preview.length} Pedidos</>
              )}
            </Button>
          </div>
        )}

        {/* Import Log */}
        {showLog && importLog.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Log de Importação</h4>
                <Badge variant="default">{successCount} OK</Badge>
                {errorCount > 0 && <Badge variant="destructive">{errorCount} Erro</Badge>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadLog}>
                  <Download className="h-3 w-3 mr-1" /> Exportar Log
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowLog(false); setImportLog([]); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Linha</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importLog.map((entry, i) => (
                    <tr key={i} className={`border-t ${entry.status === 'error' ? 'bg-destructive/10' : ''}`}>
                      <td className="p-2">{entry.row}</td>
                      <td className="p-2 max-w-[120px] truncate">{entry.clientName}</td>
                      <td className="p-2">{entry.orderNumber || '-'}</td>
                      <td className="p-2 max-w-[120px] truncate">{entry.product}</td>
                      <td className="p-2 text-right whitespace-nowrap">{entry.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="p-2 text-center">
                        {entry.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-primary inline" />
                        ) : (
                          <span className="text-destructive" title={entry.message}>
                            <AlertCircle className="h-3 w-3 inline" /> {entry.message}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
