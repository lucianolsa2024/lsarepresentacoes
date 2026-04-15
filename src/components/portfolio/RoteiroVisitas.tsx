import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, CalendarIcon, MapPin, Clock, CheckCircle2, AlertTriangle,
  Plus, Phone, Building2, Loader2, Search
} from 'lucide-react';
import { format, isToday, isThisWeek, isFuture, isPast, startOfDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { useActivities } from '@/hooks/useActivities';
import { toast } from 'sonner';

/* ─── types ─── */
interface VisitChecklist {
  showroomRevisado: boolean;
  produtosSemGiro: boolean;
  acaoShowroom: string;
  linhasApresentadas: string;
  oportunidadesMix: string;
  projetosAndamento: string;
  previsaoCompra: number | null;
  resultado: 'pedido' | 'compromisso' | 'relacionamento' | 'sem_resultado' | '';
  valorPedido: number | null;
  observacoes: string;
  proximaVisita: string;
  tipoVisita: 'presencial' | 'virtual' | 'telefone';
  duracaoEstimada: string;
}

const EMPTY_CHECKLIST: VisitChecklist = {
  showroomRevisado: false,
  produtosSemGiro: false,
  acaoShowroom: '',
  linhasApresentadas: '',
  oportunidadesMix: '',
  projetosAndamento: '',
  previsaoCompra: null,
  resultado: '',
  valorPedido: null,
  observacoes: '',
  proximaVisita: '',
  tipoVisita: 'presencial',
  duracaoEstimada: '',
};

interface SaudeRow {
  client_name: string;
  segmento: string;
  status_compra: string;
  dias_sem_compra: number;
  ultima_compra: string | null;
}

/* ─── helpers ─── */
const fmtDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const segBadge = (seg: string) => {
  const colors: Record<string, string> = {
    A: 'bg-blue-100 text-blue-800 border-blue-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return <Badge variant="outline" className={`text-xs font-semibold ${colors[seg] || colors.C}`}>{seg}</Badge>;
};

const resultadoLabel: Record<string, string> = {
  pedido: 'Pedido gerado',
  compromisso: 'Compromisso firmado',
  relacionamento: 'Só relacionamento',
  sem_resultado: 'Sem resultado',
};

const resultadoToActivityResult = (r: string): 'positivo' | 'neutro' | 'negativo' => {
  if (r === 'pedido' || r === 'compromisso') return 'positivo';
  if (r === 'relacionamento') return 'neutro';
  return 'negativo';
};

/* ─── Component ─── */
interface RoteiroVisitasProps {
  onBack?: () => void;
  onViewClient?: (clientId: string) => void;
}

export function RoteiroVisitas({ onBack, onViewClient }: RoteiroVisitasProps) {
  const { clients } = useClients();
  const { activities, addActivity, updateActivity, refetch: refetchActivities } = useActivities();

  const [tab, setTab] = useState('hoje');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VisitChecklist>({ ...EMPTY_CHECKLIST });
  const [saving, setSaving] = useState(false);
  const [newVisitClientId, setNewVisitClientId] = useState<string>('');
  const [newVisitDate, setNewVisitDate] = useState<Date | undefined>(new Date());
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Priority panel data
  const [saudeData, setSaudeData] = useState<SaudeRow[]>([]);
  const [loadingSaude, setLoadingSaude] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('vw_saude_carteira' as any).select('*');
        setSaudeData((data as unknown as SaudeRow[] | null) || []);
      } catch { /* ignore */ }
      setLoadingSaude(false);
    })();
  }, []);

  // Get display name for a visit activity
  const getVisitDisplayName = (activity: any) => {
    return activity.client?.company || activity.title?.replace('Visita - ', '') || 'Sem cliente';
  };

  // Filter visit activities
  const visits = useMemo(() => {
    return activities
      .filter(a => a.type === 'visita' || a.type === 'checklist_loja')
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
  }, [activities]);

  const filterVisits = useCallback((period: string) => {
    return visits.filter(v => {
      const d = parseISO(v.due_date);
      switch (period) {
        case 'hoje': return isToday(d);
        case 'semana': return isThisWeek(d, { weekStartsOn: 1 }) && !isPast(startOfDay(d));
        case 'proximas': return isFuture(d) && !isThisWeek(d, { weekStartsOn: 1 });
        case 'historico': return isPast(startOfDay(d)) && !isToday(d);
        default: return true;
      }
    });
  }, [visits]);

  const visitsForTab = useMemo(() => filterVisits(tab), [filterVisits, tab]);

  // Priority suggestions
  const priorities = useMemo(() => {
    const lastVisitMap = new Map<string, string>();
    activities
      .filter(a => (a.type === 'visita' || a.type === 'checklist_loja') && (a.status === 'realizada' || a.status === 'concluida'))
      .forEach(a => {
        const name = a.client?.company || a.title?.replace('Visita - ', '');
        if (name) {
          const existing = lastVisitMap.get(name);
          if (!existing || a.due_date > existing) {
            lastVisitMap.set(name, a.due_date);
          }
        }
      });

    const now = Date.now();
    const DAY = 86400000;
    return saudeData
      .filter(c => {
        const lastVisit = lastVisitMap.get(c.client_name);
        const diasSemVisita = lastVisit ? Math.floor((now - new Date(lastVisit).getTime()) / DAY) : 999;

        if (c.segmento === 'A' && diasSemVisita > 30) return true;
        if (c.segmento === 'B' && diasSemVisita > 60) return true;
        if (c.status_compra === 'vermelho') return true;
        return false;
      })
      .sort((a, b) => {
        const segOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
        const diff = (segOrder[a.segmento] ?? 3) - (segOrder[b.segmento] ?? 3);
        if (diff !== 0) return diff;
        return (b.dias_sem_compra || 0) - (a.dias_sem_compra || 0);
      })
      .slice(0, 15);
  }, [saudeData, activities]);

  // Get client info for a visit
  const getClientForVisit = (activity: any) => {
    if (activity.client_id) {
      return clients.find(c => c.id === activity.client_id);
    }
    return null;
  };

  // Open checklist modal for a visit
  const handleOpenChecklist = (visitId: string) => {
    setSelectedVisitId(visitId);
    const visit = activities.find(a => a.id === visitId);
    if (visit?.completed_notes) {
      try {
        const parsed = JSON.parse(visit.completed_notes);
        setChecklist({ ...EMPTY_CHECKLIST, ...parsed });
      } catch {
        setChecklist({ ...EMPTY_CHECKLIST });
      }
    } else {
      setChecklist({ ...EMPTY_CHECKLIST });
    }
    setModalOpen(true);
  };

  // Save checklist
  const handleSaveChecklist = async () => {
    if (!selectedVisitId) return;
    if (!checklist.resultado) {
      toast.error('Selecione o resultado da visita');
      return;
    }
    setSaving(true);
    try {
      await updateActivity(selectedVisitId, {
        status: 'concluida',
        completed_notes: JSON.stringify(checklist),
        result: resultadoToActivityResult(checklist.resultado),
        next_contact_date: checklist.proximaVisita || undefined,
      });

      // Auto-create next visit if date set
      if (checklist.proximaVisita) {
        const visit = activities.find(a => a.id === selectedVisitId);
        if (visit) {
          const clientName = visit.client?.company || visit.title?.replace('Visita - ', '') || 'Cliente';
          await addActivity({
            type: 'visita',
            activity_category: 'crm',
            title: `Visita - ${clientName}`,
            due_date: checklist.proximaVisita,
            client_id: visit.client_id || undefined,
            priority: 'media',
            description: 'Visita agendada automaticamente a partir do roteiro.',
          });
        }
      }

      await refetchActivities();
      setModalOpen(false);
      toast.success('Visita registrada com sucesso!');
    } catch {
      toast.error('Erro ao salvar visita');
    }
    setSaving(false);
  };

  // Create new visit
  const handleCreateVisit = async () => {
    if (!newVisitClientId || !newVisitDate) {
      toast.error('Selecione o cliente e a data');
      return;
    }
    const client = clients.find(c => c.id === newVisitClientId);
    await addActivity({
      type: 'visita',
      activity_category: 'crm',
      title: `Visita - ${client?.tradeName || client?.company || 'Cliente'}`,
      due_date: format(newVisitDate, 'yyyy-MM-dd'),
      client_id: newVisitClientId,
      priority: 'media',
    });
    setNewVisitOpen(false);
    setNewVisitClientId('');
    setNewVisitDate(new Date());
    await refetchActivities();
    toast.success('Visita agendada!');
  };

  // Schedule visit from priority panel
  const handleScheduleFromPriority = (clientName: string) => {
    const client = clients.find(c =>
      (c.company || '').toLowerCase() === clientName.toLowerCase() ||
      (c.tradeName || '').toLowerCase() === clientName.toLowerCase()
    );
    if (client) {
      setNewVisitClientId(client.id);
      setNewVisitDate(addDays(new Date(), 1));
      setNewVisitOpen(true);
    } else {
      toast.error('Cliente não encontrado no cadastro');
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      (c.company || '').toLowerCase().includes(q) ||
      (c.tradeName || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [clients, clientSearch]);

  /* ─── Render ─── */
  const renderVisitCard = (visit: any) => {
    const client = getClientForVisit(visit);
    const isCompleted = visit.status === 'concluida' || visit.status === 'realizada';
    const visitDate = parseISO(visit.due_date);
    const isOverdue = isPast(startOfDay(visitDate)) && !isToday(visitDate) && !isCompleted;
    const displayName = getVisitDisplayName(visit);

    return (
      <Card key={visit.id} className={cn('transition-all hover:shadow-md', isOverdue && 'border-destructive/50')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{displayName}</span>
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
              </div>
              {client && (
                <>
                  {client.address?.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[client.address.street, client.address.number, client.address.neighborhood, client.address.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {fmtDate(visit.due_date)}
                {visit.due_time && (
                  <>
                    <Clock className="h-3 w-3 ml-1" />
                    {visit.due_time.slice(0, 5)}
                  </>
                )}
              </div>
              {isCompleted && visit.result && (
                <Badge variant="secondary" className="text-xs mt-1">{visit.result}</Badge>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {!isCompleted && (
                <Button size="sm" onClick={() => handleOpenChecklist(visit.id)}>
                  Realizar
                </Button>
              )}
              {isCompleted && (
                <Button size="sm" variant="outline" onClick={() => handleOpenChecklist(visit.id)}>
                  Ver
                </Button>
              )}
              {client && onViewClient && (
                <Button size="sm" variant="ghost" onClick={() => onViewClient(client.id)} className="text-xs">
                  Ficha
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <MapPin className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Roteiro de Visitas</h2>
        </div>
        <Button onClick={() => setNewVisitOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agendar Visita
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Main panel */}
        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-3">
              <TabsTrigger value="hoje">
                Hoje
                {filterVisits('hoje').length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{filterVisits('hoje').length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="semana">Esta semana</TabsTrigger>
              <TabsTrigger value="proximas">Próximas</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {['hoje', 'semana', 'proximas', 'historico'].map(period => (
              <TabsContent key={period} value={period} className="mt-0 space-y-3">
                {visitsForTab.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Nenhuma visita {period === 'historico' ? 'no histórico' : 'para este período'}</p>
                  </div>
                ) : (
                  visitsForTab.map(renderVisitCard)
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Priority panel */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Prioridade de Visita
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {loadingSaude ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : priorities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma urgência identificada 👍</p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {priorities.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border text-xs hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.client_name}</p>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {segBadge(p.segmento)}
                          <span>{p.status_compra === 'vermelho' ? '🔴' : p.status_compra === 'amarelo' ? '🟡' : '🟢'}</span>
                          <span>{p.dias_sem_compra}d sem compra</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 shrink-0"
                        onClick={() => handleScheduleFromPriority(p.client_name)}
                      >
                        Agendar
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New visit dialog */}
      <Dialog open={newVisitOpen} onOpenChange={setNewVisitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Visita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[160px] border rounded-md p-1">
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={cn(
                      'p-2 rounded cursor-pointer text-sm hover:bg-muted',
                      newVisitClientId === c.id && 'bg-primary/10 font-medium'
                    )}
                    onClick={() => setNewVisitClientId(c.id)}
                  >
                    {c.tradeName || c.company}
                    {c.address?.city && <span className="text-xs text-muted-foreground ml-2">{c.address.city}</span>}
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left', !newVisitDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newVisitDate ? format(newVisitDate, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newVisitDate}
                    onSelect={setNewVisitDate}
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleCreateVisit} className="w-full" disabled={!newVisitClientId}>
              Agendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visit checklist modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Checklist de Visita</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de visita</Label>
                  <Select value={checklist.tipoVisita} onValueChange={v => setChecklist(p => ({ ...p, tipoVisita: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração estimada</Label>
                  <Input
                    placeholder="ex: 1h30"
                    value={checklist.duracaoEstimada}
                    onChange={e => setChecklist(p => ({ ...p, duracaoEstimada: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Showroom */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Checklist de Showroom</h4>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={checklist.showroomRevisado}
                    onCheckedChange={v => setChecklist(p => ({ ...p, showroomRevisado: !!v }))}
                  />
                  <Label className="font-normal">Showroom revisado?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={checklist.produtosSemGiro}
                    onCheckedChange={v => setChecklist(p => ({ ...p, produtosSemGiro: !!v }))}
                  />
                  <Label className="font-normal">Produtos sem giro identificados?</Label>
                </div>
                <div>
                  <Label>Ação tomada no showroom</Label>
                  <Textarea
                    rows={2}
                    value={checklist.acaoShowroom}
                    onChange={e => setChecklist(p => ({ ...p, acaoShowroom: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Mix */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Mix e Oportunidades</h4>
                <div>
                  <Label>Linhas/produtos apresentados</Label>
                  <Textarea
                    rows={2}
                    value={checklist.linhasApresentadas}
                    onChange={e => setChecklist(p => ({ ...p, linhasApresentadas: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Oportunidades de mix identificadas</Label>
                  <Textarea
                    rows={2}
                    value={checklist.oportunidadesMix}
                    onChange={e => setChecklist(p => ({ ...p, oportunidadesMix: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Pipeline */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Pipeline do Cliente</h4>
                <div>
                  <Label>Projetos em andamento</Label>
                  <Textarea
                    rows={2}
                    value={checklist.projetosAndamento}
                    onChange={e => setChecklist(p => ({ ...p, projetosAndamento: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Previsão de compra (R$)</Label>
                  <Input
                    type="number"
                    value={checklist.previsaoCompra ?? ''}
                    onChange={e => setChecklist(p => ({ ...p, previsaoCompra: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Resultado */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Resultado da Visita</h4>
                <div>
                  <Label>Resultado *</Label>
                  <Select value={checklist.resultado} onValueChange={v => setChecklist(p => ({ ...p, resultado: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o resultado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pedido">Pedido gerado</SelectItem>
                      <SelectItem value="compromisso">Compromisso firmado</SelectItem>
                      <SelectItem value="relacionamento">Só relacionamento</SelectItem>
                      <SelectItem value="sem_resultado">Sem resultado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {checklist.resultado === 'pedido' && (
                  <div>
                    <Label>Valor do pedido (R$)</Label>
                    <Input
                      type="number"
                      value={checklist.valorPedido ?? ''}
                      onChange={e => setChecklist(p => ({ ...p, valorPedido: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                )}
                <div>
                  <Label>Observações gerais</Label>
                  <Textarea
                    rows={3}
                    value={checklist.observacoes}
                    onChange={e => setChecklist(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Próxima visita prevista</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left', !checklist.proximaVisita && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checklist.proximaVisita ? fmtDate(checklist.proximaVisita) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checklist.proximaVisita ? parseISO(checklist.proximaVisita) : undefined}
                        onSelect={d => setChecklist(p => ({ ...p, proximaVisita: d ? format(d, 'yyyy-MM-dd') : '' }))}
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="pt-3 border-t">
            <Button onClick={handleSaveChecklist} className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
