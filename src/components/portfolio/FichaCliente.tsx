import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, MapPin, ShoppingCart, Calendar, Package, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { useFichaCliente } from '@/hooks/useFichaCliente';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const segBadge = (seg: string) => {
  const colors: Record<string, string> = {
    A: 'bg-blue-100 text-blue-800 border-blue-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return <Badge variant="outline" className={`font-semibold ${colors[seg] || colors.C}`}>{seg}</Badge>;
};

interface FichaClienteProps {
  clientId: string;
  onBack: () => void;
}

export function FichaCliente({ clientId, onBack }: FichaClienteProps) {
  const data = useFichaCliente(clientId);
  const { user } = useAuth();

  const [visitOpen, setVisitOpen] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitSaving, setVisitSaving] = useState(false);

  const handleRegisterVisit = async () => {
    if (!data.cliente) return;
    setVisitSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('activities').insert({
        title: `Visita — ${data.cliente.trade_name || data.cliente.company}`,
        type: 'visita',
        due_date: today,
        status: 'realizada',
        completed_at: new Date().toISOString(),
        completed_notes: visitNotes || undefined,
        client_id: clientId,
        client_name: data.cliente.trade_name || data.cliente.company,
        assigned_to_email: user?.email || undefined,
        activity_category: 'crm',
      });
      if (error) throw error;
      toast.success('Visita registrada!');
      setVisitOpen(false);
      setVisitNotes('');
    } catch {
      toast.error('Erro ao registrar visita');
    } finally {
      setVisitSaving(false);
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.cliente) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Voltar</Button>
      </div>
    );
  }

  const mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = data.ordersByMonth.map((r) => {
    const [, m] = r.mes.split('-');
    return { label: mesNomes[parseInt(m, 10) - 1], total: r.total };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{data.cliente.trade_name || data.cliente.company}</h2>
              {segBadge(data.segmentoAbc)}
            </div>
            {data.cliente.trade_name && data.cliente.company !== data.cliente.trade_name && (
              <p className="text-sm text-muted-foreground">{data.cliente.company}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Representante: {data.representative}
              {data.cliente.city && ` · ${data.cliente.city}/${data.cliente.state}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setVisitOpen(true)}>
          <MapPin className="h-4 w-4 mr-2" /> Registrar Visita
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sell-in 12m</p>
            <p className="text-lg font-bold">{fmtBRL(data.sellIn12m)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sell-in MTD</p>
            <p className="text-lg font-bold">{fmtBRL(data.sellInMtd)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Wallet Share</p>
            <p className="text-lg font-bold">{data.walletSharePct > 0 ? `${data.walletSharePct.toFixed(1)}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Índice Mix</p>
            <p className="text-lg font-bold">{data.indiceMixPct.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Dias s/ compra</p>
            <p className={`text-lg font-bold ${data.diasUltimaCompra > 60 ? 'text-destructive' : data.diasUltimaCompra > 30 ? 'text-yellow-600' : ''}`}>
              {data.diasUltimaCompra}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Dias s/ visita</p>
            <p className={`text-lg font-bold ${(data.diasUltimaVisita ?? 999) > 60 ? 'text-destructive' : ''}`}>
              {data.diasUltimaVisita !== null ? data.diasUltimaVisita : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sell-in Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Histórico de Compras (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [fmtBRL(value), 'Sell-in']} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados de compras</p>
          )}
        </CardContent>
      </Card>

      {/* Orders Detail Table */}
      {data.ordersDetail.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Detalhamento de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium">Data</th>
                    <th className="text-left py-2 px-3 font-medium">Produto</th>
                    <th className="text-left py-2 px-3 font-medium">Fornecedor</th>
                    <th className="text-center py-2 px-3 font-medium">Qtd</th>
                    <th className="text-right py-2 px-3 font-medium">Valor</th>
                    <th className="text-center py-2 px-3 font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordersDetail.slice(0, 50).map((o, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-4">{fmtDate(o.issue_date)}</td>
                      <td className="py-2 px-3 truncate max-w-[200px]">{o.product || '—'}</td>
                      <td className="py-2 px-3">{o.supplier || '—'}</td>
                      <td className="py-2 px-3 text-center">{o.quantity ?? '—'}</td>
                      <td className="py-2 px-3 text-right">{fmtBRL(o.price ?? 0)}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="secondary" className="text-xs">{o.order_type || '—'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sell-out */}
      {data.sellOutRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Sell-out Registrado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium">Data</th>
                    <th className="text-left py-2 px-3 font-medium">Produto</th>
                    <th className="text-center py-2 px-3 font-medium">Qtd</th>
                    <th className="text-right py-2 px-3 font-medium">Valor</th>
                    <th className="text-center py-2 px-3 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellOutRows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-4">{fmtDate(r.data_venda)}</td>
                      <td className="py-2 px-3">{r.produto_nome || '—'}</td>
                      <td className="py-2 px-3 text-center">{r.quantidade}</td>
                      <td className="py-2 px-3 text-right">{fmtBRL(r.valor_venda ?? 0)}</td>
                      <td className="py-2 px-3 text-center">{r.origem || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Showroom Atual */}
      {data.showroomAtual.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Showroom Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium">Produto</th>
                    <th className="text-left py-2 px-3 font-medium">Linha</th>
                    <th className="text-center py-2 px-3 font-medium">Entrada</th>
                    <th className="text-center py-2 px-3 font-medium">Dias</th>
                    <th className="text-center py-2 px-3 font-medium">Condição</th>
                  </tr>
                </thead>
                <tbody>
                  {data.showroomAtual.map((r, i) => {
                    const diasExp = Math.floor((Date.now() - new Date(r.data_entrada).getTime()) / (1000 * 60 * 60 * 24));
                    const isOld = diasExp > 90;
                    return (
                      <tr key={i} className={`border-b last:border-0 ${isOld ? 'bg-red-50' : ''}`}>
                        <td className="py-2 px-4">{r.produto_nome || '—'}</td>
                        <td className="py-2 px-3">{r.produto_linha || '—'}</td>
                        <td className="py-2 px-3 text-center">{fmtDate(r.data_entrada)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={isOld ? 'text-destructive font-semibold' : ''}>{diasExp}d</span>
                          {isOld && <AlertTriangle className="inline h-3.5 w-3.5 text-destructive ml-1" />}
                        </td>
                        <td className="py-2 px-3 text-center">{r.condicao || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oportunidades de Mix */}
      {data.produtosNuncaComprados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Oportunidades de Mix</CardTitle>
            <p className="text-xs text-muted-foreground">Produtos do portfólio que este cliente nunca comprou</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
              {data.produtosNuncaComprados.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria} · {p.linha}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Visitas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Histórico de Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.visitas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma visita registrada</p>
          ) : (
            <div className="space-y-4">
              {data.visitas.map((v, i) => (
                <div key={i} className="relative pl-6 pb-4 border-l-2 border-muted last:border-0">
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{fmtDate(v.data_visita)}</p>
                    {v.resultado && (
                      <Badge variant="secondary" className="text-xs mt-1">{v.resultado}</Badge>
                    )}
                    {v.observacoes && (
                      <p className="text-sm text-muted-foreground mt-1">{v.observacoes}</p>
                    )}
                    {v.valor_pedido && v.valor_pedido > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Pedido: {fmtBRL(v.valor_pedido)}</p>
                    )}
                    {v.proxima_visita_prevista && (
                      <p className="text-xs mt-1">Próxima visita: {fmtDate(v.proxima_visita_prevista)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Modal */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Visita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">{data.cliente.trade_name || data.cliente.company}</p>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Descreva a visita..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVisitOpen(false)}>Cancelar</Button>
              <Button onClick={handleRegisterVisit} disabled={visitSaving}>
                {visitSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
