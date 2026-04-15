import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Eye, MapPin, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useMapaCarteira, CarteiraClient } from '@/hooks/useMapaCarteira';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  return <Badge variant="outline" className={`text-xs font-semibold ${colors[seg] || colors.C}`}>{seg}</Badge>;
};

const statusDot = (status: string) => {
  if (status === 'verde') return '🟢';
  if (status === 'amarelo') return '🟡';
  return '🔴';
};

interface MapaCarteiraProps {
  onViewClient?: (clientId: string) => void;
  onBack?: () => void;
  initialFilters?: {
    statusCompra?: string;
    segmento?: string;
  };
}

export function MapaCarteira({ onViewClient, onBack, initialFilters }: MapaCarteiraProps) {
  const { clients, clientesRisco, representatives, loading, refetch } = useMapaCarteira();
  const { user } = useAuth();

  const [segmento, setSegmento] = useState(initialFilters?.segmento || 'todos');
  const [statusSellout, setStatusSellout] = useState(initialFilters?.statusCompra || 'todos');
  const [rep, setRep] = useState('todos');
  const [search, setSearch] = useState('');

  // Visit modal
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitClient, setVisitClient] = useState<CarteiraClient | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitSaving, setVisitSaving] = useState(false);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (segmento !== 'todos' && c.segmento !== segmento) return false;
      if (statusSellout !== 'todos' && c.status_sellout !== statusSellout) return false;
      if (rep !== 'todos' && c.representative !== rep) return false;
      if (search && !c.client_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, segmento, statusSellout, rep, search]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const verdes = filtered.filter((c) => c.status_sellout === 'verde').length;
    const sellout90dTotal = filtered.reduce((acc, c) => acc + c.sellout_90d, 0);
    return {
      total,
      verdePct: total > 0 ? (verdes / total) * 100 : 0,
      sellout90dTotal,
    };
  }, [filtered]);

  const handleRegisterVisit = async () => {
    if (!visitClient) return;
    setVisitSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('activities').insert({
        title: `Visita — ${visitClient.client_name}`,
        type: 'visita',
        due_date: today,
        status: 'realizada',
        completed_at: new Date().toISOString(),
        completed_notes: visitNotes || undefined,
        client_id: visitClient.client_id || undefined,
        client_name: visitClient.client_name,
        assigned_to_email: user?.email || undefined,
        activity_category: 'crm',
      });
      if (error) throw error;
      toast.success('Visita registrada com sucesso!');
      setVisitModalOpen(false);
      setVisitNotes('');
      setVisitClient(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar visita');
    } finally {
      setVisitSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-bold">Mapa de Carteira</h2>
          <p className="text-sm text-muted-foreground">{clients.length} clientes na base</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select value={segmento} onValueChange={setSegmento}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Segmentos</SelectItem>
                <SelectItem value="A">Curva A</SelectItem>
                <SelectItem value="B">Curva B</SelectItem>
                <SelectItem value="C">Curva C</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusSellout} onValueChange={setStatusSellout}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="verde">🟢 Verde</SelectItem>
                <SelectItem value="amarelo">🟡 Amarelo</SelectItem>
                <SelectItem value="vermelho">🔴 Vermelho</SelectItem>
              </SelectContent>
            </Select>

            <Select value={rep} onValueChange={setRep}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Representante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Representantes</SelectItem>
                {representatives.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content: Table + Alerts panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Table */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Cliente</th>
                    <th className="text-center py-3 px-2 font-medium">Seg.</th>
                    <th className="text-left py-3 px-3 font-medium">Representante</th>
                    <th className="text-center py-3 px-3 font-medium">Último Sell-out</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                    <th className="text-right py-3 px-3 font-medium">Sell-out 90d</th>
                    <th className="text-right py-3 px-3 font-medium">Giro</th>
                    <th className="text-center py-3 px-2 font-medium">Mix</th>
                    <th className="text-right py-3 px-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado com os filtros aplicados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium truncate max-w-[180px]">{c.client_name}</p>
                        </td>
                        <td className="text-center py-3 px-2">{segBadge(c.segmento)}</td>
                        <td className="py-3 px-3 text-muted-foreground truncate max-w-[120px]">{c.representative}</td>
                        <td className="text-center py-3 px-3">
                          <div>
                            <p className="text-sm">{fmtDate(c.ultimo_sellout)}</p>
                            <p className="text-xs text-muted-foreground">{c.dias_sem_sellout}d atrás</p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-lg">{statusDot(c.status_sellout)}</td>
                        <td className="text-right py-3 px-3 font-medium">{fmtBRL(c.sellout_90d)}</td>
                        <td className="text-right py-3 px-3">{c.taxa_giro.toFixed(1)}%</td>
                        <td className="text-center py-3 px-2">{c.mix_produtos}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {c.client_id && onViewClient && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onViewClient(c.client_id!)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Ficha
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setVisitClient(c);
                                setVisitModalOpen(true);
                              }}
                            >
                              <MapPin className="h-3.5 w-3.5 mr-1" /> Visita
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Alerts panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Clientes em Risco
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 max-h-[600px] overflow-y-auto">
            {clientesRisco.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta no momento</p>
            ) : (
              clientesRisco.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-sm space-y-1 ${
                    r.nivel_risco === 'critico'
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-yellow-300/40 bg-yellow-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate max-w-[140px]">{r.client_name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        r.nivel_risco === 'critico'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {r.nivel_risco === 'critico' ? 'Crítico' : 'Alerta'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.representative}</p>
                  <div className="flex justify-between text-xs">
                    <span>{r.dias_sem_sellout}d sem sell-out</span>
                    <span className="font-medium">{fmtBRL(r.sellout_historico)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Summary */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-1">
        <span><strong className="text-foreground">{summary.total}</strong> clientes exibidos</span>
        <span>•</span>
        <span><strong className="text-foreground">{summary.verdePct.toFixed(1)}%</strong> com status verde</span>
        <span>•</span>
        <span>Sell-out 90d: <strong className="text-foreground">{fmtBRL(summary.sellout90dTotal)}</strong></span>
      </div>

      {/* Visit Modal */}
      <Dialog open={visitModalOpen} onOpenChange={setVisitModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Visita</DialogTitle>
          </DialogHeader>
          {visitClient && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{visitClient.client_name}</p>
                <p className="text-sm text-muted-foreground">{visitClient.representative}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Descreva a visita realizada..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setVisitModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegisterVisit} disabled={visitSaving}>
                  {visitSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Visita
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
