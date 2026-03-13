import { useState, useRef, useMemo } from 'react';
import { OrderFormData } from '@/types/order';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { Client } from '@/hooks/useClients';
import { ClientData } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { importarPedidosExcel, PedidoLinha } from '@/lib/importarPedidos';

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

function pedidoToOrder(l: PedidoLinha): OrderFormData {
  const isFabricProvided = /tecido\s*forn/i.test(l.tecido || '');
  return {
    issueDate: l.dt_emissao || new Date().toISOString().split('T')[0],
    clientName: l.cliente,
    supplier: (l.fornecedor || 'SOHOME').toUpperCase(),
    representative: l.representante,
    orderNumber: String(l.numero_pedido),
    oc: l.oc || '',
    product: l.produto_completo,
    fabricProvided: isFabricProvided ? 'SIM' : 'NAO',
    fabric: isFabricProvided ? '' : (l.tecido || ''),
    dimensions: l.comp_prof || '',
    deliveryDate: l.data_entrega || '',
    quantity: l.qtde || 1,
    price: l.valor,
    orderType: l.tipo_pedido || 'ENCOMENDA',
    paymentTerms: l.cond_pgto || '',
  };
}

export function OrderImporter({ clients, existingOrderKeys, onImport, onAddClient, onComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ order: OrderFormData; nfNumber: string | null; isFaturado: boolean }[]>([]);
  const [stats, setStats] = useState<{ total: number; faturados: number; duplicatas: number; erros: string[] } | null>(null);
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
      const result = await importarPedidosExcel(file);

      if (result.erros.length > 0) {
        console.warn('[OrderImporter] Erros no parsing:', result.erros);
      }

      // Deduplicate against existing orders
      const dedupKeys = existingOrderKeys || new Set<string>();
      const unique: typeof preview = [];
      let dupCount = 0;

      for (const l of result.linhas) {
        const key = `${l.cliente.toLowerCase().trim()}::${String(l.numero_pedido).trim()}::${l.produto_completo.toLowerCase().trim()}`;
        // Also check simpler key for backward compat
        const simpleKey = `${l.cliente.toLowerCase().trim()}::${String(l.numero_pedido).trim()}`;
        if (dedupKeys.has(key) || dedupKeys.has(simpleKey)) {
          dupCount++;
          continue;
        }
        dedupKeys.add(key);

        const isFaturado = l.numero_nf !== null && l.dt_fat !== null;
        unique.push({
          order: pedidoToOrder(l),
          nfNumber: l.numero_nf !== null ? String(l.numero_nf) : null,
          isFaturado,
        });
      }

      setPreview(unique);
      setStats({
        total: result.totalLinhas,
        faturados: unique.filter(u => u.isFaturado).length,
        duplicatas: dupCount,
        erros: result.erros,
      });

      toast.success(`${unique.length} pedidos prontos para importar${dupCount > 0 ? ` (${dupCount} duplicatas ignoradas)` : ''}`);
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
          .map(o => o.order.clientName)
          .filter(name => !clientMap.has(name.toLowerCase()))
      )];

      for (const name of newClientNames) {
        const firstOrder = preview.find(o => o.order.clientName === name);
        const repEmail = firstOrder?.order.representative
          ? normalizedNameToEmail[(firstOrder.order.representative)
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase()
              .trim()] || undefined
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

      const ordersWithClients: OrderWithMeta[] = preview.map(p => ({
        order: p.order,
        clientId: clientMap.get(p.order.clientName.toLowerCase()) || null,
        nfNumber: p.nfNumber,
        status: p.isFaturado ? 'faturado' : 'pendente',
      }));

      const count = await onImport(ordersWithClients);
      toast.success(`${count} pedidos importados com sucesso!`);
      if (newClientNames.length > 0) {
        toast.info(`${newClientNames.length} novo(s) cliente(s) criado(s)`);
      }
      const faturados = preview.filter(p => p.isFaturado).length;
      if (faturados > 0) {
        toast.info(`${faturados} pedido(s) marcados como faturado com NF`);
      }
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
          <FileSpreadsheet className="h-5 w-5" />
          Importar Pedidos do Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa planilhas do FoccoERP. Pedidos com NF e data de faturamento serão marcados como faturados automaticamente. Duplicatas são ignoradas.
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

        {/* Stats */}
        {stats && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Resultado do parsing:
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span>Total: <strong>{stats.total}</strong></span>
              <span>Faturados: <strong>{stats.faturados}</strong></span>
              {stats.duplicatas > 0 && <span className="text-orange-600">Duplicatas ignoradas: <strong>{stats.duplicatas}</strong></span>}
            </div>
            {stats.erros.length > 0 && (
              <div className="text-xs text-destructive mt-1">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {stats.erros.length} erro(s) no parsing
              </div>
            )}
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{preview.length} pedidos prontos para importar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes: {[...new Set(preview.map(o => o.order.clientName))].length} |
                Novos: {[...new Set(preview.map(o => o.order.clientName).filter(name => !clients.some(c => c.company.toLowerCase() === name.toLowerCase())))].length} |
                Faturados: {preview.filter(p => p.isFaturado).length}
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
                    <th className="p-2 text-left">NF</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{p.order.issueDate}</td>
                      <td className="p-2">{p.order.clientName}</td>
                      <td className="p-2">{p.order.orderNumber}</td>
                      <td className="p-2 max-w-[200px] truncate">{p.order.product}</td>
                      <td className="p-2">{p.nfNumber || '-'}</td>
                      <td className="p-2">
                        {p.isFaturado ? (
                          <span className="text-primary font-medium">Faturado</span>
                        ) : (
                          <span className="text-muted-foreground">Pendente</span>
                        )}
                      </td>
                      <td className="p-2 text-right">{p.order.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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
