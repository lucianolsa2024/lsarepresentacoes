import { useState, useMemo } from 'react';
import { OrderFormData } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardPaste, Loader2, CheckCircle, AlertCircle, Download, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportLogEntry } from './OrderCsvImporter';

interface Props {
  clients: Client[];
  existingOrderKeys: Set<string>;
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

const COLUMN_KEYWORDS: Record<string, string[]> = {
  issueDate: ['dt emissao', 'dt emiss', 'data emissao', 'emissao', 'dt ped', 'data pedido'],
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
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function detectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalized = headers.map(normalizeForMatch);
  for (const field of Object.keys(COLUMN_KEYWORDS)) {
    const keywords = COLUMN_KEYWORDS[field];
    let bestIndex = -1, bestScore = -1;
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

function parseDate(value: string): string {
  if (!value) return '';
  const str = String(value).trim();

  // Formato brasileiro DD/MM/AAAA (vindo do paste do Excel)
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day   = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year  = brMatch[3];
    const iso   = `${year}-${month}-${day}`;
    return iso === '2027-12-31' ? '' : iso;
  }

  // Serial numérico do Excel (upload de arquivo .xlsx)
  if (!isNaN(Number(str)) && Number(str) > 1000) {
    const ms  = (Number(str) - 25569) * 86400 * 1000;
    const iso = new Date(ms).toISOString().split('T')[0];
    return iso === '2027-12-31' ? '' : iso;
  }

  // ISO ou outro formato reconhecido pelo JS
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
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
    // Could be US format (1,234.56) or BR thousands-only (9.463 meaning 9463)
    const afterDot = str.substring(lastDot + 1);
    if (afterDot.length === 3 && lastComma === -1) {
      // Brazilian thousands separator: "9.463" = 9463, "21.615" = 21615
      str = str.replace(/\./g, '');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  return parseFloat(str) || 0;
}

function makeDedupeKey(clientName: string, orderNumber: string): string {
  return `${clientName.toLowerCase().trim()}::${orderNumber.trim()}`;
}

export function OrderPasteImporter({ clients, existingOrderKeys, onImport, onAddClient, onComplete }: Props) {
  const [pastedText, setPastedText] = useState('');
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<(OrderFormData & { _rowIndex: number; _duplicate: boolean })[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, number>>({});
  const [headerNames, setHeaderNames] = useState<string[]>([]);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [progress, setProgress] = useState(0);
  const { nameToEmail } = useRepresentatives();

  const normalizedNameToEmail = useMemo(() => {
    return Object.fromEntries(
      Object.entries(nameToEmail).map(([name, email]) => [
        name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim(), email,
      ])
    );
  }, [nameToEmail]);

  const handleParse = () => {
    if (!pastedText.trim()) { toast.error('Cole os dados do Excel primeiro'); return; }

    const lines = pastedText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast.error('Dados insuficientes. Inclua o cabeçalho e pelo menos 1 linha.'); return; }

    // Excel paste is always tab-separated
    const headers = lines[0].split('\t').map(h => h.trim());
    console.log('[PasteImporter] Headers:', headers);

    const mapping = detectMapping(headers);
    console.log('[PasteImporter] Mapping:', mapping);
    setDetectedColumns(mapping);
    setHeaderNames(headers);

    if (mapping.clientName == null) { toast.error('Coluna de cliente não encontrada'); return; }

    const rows: (OrderFormData & { _rowIndex: number; _duplicate: boolean })[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const vals = lines[i].split('\t').map(v => v.trim());
        const clientName = (vals[mapping.clientName] || '').trim();
        if (!clientName) continue;

        const rawFabric = mapping.fabric != null ? (vals[mapping.fabric] || '').trim() : '';
        const isFabricProvided = /tecido\s*forn/i.test(rawFabric);
        let rawOrderType = mapping.orderType != null ? (vals[mapping.orderType] || 'ENCOMENDA').trim() : 'ENCOMENDA';
        if (/^\d+$/.test(rawOrderType)) rawOrderType = 'ENCOMENDA';

        const orderNumber = mapping.orderNumber != null ? (vals[mapping.orderNumber] || '').trim() : '';
        const isDuplicate = orderNumber
          ? existingOrderKeys.has(makeDedupeKey(clientName, orderNumber))
          : false;

        rows.push({
          _rowIndex: i + 1,
          _duplicate: isDuplicate,
          issueDate: mapping.issueDate != null ? parseDate(vals[mapping.issueDate]) : new Date().toISOString().split('T')[0],
          clientName,
          supplier: mapping.supplier != null ? (vals[mapping.supplier] || 'SOHOME').trim().toUpperCase() : 'SOHOME',
          representative: mapping.representative != null ? (vals[mapping.representative] || '').trim() : '',
          orderNumber,
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
        console.warn(`[PasteImporter] Skipping row ${i + 1}:`, err);
      }
    }

    setPreview(rows);
    setImportLog([]);
    setShowLog(false);

    const dupeCount = rows.filter(r => r._duplicate).length;
    if (dupeCount > 0) {
      toast.warning(`${rows.length} pedidos encontrados. ${dupeCount} duplicado(s) marcados em vermelho.`);
    } else {
      toast.success(`${rows.length} pedidos encontrados.`);
    }
  };

  const removeRow = (index: number) => {
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  const removeDuplicates = () => {
    setPreview(prev => prev.filter(r => !r._duplicate));
    toast.success('Duplicados removidos');
  };

  const handleImport = async () => {
    const toImport = preview.filter(r => !r._duplicate);
    if (toImport.length === 0) { toast.error('Nenhum pedido para importar (todos duplicados)'); return; }

    setImporting(true);
    setProgress(0);
    const log: ImportLogEntry[] = [];

    try {
      const clientMap = new Map<string, string>();
      clients.forEach(c => clientMap.set(c.company.toLowerCase(), c.id));

      const newClientNames = [...new Set(
        toImport.map(o => o.clientName).filter(name => !clientMap.has(name.toLowerCase()))
      )];

      for (const name of newClientNames) {
        try {
          const firstOrder = toImport.find(o => o.clientName === name);
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
          console.warn(`[PasteImporter] Failed to create client ${name}:`, err);
        }
      }

      const BATCH_SIZE = 50;
      let importedCount = 0;

      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);
        const batchData = batch.map(order => ({
          order: {
            issueDate: order.issueDate, clientName: order.clientName, supplier: order.supplier,
            representative: order.representative, orderNumber: order.orderNumber, oc: order.oc,
            product: order.product, fabricProvided: order.fabricProvided, fabric: order.fabric,
            dimensions: order.dimensions, deliveryDate: order.deliveryDate, quantity: order.quantity,
            price: order.price, orderType: order.orderType, paymentTerms: order.paymentTerms,
          } as OrderFormData,
          clientId: clientMap.get(order.clientName.toLowerCase()) || null,
        }));

        try {
          const count = await onImport(batchData);
          importedCount += count;
          batch.forEach((order, j) => {
            log.push({ row: order._rowIndex, clientName: order.clientName, orderNumber: order.orderNumber, product: order.product, price: order.price, status: 'success' });
          });
        } catch (err: any) {
          batch.forEach((order, j) => {
            log.push({ row: order._rowIndex, clientName: order.clientName, orderNumber: order.orderNumber, product: order.product, price: order.price, status: 'error', message: err?.message || 'Erro' });
          });
        }

        setProgress(Math.round(((i + batch.length) / toImport.length) * 100));
        await new Promise(r => setTimeout(r, 50));
      }

      // Add skipped duplicates to log
      preview.filter(r => r._duplicate).forEach(r => {
        log.push({ row: r._rowIndex, clientName: r.clientName, orderNumber: r.orderNumber, product: r.product, price: r.price, status: 'duplicate', message: 'Pedido já existe' });
      });

      setImportLog(log);
      setShowLog(true);

      const successCount = log.filter(l => l.status === 'success').length;
      const errorCount = log.filter(l => l.status === 'error').length;
      const dupeCount = log.filter(l => l.status === 'duplicate').length;

      if (errorCount === 0) {
        toast.success(`${successCount} importados, ${dupeCount} duplicados ignorados.`);
      } else {
        toast.warning(`${successCount} importados, ${errorCount} com erro, ${dupeCount} duplicados.`);
      }

      if (newClientNames.length > 0) toast.info(`${newClientNames.length} novo(s) cliente(s) criado(s)`);

      if (errorCount === 0) {
        setPreview([]);
        setPastedText('');
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
  const duplicateCount = preview.filter(r => r._duplicate).length;
  const validCount = preview.filter(r => !r._duplicate).length;
  const successCount = importLog.filter(l => l.status === 'success').length;
  const errorCount = importLog.filter(l => l.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPaste className="h-5 w-5" />
          Colar Dados do Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copie as linhas do Excel (com cabeçalho) e cole no campo abaixo. O sistema detecta automaticamente as colunas e marca duplicados.
        </p>

        {preview.length === 0 && !showLog && (
          <>
            <Textarea
              placeholder="Cole aqui os dados copiados do Excel (Ctrl+C no Excel, depois Ctrl+V aqui)..."
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
            <Button onClick={handleParse} disabled={!pastedText.trim()}>
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Processar Dados
            </Button>
          </>
        )}

        {mappedFields.length > 0 && !showLog && (
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
          </div>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
          </div>
        )}

        {preview.length > 0 && !showLog && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{preview.length} pedidos encontrados</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {validCount} válidos | {duplicateCount} duplicados |
                  Clientes: {[...new Set(preview.map(o => o.clientName))].length}
                </p>
              </div>
              {duplicateCount > 0 && (
                <Button variant="outline" size="sm" onClick={removeDuplicates}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remover {duplicateCount} duplicados
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Tecido</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Preço</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((o, i) => (
                    <tr key={i} className={`border-t ${o._duplicate ? 'bg-destructive/10 line-through opacity-60' : ''}`}>
                      <td className="p-2 text-muted-foreground">{o._rowIndex}</td>
                      <td className="p-2 whitespace-nowrap">{o.issueDate}</td>
                      <td className="p-2 max-w-[150px] truncate">{o.clientName}</td>
                      <td className="p-2">{o.orderNumber || '-'}</td>
                      <td className="p-2 max-w-[120px] truncate">{o.product}</td>
                      <td className="p-2 max-w-[100px] truncate">{o.fabric}</td>
                      <td className="p-2 text-right">{o.quantity}</td>
                      <td className="p-2 text-right whitespace-nowrap">{o.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="p-2 text-center">
                        {o._duplicate ? (
                          <Badge variant="destructive" className="text-[10px]">Duplicado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importing || validCount === 0} className="flex-1">
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Importar {validCount} Pedidos</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setPreview([]); setPastedText(''); setDetectedColumns({}); setHeaderNames([]); }}>
                Limpar
              </Button>
            </div>
          </div>
        )}

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
                    <tr key={i} className={`border-t ${entry.status === 'error' ? 'bg-destructive/10' : entry.status === 'duplicate' ? 'bg-muted/50' : ''}`}>
                      <td className="p-2">{entry.row}</td>
                      <td className="p-2 max-w-[120px] truncate">{entry.clientName}</td>
                      <td className="p-2">{entry.orderNumber || '-'}</td>
                      <td className="p-2 max-w-[120px] truncate">{entry.product}</td>
                      <td className="p-2 text-right whitespace-nowrap">{entry.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="p-2 text-center">
                        {entry.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-primary inline" />
                        ) : entry.status === 'duplicate' ? (
                          <span className="text-muted-foreground text-[10px]">Duplicado</span>
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
