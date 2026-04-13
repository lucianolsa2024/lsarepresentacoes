import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileSpreadsheet, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { QuoteItem } from '@/types/quote';
import { Client } from '@/hooks/useClients';
import { ClientSelector } from './ClientSelector';
import * as XLSX from 'xlsx';

interface QuoteExcelImporterProps {
  clients: Client[];
  onImportQuote: (data: {
    projectName: string;
    clientId: string | null;
    clientCompany: string;
    items: QuoteItem[];
    subtotal: number;
    representativeName: string;
  }) => Promise<boolean>;
  onAddClient: (data: any) => Promise<Client | null>;
}

interface ParsedItem {
  item: string;
  qty: number;
  product: string;
  description: string;
  environment: string;
  dimensions: string;
  supplier: string;
  category: string;
  unitPrice: number;
  totalPrice: number;
}

function parseQuoteExcel(data: ArrayBuffer): { projectName: string; items: ParsedItem[] } {
  const wb = XLSX.read(data, { type: 'array', raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  let projectName = '';
  let headerRowIdx = -1;

  // Find project name and header row
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row) continue;
    const first = String(row[0] || '').trim();

    // Project name is usually a prominent text line before headers
    if (first && !projectName && first.length > 5 && !first.startsWith('DATA') && !first.startsWith('ITEM')) {
      projectName = first;
    }

    // Detect header row
    if (first === 'ITEM' || first.toUpperCase() === 'ITEM') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Cabeçalho não encontrado. Esperado coluna "ITEM".');
  }

  const headers = (rows[headerRowIdx] || []).map((h: any) => String(h || '').trim().toUpperCase());
  
  // Map columns
  const colMap: Record<string, number> = {};
  const mapping: Record<string, string[]> = {
    item: ['ITEM'],
    qty: ['QNT', 'QTD', 'QUANTIDADE', 'QTDE'],
    product: ['PRODUTO', 'PRODUTO / MODELO'],
    description: ['DESCRIÇÃO', 'DESCRICAO', 'DESC'],
    environment: ['AMBIENTE'],
    dimensions: ['DIMENSÃO', 'DIMENSAO', 'DIM'],
    supplier: ['FORNECEDOR'],
    category: ['CATEGORIA'],
    unitPrice: ['VALOR UNITÁRIO', 'VALOR UNITARIO', 'VL UNITÁRIO', 'VL UNIT', 'PREÇO UNIT', 'PRECO UNIT'],
    totalPrice: ['VALOR TOTAL', 'VL TOTAL', 'TOTAL'],
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx >= 0) {
        colMap[key] = idx;
        break;
      }
    }
  }

  if (colMap.product === undefined && colMap.description === undefined) {
    throw new Error('Colunas obrigatórias não encontradas (PRODUTO ou DESCRIÇÃO).');
  }

  const items: ParsedItem[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const itemVal = String(row[colMap.item ?? 0] || '').trim();
    const product = String(row[colMap.product ?? -1] || '').trim();
    const unitPrice = Number(row[colMap.unitPrice ?? -1]) || 0;

    // Skip empty rows or summary rows
    if (!product && !unitPrice) continue;
    if (itemVal.toUpperCase().includes('TOTAL') || itemVal.toUpperCase().includes('SUBTOTAL')) continue;

    const qty = Number(row[colMap.qty ?? -1]) || 1;

    items.push({
      item: itemVal,
      qty,
      product,
      description: String(row[colMap.description ?? -1] || '').trim(),
      environment: String(row[colMap.environment ?? -1] || '').trim(),
      dimensions: String(row[colMap.dimensions ?? -1] || '').trim(),
      supplier: String(row[colMap.supplier ?? -1] || '').trim(),
      category: String(row[colMap.category ?? -1] || '').trim(),
      unitPrice,
      totalPrice: Number(row[colMap.totalPrice ?? -1]) || unitPrice * qty,
    });
  }

  return { projectName, items };
}

export function QuoteExcelImporter({ clients, onImportQuote, onAddClient }: QuoteExcelImporterProps) {
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [projectName, setProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientCompany, setClientCompany] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseQuoteExcel(buffer);
      setParsedItems(result.items);
      setProjectName(result.projectName);

      if (!clientCompany && result.projectName) {
        setClientCompany(result.projectName);
      }

      toast.success(`${result.items.length} itens encontrados no arquivo`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ler arquivo');
      setParsedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) {
      toast.error('Nenhum item para importar');
      return;
    }
    if (!clientCompany.trim()) {
      toast.error('Informe o nome do cliente/projeto');
      return;
    }

    setImporting(true);
    try {
      const quoteItems: QuoteItem[] = parsedItems.map((p) => ({
        id: crypto.randomUUID(),
        productId: '',
        productName: p.product || 'Produto',
        factory: p.supplier || '',
        modulation: p.dimensions || '',
        modulationId: '',
        sizeId: '',
        sizeDescription: p.dimensions || '',
        base: '',
        fabricTier: 'SEM TEC' as const,
        fabricDescription: '',
        price: p.unitPrice,
        quantity: p.qty,
        observations: [p.description, p.environment ? `Ambiente: ${p.environment}` : ''].filter(Boolean).join(' | '),
        imageUrl: null,
      }));

      const subtotal = quoteItems.reduce((s, i) => s + i.price * i.quantity, 0);

      const success = await onImportQuote({
        projectName: projectName || clientCompany,
        clientId: selectedClientId,
        clientCompany: clientCompany.trim(),
        items: quoteItems,
        subtotal,
        representativeName,
      });

      if (success) {
        setParsedItems([]);
        setProjectName('');
        setClientCompany('');
        setSelectedClientId(null);
        setRepresentativeName('');
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setImporting(false);
    }
  };

  const subtotal = parsedItems.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Orçamento via Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Arquivo Excel (.xls, .xlsx)</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              disabled={loading}
            />
            {fileName && <p className="text-xs text-muted-foreground mt-1">📎 {fileName}</p>}
          </div>

          {parsedItems.length > 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Projeto</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Nome do projeto"
                  />
                </div>
                <div>
                  <Label>Cliente / Empresa *</Label>
                  <ClientSelector
                    clients={clients}
                    selectedId={selectedClientId}
                    onSelect={(c) => {
                      setSelectedClientId(c?.id || null);
                      if (c) setClientCompany(c.company);
                    }}
                    onAddClient={onAddClient}
                  />
                  {!selectedClientId && (
                    <Input
                      className="mt-2"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      placeholder="Ou digite o nome do cliente"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label>Representante</Label>
                <Input
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  placeholder="Nome do representante"
                />
              </div>

              {/* Preview */}
              <div className="border rounded-lg overflow-x-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-left">Qtd</th>
                      <th className="p-2 text-left">Produto</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left">Ambiente</th>
                      <th className="p-2 text-left">Dimensão</th>
                      <th className="p-2 text-left">Fornecedor</th>
                      <th className="p-2 text-right">Vl. Unit.</th>
                      <th className="p-2 text-right">Vl. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{p.item}</td>
                        <td className="p-2">{p.qty}</td>
                        <td className="p-2 font-medium">{p.product}</td>
                        <td className="p-2 max-w-[200px] truncate">{p.description}</td>
                        <td className="p-2">{p.environment}</td>
                        <td className="p-2">{p.dimensions}</td>
                        <td className="p-2">{p.supplier}</td>
                        <td className="p-2 text-right">{p.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-2 text-right font-medium">{p.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td className="p-2" colSpan={7}>Total ({parsedItems.length} itens)</td>
                      <td className="p-2 text-right" colSpan={2}>
                        {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || !clientCompany.trim()}
                className="w-full"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar como Orçamento ({parsedItems.length} itens)
              </Button>
            </>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lendo arquivo...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
