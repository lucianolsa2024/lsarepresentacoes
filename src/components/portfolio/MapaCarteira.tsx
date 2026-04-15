import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Eye, MapPin, ArrowLeft } from 'lucide-react';
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
  const { clients, representatives, loading, refetch } = useMapaCarteira();
  const { user } = useAuth();

  // Filters
  const [segmento, setSegmento] = useState(initialFilters?.segmento || 'todos');
  const [statusCompra, setStatusCompra] = useState(initialFilters?.statusCompra || 'todos');
  const [statusVisita, setStatusVisita] = useState('todos');
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
      if (statusCompra !== 'todos' && c.status_compra !== statusCompra) return false;
      if (statusVisita !== 'todos') {
        if (statusVisita === 'ok' && c.status_visita !== 'ok') return false;
        if (statusVisita === 'atrasada' && c.status_visita !== 'atrasada') return false;
      }
      if (rep !== 'todos' && c.representative !== rep) return false;
      if (search && !c.client_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, segmento, statusCompra, statusVisita, rep, search]);

  // Footer summary
  const summary = useMemo(() => {
    const total = filtered.length;
    const positivados = filtered.filter((c) => c.compra_30d > 0).length;
    const visitaOk = filtered.filter((c) => c.status_visita === 'ok').length;
    return {
      total,
      positivadosPct: total > 0 ? (positivados / total) * 100 : 0,
      visitaOkPct: total > 0 ? (visitaOk / total) * 100 : 0,
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

            <Select value={statusCompra} onValueChange={setStatusCompra}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Status Compra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="verde">🟢 Verde</SelectItem>
                <SelectItem value="amarelo">🟡 Amarelo</SelectItem>
                <SelectItem value="vermelho">🔴 Vermelho</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusVisita} onValueChange={setStatusVisita}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Status Visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Visitas</SelectItem>
                <SelectItem value="ok">Ok</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-center py-3 px-2 font-medium">Seg.</th>
                  <th className="text-center py-3 px-3 font-medium">Última Compra</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                  <th className="text-center py-3 px-3 font-medium">Última Visita</th>
                  <th className="text-center py-3 px-2 font-medium">Visita</th>
                  <th className="text-center py-3 px-3 font-medium">Mix</th>
                  <th className="text-right py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado com os filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{c.client_name}</p>
                          <p className="text-xs text-muted-foreground">{c.representative}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">{segBadge(c.segmento)}</td>
                      <td className="text-center py-3 px-3">
                        <div>
                          <p className="text-sm">{fmtDate(c.ultima_compra)}</p>
                          <p className="text-xs text-muted-foreground">{c.dias_sem_compra}d atrás</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-lg">{statusDot(c.status_compra)}</td>
                      <td className="text-center py-3 px-3">
                        {c.ultima_visita ? (
                          <div>
                            <p className="text-sm">{fmtDate(c.ultima_visita)}</p>
                            <p className="text-xs text-muted-foreground">{c.dias_sem_visita}d atrás</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {c.status_visita === 'ok' ? (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Ok</Badge>
                        ) : c.status_visita === 'atrasada' ? (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Atrasada</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <Progress value={Math.min(c.indice_mix_pct, 100)} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{c.indice_mix_pct.toFixed(0)}%</span>
                        </div>
                      </td>
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

      {/* Footer Summary */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-1">
        <span><strong className="text-foreground">{summary.total}</strong> clientes filtrados</span>
        <span>•</span>
        <span><strong className="text-foreground">{summary.positivadosPct.toFixed(1)}%</strong> positivados (30d)</span>
        <span>•</span>
        <span><strong className="text-foreground">{summary.visitaOkPct.toFixed(1)}%</strong> com visita ok</span>
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
