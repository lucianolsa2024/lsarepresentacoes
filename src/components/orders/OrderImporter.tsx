import { useState, useRef } from 'react';
import { OrderFormData } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

interface Props {
  clients: Client[];
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

// Keywords for each field — first match wins
const COLUMN_PATTERNS: Record<string, RegExp> = {
  issueDate: /^(dt\s*emiss[aã]o|data\s*emiss[aã]o|emiss[aã]o|dt\s*ped)/i,
  clientName: /^(cliente|client|razao|raz[aã]o\s*social|empresa)/i,
  orderNumber: /^(n[uú]mero\s*pedido|num\s*ped|pedido|numero|n[°º]?\s*ped)/i,
  oc: /^(oc|ordem\s*comp|o\.?c\.?)/i,
  product: /^(produto|prod|modelo|descri[cç][aã]o\s*prod)/i,
  fabric: /^(tecido|tec|revestimento)/i,
  supplier: /^(fornecedor|forn|f[aá]brica|marca)/i,
  deliveryDate: /^(dt\s*entrega|data\s*entrega|entrega|prev\s*entrega|previs[aã]o)/i,
  paymentTerms: /^(cond\s*pg|cond\s*pagto|cond\.\s*pag|condi[cç][oõ]es|prazo\s*pag|pagamento)/i,
  representative: /^(representante|rep|vendedor|consultor)/i,
  quantity: /^(qtd|quantidade|quant|qtde)/i,
  price: /^(valor|pre[cç]o|vlr|total|vl)/i,
  fabricProvided: /^(tecido\s*forn|tec\s*forn|fornece\s*tec)/i,
  dimensions: /^(dimens[aã]o|dim|medida|tamanho|comp\s*[\+\&]?\s*prof)/i,
  orderType: /^(tipo\s*ped|tipo|order\s*type)/i,
};

// Extract raw value from ExcelJS cell (handles rich text, formulas, dates)
function cellValue(val: any): any {
  if (val == null) return '';
  if (typeof val === 'object' && val.richText) {
    return val.richText.map((r: any) => r.text || '').join('');
  }
  if (typeof val === 'object' && val.text != null) {
    return val.text;
  }
  if (typeof val === 'object' && val.result != null) {
    return val.result; // formula result
  }
  return val;
}

function parseExcelDate(value: any): string {
  const v = cellValue(value);
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    const date = new Date((v - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = String(v).trim();
  // Try M/D/YY or MM/DD/YY or DD/MM/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    let [a, b, c] = slashParts;
    let year = c.length === 2 ? `20${c}` : c;
    if (parseInt(a) > 12) {
      return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }
  return str;
}

function parsePrice(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  let str = String(value).replace(/[^\d.,\-]/g, '');
  if (!str) return 0;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    return parseFloat(str) || 0;
  }

  if (lastComma > lastDot) {
    // Comma is the last separator
    const afterComma = str.substring(lastComma + 1);
    if (afterComma.length === 3 && !str.includes('.')) {
      // "4,132" → 4132 (comma as thousands separator, no decimal)
      str = str.replace(/,/g, '');
    } else {
      // "1.234,56" → 1234.56 (Brazilian decimal format)
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (lastDot > lastComma) {
    // Dot is the last separator (US format): "1,234.56"
    str = str.replace(/,/g, '');
  }

  return parseFloat(str) || 0;
}

function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[()#$%]/g, '')
    .trim();
}

function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] && pattern.test(normalized[i])) {
        mapping[field] = i;
        break;
      }
    }
  }

  return mapping;
}

export function OrderImporter({ clients, onImport, onAddClient, onComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OrderFormData[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, number>>({});
  const [headerNames, setHeaderNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { nameToEmail } = useRepresentatives();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) { toast.error('Planilha vazia'); return; }

      // Read header row - try to extract from cells
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const raw = cell.value;
        headers[colNumber] = String(cellValue(raw) || '');
      });

      console.log('[OrderImporter] Headers detected:', headers.filter(Boolean));

      const mapping = detectColumnMapping(headers);
      console.log('[OrderImporter] Column mapping:', mapping);
      setDetectedColumns(mapping);
      setHeaderNames(headers);

      // Check required fields
      if (!mapping.clientName) {
        toast.error('Coluna de cliente não encontrada na planilha');
        return;
      }

      const rows: OrderFormData[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rawVals = row.values as any[];
        // Normalize all cell values (handle rich text, formulas, etc.)
        const vals = rawVals.map(cellValue);

        const clientName = String(vals[mapping.clientName] || '').trim();
        if (!clientName) return;

        // Detect fabric provided from fabric column value
        const rawFabric = mapping.fabric != null ? String(vals[mapping.fabric] || '').trim() : '';
        const isFabricProvided = /tecido\s*forn/i.test(rawFabric);
        const fabricValue = isFabricProvided ? '' : rawFabric;
        const fabricProvidedValue = mapping.fabricProvided != null
          ? String(cellValue(rawVals[mapping.fabricProvided]) || 'NAO').trim().toUpperCase()
          : (isFabricProvided ? 'SIM' : 'NAO');

        // Normalize supplier to uppercase
        const rawSupplier = mapping.supplier != null ? String(vals[mapping.supplier] || 'SOHOME').trim() : 'SOHOME';
        const supplier = rawSupplier.toUpperCase();

        // Normalize order type: map numeric values or fallback
        let rawOrderType = mapping.orderType != null ? String(vals[mapping.orderType] || 'ENCOMENDA').trim() : 'ENCOMENDA';
        if (/^\d+$/.test(rawOrderType)) rawOrderType = 'ENCOMENDA';

        rows.push({
          issueDate: mapping.issueDate != null ? parseExcelDate(rawVals[mapping.issueDate]) : new Date().toISOString().split('T')[0],
          clientName,
          supplier,
          representative: mapping.representative != null ? String(vals[mapping.representative] || '').trim() : '',
          orderNumber: mapping.orderNumber != null ? String(vals[mapping.orderNumber] || '').trim() : '',
          oc: mapping.oc != null ? String(vals[mapping.oc] || '').trim() : '',
          product: mapping.product != null ? String(vals[mapping.product] || '').trim() : '',
          fabricProvided: fabricProvidedValue,
          fabric: fabricValue,
          dimensions: mapping.dimensions != null ? String(vals[mapping.dimensions] || '').trim() : '',
          deliveryDate: mapping.deliveryDate != null ? parseExcelDate(rawVals[mapping.deliveryDate]) : '',
          quantity: mapping.quantity != null ? (parseInt(String(vals[mapping.quantity] || '1')) || 1) : 1,
          price: mapping.price != null ? parsePrice(rawVals[mapping.price]) : 0,
          orderType: rawOrderType.toUpperCase(),
          paymentTerms: mapping.paymentTerms != null ? String(vals[mapping.paymentTerms] || '').trim() : '',
        });
      });

      setPreview(rows);

      const mappedFields = Object.keys(mapping).length;
      const totalFields = Object.keys(COLUMN_PATTERNS).length;
      toast.success(`${rows.length} pedidos encontrados. ${mappedFields}/${totalFields} colunas mapeadas automaticamente.`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Erro ao ler a planilha');
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
          .map(o => o.clientName)
          .filter(name => !clientMap.has(name.toLowerCase()))
      )];

      for (const name of newClientNames) {
        // Find representative from first order of this client
        const firstOrder = preview.find(o => o.clientName === name);
        const repEmail = firstOrder?.representative
          ? nameToEmail[(firstOrder.representative).toUpperCase().trim()] || undefined
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
        if (newClient) {
          clientMap.set(name.toLowerCase(), newClient.id);
        }
      }

      const ordersWithClients = preview.map(order => ({
        order,
        clientId: clientMap.get(order.clientName.toLowerCase()) || null,
      }));

      const count = await onImport(ordersWithClients);
      toast.success(`${count} pedidos importados com sucesso!`);
      if (newClientNames.length > 0) {
        toast.info(`${newClientNames.length} novo(s) cliente(s) criado(s)`);
      }
      setPreview([]);
      setDetectedColumns({});
      setHeaderNames([]);
      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro na importação');
    } finally {
      setImporting(false);
    }
  };

  const mappedFields = Object.entries(detectedColumns);
  const fieldLabels: Record<string, string> = {
    issueDate: 'Data Emissão',
    clientName: 'Cliente',
    orderNumber: 'Nº Pedido',
    oc: 'OC',
    product: 'Produto',
    fabric: 'Tecido',
    supplier: 'Fornecedor',
    deliveryDate: 'Data Entrega',
    paymentTerms: 'Cond. Pagamento',
    representative: 'Representante',
    quantity: 'Quantidade',
    price: 'Valor',
    fabricProvided: 'Tecido Fornecido',
    dimensions: 'Dimensão',
    orderType: 'Tipo Pedido',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Pedidos do Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O sistema detecta automaticamente as colunas da planilha. Basta que os cabeçalhos contenham termos como "Cliente", "Pedido", "Produto", "Tecido", "Entrega", etc.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="hidden"
        />

        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4 mr-2" />
          Selecionar Arquivo
        </Button>

        {/* Column mapping feedback */}
        {mappedFields.length > 0 && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Colunas detectadas automaticamente:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mappedFields.map(([field, colIndex]) => (
                <span key={field} className="inline-flex items-center gap-1 text-xs bg-background border rounded-md px-2 py-1">
                  <span className="font-medium">{fieldLabels[field] || field}</span>
                  <span className="text-muted-foreground">← {normalizeHeader(headerNames[colIndex] || '')}</span>
                </span>
              ))}
            </div>
            {Object.keys(COLUMN_PATTERNS).filter(f => !(f in detectedColumns)).length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Não encontradas: {Object.keys(COLUMN_PATTERNS).filter(f => !(f in detectedColumns)).map(f => fieldLabels[f] || f).join(', ')}
              </p>
            )}
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{preview.length} pedidos prontos para importar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes: {[...new Set(preview.map(o => o.clientName))].length} |
                Clientes novos: {[...new Set(preview.map(o => o.clientName).filter(name => !clients.some(c => c.company.toLowerCase() === name.toLowerCase())))].length}
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
      </CardContent>
    </Card>
  );
}
