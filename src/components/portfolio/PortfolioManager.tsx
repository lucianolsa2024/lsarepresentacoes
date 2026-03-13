import { useState, useMemo } from 'react';
import { useClients, Client } from '@/hooks/useClients';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { usePortfolio, PortfolioClient, PortfolioStatus } from '@/hooks/usePortfolio';
import { useActivities } from '@/hooks/useActivities';
import { StoreDetailSheet } from './StoreDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Users, AlertTriangle, Clock, Calendar, Star, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const PORTFOLIO_COLUMNS: { key: PortfolioStatus; label: string; color: string; borderColor: string }[] = [
  { key: 'prospeccao', label: 'Prospecção', color: 'bg-blue-50', borderColor: 'border-blue-300' },
  { key: 'onboarding', label: 'Onboarding', color: 'bg-purple-50', borderColor: 'border-purple-300' },
  { key: 'em_dia', label: 'Em Dia', color: 'bg-green-50', borderColor: 'border-green-300' },
  { key: 'atencao', label: 'Atenção', color: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  { key: 'atrasado', label: 'Atrasado', color: 'bg-red-50', borderColor: 'border-red-300' },
  { key: 'inativo', label: 'Inativo', color: 'bg-gray-50', borderColor: 'border-gray-300' },
];

const CURVE_BADGE: Record<string, { label: string; className: string }> = {
  A: { label: 'A', className: 'bg-green-100 text-green-800 border-green-300' },
  B: { label: 'B', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  C: { label: 'C', className: 'bg-gray-100 text-gray-800 border-gray-300' },
};

function getDaysColor(days: number | null, curve: string | null): string {
  if (days === null) return 'text-muted-foreground';
  const maxDays = curve === 'A' ? 20 : curve === 'B' ? 35 : 50;
  if (days > maxDays) return 'text-red-600';
  if (days >= maxDays - 5) return 'text-yellow-600';
  return 'text-green-600';
}

export function PortfolioManager() {
  const { clients } = useClients();
  const { representatives, emailToName } = useRepresentatives();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const {
    loading, buildPortfolioClients, addTraining, addNpsResponse,
    updatePortfolioStatus, getClientTrainings, getClientNps, refetch,
  } = usePortfolio();
  const { addActivity } = useActivities();

  const [repFilter, setRepFilter] = useState<string>('all');
  const [curveFilter, setCurveFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<PortfolioClient | null>(null);

  const portfolioClients = useMemo(() => buildPortfolioClients(clients), [buildPortfolioClients, clients]);

  const filtered = useMemo(() => {
    let result = portfolioClients;
    if (repFilter !== 'all') {
      result = result.filter(pc =>
        pc.client.representativeEmails?.includes(repFilter) || pc.client.ownerEmail === repFilter
      );
    }
    if (curveFilter !== 'all') {
      result = result.filter(pc => pc.curve === curveFilter);
    }
    if (cityFilter !== 'all') {
      result = result.filter(pc => pc.client.address.city === cityFilter);
    }
    // Non-admin: filter by own email
    if (!isAdmin && user?.email) {
      result = result.filter(pc =>
        pc.client.representativeEmails?.includes(user.email!) || pc.client.ownerEmail === user.email
      );
    }
    return result;
  }, [portfolioClients, repFilter, curveFilter, cityFilter, isAdmin, user]);

  const columnGroups = useMemo(() => {
    const groups: Record<PortfolioStatus, PortfolioClient[]> = {
      prospeccao: [], onboarding: [], em_dia: [], atencao: [], atrasado: [], inativo: [],
    };
    filtered.forEach(pc => {
      if (groups[pc.computedStatus]) groups[pc.computedStatus].push(pc);
    });
    return groups;
  }, [filtered]);

  // Stats
  const activeCount = filtered.filter(pc => !['prospeccao', 'inativo'].includes(pc.computedStatus)).length;
  const emDiaCount = columnGroups.em_dia.length;
  const atencaoCount = columnGroups.atencao.length;
  const atrasadoCount = columnGroups.atrasado.length;
  const allNps = filtered.filter(pc => pc.npsAverage !== null);
  const avgNps = allNps.length > 0 ? allNps.reduce((s, pc) => s + (pc.npsAverage || 0), 0) / allNps.length : null;

  // Cities for filter
  const cities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => { if (c.address.city) set.add(c.address.city); });
    return Array.from(set).sort();
  }, [clients]);

  const handleRegisterVisit = async (clientId: string, data: { date: string; description: string; result: string; nextStep: string }) => {
    try {
      await addActivity({
        activity_category: 'crm',
        type: 'visita',
        title: `Visita — ${clients.find(c => c.id === clientId)?.company || ''}`,
        description: data.description,
        due_date: data.date,
        client_id: clientId,
        status: 'realizada',
        result: data.result as any,
        next_step: data.nextStep || undefined,
        assigned_to_email: user?.email || undefined,
      });
      await refetch();
      toast.success('Visita registrada');
      return true;
    } catch {
      toast.error('Erro ao registrar visita');
      return false;
    }
  };

  const selectedInfluencers = selectedClient
    ? clients.find(c => c.id === selectedClient.client.id)?.influencers || []
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Store className="h-6 w-6" /> Gestão de Carteira
        </h2>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {isAdmin && (
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Representante" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {representatives.filter(r => r.active).map(r => <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={curveFilter} onValueChange={setCurveFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Curva" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="A">Curva A</SelectItem>
            <SelectItem value="B">Curva B</SelectItem>
            <SelectItem value="C">Curva C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Lojistas Ativos</p>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-xs text-green-700">Em Dia</p>
          <p className="text-2xl font-bold text-green-800">{emDiaCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-xs text-yellow-700">Atenção</p>
          <p className="text-2xl font-bold text-yellow-800">{atencaoCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-red-700">Atrasados</p>
          <p className="text-2xl font-bold text-red-800">{atrasadoCount}</p>
        </div>
      </div>
      {avgNps !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 text-primary" />
          Média NPS da carteira: <strong className="text-foreground">{avgNps.toFixed(1)}</strong>
        </div>
      )}

      {/* Kanban */}
      <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${PORTFOLIO_COLUMNS.length}, minmax(180px, 1fr))` }}>
        {PORTFOLIO_COLUMNS.map(col => {
          const items = columnGroups[col.key] || [];
          return (
            <div key={col.key} className="min-w-[180px]">
              <div className={`rounded-t-lg p-2 border ${col.borderColor} ${col.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="text-xs h-5">{items.length}</Badge>
                </div>
              </div>
              <div className={`border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] bg-muted/30`}>
                {items.map(pc => (
                  <div
                    key={pc.client.id}
                    onClick={() => setSelectedClient(pc)}
                    className="bg-card border rounded-lg p-3 space-y-1.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold text-foreground truncate flex-1">{pc.client.company}</p>
                      {pc.curve && (
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ml-1 ${CURVE_BADGE[pc.curve]?.className}`}>
                          {pc.curve}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {pc.client.representativeEmails?.map(e => emailToName[e] || e).join(', ') || pc.client.ownerEmail || '—'}
                    </p>
                    {pc.daysSinceLastVisit !== null && (
                      <p className={`text-[10px] font-medium flex items-center gap-0.5 ${getDaysColor(pc.daysSinceLastVisit, pc.curve)}`}>
                        <Clock className="h-3 w-3" /> {pc.daysSinceLastVisit}d desde última visita
                      </p>
                    )}
                    {pc.nextVisitDue && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" /> Venc: {new Date(pc.nextVisitDue + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {pc.lastTrainingDate && (
                      <p className="text-[10px] text-muted-foreground">
                        Trein: {new Date(pc.lastTrainingDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {pc.npsAverage !== null && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Star className="h-3 w-3" /> NPS: {pc.npsAverage.toFixed(1)}
                      </p>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum lojista</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Store Detail Sheet */}
      <StoreDetailSheet
        portfolioClient={selectedClient}
        open={!!selectedClient}
        onOpenChange={open => { if (!open) setSelectedClient(null); }}
        trainings={selectedClient ? getClientTrainings(selectedClient.client.id) : []}
        npsResponses={selectedClient ? getClientNps(selectedClient.client.id) : []}
        onAddTraining={addTraining}
        onAddNps={addNpsResponse}
        onRegisterVisit={handleRegisterVisit}
        influencers={selectedInfluencers}
      />
    </div>
  );
}
