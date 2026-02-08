import { useState, useRef } from 'react';
import { OrderFormData } from '@/types/order';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

interface Props {
  clients: Client[];
  onImport: (orders: { order: OrderFormData; clientId?: string | null }[]) => Promise<number>;
  onAddClient: (client: ClientData) => Promise<Client | null>;
  onComplete: () => void;
}

function parseExcelDate(value: any): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  // Try parsing DD/MM/YYYY
  const str = String(value);
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

function parsePrice(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(str) || 0;
}

export function OrderImporter({ clients, onImport, onAddClient, onComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OrderFormData[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) { toast.error('Planilha vazia'); return; }

      const rows: OrderFormData[] = [];
      const headerRow = sheet.getRow(1);
      const headers = headerRow.values as any[];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        const vals = row.values as any[];
        const clientName = String(vals[2] || '').trim();
        if (!clientName) return;

        rows.push({
          issueDate: parseExcelDate(vals[1]),
          clientName,
          supplier: String(vals[3] || 'CENTURY').trim(),
          representative: String(vals[4] || '').trim(),
          orderNumber: String(vals[5] || '').trim(),
          oc: String(vals[6] || '').trim(),
          product: String(vals[7] || '').trim(),
          fabricProvided: String(vals[8] || 'NAO').trim().toUpperCase(),
          fabric: String(vals[9] || '').trim(),
          dimensions: String(vals[10] || '').trim(),
          deliveryDate: parseExcelDate(vals[11]),
          quantity: parseInt(String(vals[12] || '1')) || 1,
          price: parsePrice(vals[13]),
          orderType: String(vals[15] || 'ENCOMENDA').trim(),
          paymentTerms: String(vals[16] || '').trim(),
        });
      });

      setPreview(rows);
      toast.success(`${rows.length} pedidos encontrados na planilha`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Erro ao ler a planilha');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    try {
      // Build client map
      const clientMap = new Map<string, string>();
      clients.forEach(c => clientMap.set(c.company.toLowerCase(), c.id));

      // Find unique new clients
      const newClientNames = [...new Set(
        preview
          .map(o => o.clientName)
          .filter(name => !clientMap.has(name.toLowerCase()))
      )];

      // Create missing clients
      for (const name of newClientNames) {
        const newClient = await onAddClient({
          name: '',
          company: name,
          document: '',
          phone: '',
          email: '',
          isNewClient: true,
          address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
        });
        if (newClient) {
          clientMap.set(name.toLowerCase(), newClient.id);
        }
      }

      // Map orders to client IDs
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
          <FileSpreadsheet className="h-5 w-5" />
          Importar Pedidos do Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecione um arquivo Excel com a mesma estrutura da planilha de pedidos (colunas: data de emissão, cliente, fornecedor, representante, pedido, oc, produto, tecido fornecido, tecido, dimensão, data de entrega, quantidade, preço, tipo de pedido, prazo de pagamento).
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
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Tecido</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((o, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{o.issueDate}</td>
                      <td className="p-2">{o.clientName}</td>
                      <td className="p-2">{o.product}</td>
                      <td className="p-2">{o.fabric}</td>
                      <td className="p-2 text-right">{o.quantity}</td>
                      <td className="p-2 text-right">{o.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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
