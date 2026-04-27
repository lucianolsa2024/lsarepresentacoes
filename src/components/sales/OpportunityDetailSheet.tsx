import { useEffect, useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { SalesOpportunity, FUNNEL_STAGES_CORPORATIVO } from '@/hooks/useSalesOpportunities';
import { Client } from '@/hooks/useClients';
import { useActivities } from '@/hooks/useActivities';
import { ActivityForm } from '@/components/activities/ActivityForm';
import { CreateActivityInput } from '@/types/activity';
import { Building2, DollarSign, User, Calendar, Clock, FileText, ClipboardList, History, CheckCircle, AlertTriangle, ExternalLink, Download, Loader2, Plus, BarChart3, Linkedin } from 'lucide-react';
import { LinkedInCadenceTab } from './LinkedInCadenceTab';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { Quote, QuoteItem, ClientData, PaymentConditions } from '@/types/quote';
import { toast } from 'sonner';
import { format as fmtDate, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const SCORING_CRITERIA = [
  { id: 'padrao', label: 'Padrão', max: 25, color: 'bg-violet-500' },
  { id: 'unidades', label: 'Unidades', max: 15, color: 'bg-blue-500' },
  { id: 'ticket', label: 'Ticket', max: 20, color: 'bg-emerald-500' },
  { id: 'status', label: 'Status Obra', max: 20, color: 'bg-amber-500' },
  { id: 'arquitetura', label: 'Arquitetura', max: 10, color: 'bg-pink-500' },
  { id: 'incorporadora', label: 'Incorporadora', max: 10, color: 'bg-cyan-500' },
] as const;

function parseScoreFromNotes(notes: string): { total: number; detalhe: Record<string, number>; prioridade: string } | null {
  const scoreMatch = notes.match(/Score:\s*(\d+)/);
  const prioridadeMatch = notes.match(/Prioridade:\s*(\w+)/);
  if (!scoreMatch) return null;

  const total = parseInt(scoreMatch[1]);
  const prioridade = prioridadeMatch?.[1] || '';
  let detalhe: Record<string, number> = {};

  const jsonMatch = notes.match(/<!--SCORES:(.*?)-->/);
  if (jsonMatch) {
    try { detalhe = JSON.parse(jsonMatch[1]); } catch {}
  }

  return { total, detalhe, prioridade };
}

interface Props {
  opportunity: SalesOpportunity | null;
  clients: Client[];
  representatives: { email: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivityRow {
  id: string;
  title: string;
  type: string;
  status: string | null;
  due_date: string;
  due_time: string | null;
  completed_at: string | null;
  completed_notes: string | null;
  description: string | null;
  priority: string | null;
}

interface HistoricoRow {
  id: string;
  fase_anterior: string | null;
  fase_nova: string;
  created_at: string;
}

interface QuoteRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
  version: number;
  client_data: any;
  items: any;
  payment: any;
  subtotal: number;
  discount: number;
  parent_quote_id: string | null;
}

const stageLabel = (key: string) =>
  FUNNEL_STAGES_CORPORATIVO.find(s => s.key === key)?.label || key;

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  agendada: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
  realizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

export function OpportunityDetailSheet({ opportunity, clients, representatives, open, onOpenChange }: Props) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const { addActivity } = useActivities();

  const opp = opportunity;
  const client = opp?.clientId ? clients.find(c => c.id === opp.clientId) : null;
  const rep = opp?.ownerEmail ? representatives.find(r => r.email === opp.ownerEmail) : null;

  useEffect(() => {
    if (!opp || !open) return;
    setLoading(true);

    const fetchAll = async () => {
      // Fetch activities linked to this opportunity
      const { data: acts } = await supabase
        .from('activities')
        .select('id, title, type, status, due_date, due_time, completed_at, completed_notes, description, priority')
        .eq('sales_opportunity_id', opp.id)
        .order('due_date', { ascending: false });

      setActivities((acts as ActivityRow[]) || []);

      // Fetch historico_fases
      const { data: hist } = await supabase
        .from('historico_fases')
        .select('id, fase_anterior, fase_nova, created_at')
        .eq('sales_opportunity_id', opp.id)
        .order('created_at', { ascending: false });

      setHistorico((hist as HistoricoRow[]) || []);

      // Fetch quotes linked to the same client
      if (opp.clientId) {
        const { data: q } = await supabase
          .from('quotes')
          .select('id, total, status, created_at, version, client_data, items, payment, subtotal, discount, parent_quote_id')
          .eq('client_id', opp.clientId)
          .order('created_at', { ascending: false })
          .limit(20);

        setQuotes((q as QuoteRow[]) || []);
      } else {
        setQuotes([]);
      }

      setLoading(false);
    };

    fetchAll();
  }, [opp?.id, open]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => {
    try { return fmtDate(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
    catch { return d; }
  };
  const formatDateTime = (d: string) => {
    try { return fmtDate(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
    catch { return d; }
  };

  if (!opp) return null;

  const handleDownloadPdf = async (q: QuoteRow) => {
    setGeneratingPdf(q.id);
    try {
      const quote: Quote = {
        id: q.id,
        createdAt: q.created_at,
        client: q.client_data as ClientData,
        items: q.items as QuoteItem[],
        payment: q.payment as PaymentConditions,
        subtotal: q.subtotal,
        discount: q.discount,
        total: q.total,
        status: q.status as any,
        version: q.version,
        parentQuoteId: q.parent_quote_id,
      };
      await generateQuotePDF(quote);
      toast.success('PDF gerado com sucesso');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const pendingActs = activities.filter(a => a.status === 'pendente' || a.status === 'agendada' || a.status === 'em_andamento');
  const doneActs = activities.filter(a => a.status === 'concluida' || a.status === 'realizada');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-base">Detalhes da Oportunidade</SheetTitle>
        </SheetHeader>

        {/* Header info */}
        <div className="p-4 space-y-2 border-b bg-muted/30">
          {client && (
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {client.tradeName || client.company}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{opp.title}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {opp.value > 0 && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" /> {formatCurrency(opp.value)}
              </Badge>
            )}
            <Badge variant="secondary">{stageLabel(opp.stage)}</Badge>
            {rep && (
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" /> {rep.name}
              </Badge>
            )}
            {opp.nextFollowupDate && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" /> Follow-up: {formatDate(opp.nextFollowupDate)}
              </Badge>
            )}
          </div>
          {opp.notes && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
              {opp.notes.replace(/\n<!--SCORES:.*?-->/, '')}
            </p>
          )}
        </div>

        {/* Score breakdown panel */}
        {opp.notes && (() => {
          const scoreData = parseScoreFromNotes(opp.notes);
          if (!scoreData || Object.keys(scoreData.detalhe).length === 0) return null;
          const prioColor = scoreData.prioridade === 'quente' ? 'text-red-600' : scoreData.prioridade === 'morno' ? 'text-amber-600' : 'text-blue-600';
          return (
            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" /> Score do Lead
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs font-bold ${prioColor}`}>
                    {scoreData.prioridade}
                  </Badge>
                  <span className="text-sm font-bold">{scoreData.total}/100</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {SCORING_CRITERIA.map(c => {
                  const val = scoreData.detalhe[c.id] || 0;
                  const pct = Math.round((val / c.max) * 100);
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{c.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-medium w-10 text-right">{val}/{c.max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs defaultValue="activities" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="activities" className="gap-1 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> Atividades ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-1 text-xs">
              <FileText className="h-3.5 w-3.5" /> Orçamentos ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="cadencia" className="gap-1 text-xs">
              <Linkedin className="h-3.5 w-3.5" /> Cadência LinkedIn
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="h-3.5 w-3.5" /> Histórico ({historico.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {/* Activities tab */}
            <TabsContent value="activities" className="p-4 space-y-4 mt-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setActivityFormOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Nova Atividade
              </Button>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade vinculada</p>
              ) : (
                <>
                  {pendingActs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendentes / Agendadas</h4>
                      {pendingActs.map(a => (
                        <ActivityItem key={a.id} activity={a} formatDate={formatDate} />
                      ))}
                    </div>
                  )}
                  {doneActs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</h4>
                      {doneActs.map(a => (
                        <ActivityItem key={a.id} activity={a} formatDate={formatDate} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Quotes tab */}
            <TabsContent value="quotes" className="p-4 space-y-2 mt-0">
              {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum orçamento encontrado para este cliente</p>
              ) : (
                quotes.map(q => (
                  <div key={q.id} className="border rounded-lg p-3 space-y-1 bg-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleDownloadPdf(q)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Orçamento v{q.version}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={q.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                          {q.status === 'orcamento' ? 'Orçamento' : q.status === 'pedido' ? 'Pedido' : q.status === 'cancelado' ? 'Cancelado' : q.status}
                        </Badge>
                        {generatingPdf === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {(q as any).payment?.projectName && (
                      <p className="text-xs text-muted-foreground">🏗️ {(q as any).payment.projectName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(q.total)}</p>
                  </div>
                ))
              )}
            </TabsContent>

            {/* History tab */}
            {/* Cadência LinkedIn tab */}
            <TabsContent value="cadencia" className="p-4 mt-0">
              <LinkedInCadenceTab opportunityId={opp.id} />
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history" className="p-4 space-y-2 mt-0">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-2 border-l-2 border-muted pl-4">
                  {historico.map(h => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                      <div className="bg-card border rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
                        <p className="text-sm">
                          {h.fase_anterior ? (
                            <><span className="text-muted-foreground">{stageLabel(h.fase_anterior)}</span> → <strong>{stageLabel(h.fase_nova)}</strong></>
                          ) : (
                            <>Iniciou em <strong>{stageLabel(h.fase_nova)}</strong></>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Activity creation form */}
        <ActivityForm
          open={activityFormOpen}
          onOpenChange={setActivityFormOpen}
          onSubmit={async (data: CreateActivityInput) => {
            // Inject the sales_opportunity_id
            const insertData: Record<string, any> = {
              ...data,
              activity_category: 'crm',
              client_id: opp.clientId || data.client_id || null,
              sales_opportunity_id: opp.id,
            };
            if ((insertData as any).status === undefined) insertData.status = 'pendente';
            
            const { error } = await supabase
              .from('activities')
              .insert(insertData as any);

            if (error) {
              toast.error('Erro ao criar atividade');
              console.error(error);
              return false;
            }
            toast.success('Atividade criada!');
            // Refresh activities list
            const { data: acts } = await supabase
              .from('activities')
              .select('id, title, type, status, due_date, due_time, completed_at, completed_notes, description, priority')
              .eq('sales_opportunity_id', opp.id)
              .order('due_date', { ascending: false });
            setActivities((acts as ActivityRow[]) || []);
            return true;
          }}
          defaultClientId={opp.clientId || undefined}
          defaultCategory="crm"
        />
      </SheetContent>
    </Sheet>
  );
}

function ActivityItem({ activity, formatDate }: { activity: ActivityRow; formatDate: (d: string) => string }) {
  const isDone = activity.status === 'concluida' || activity.status === 'realizada';

  return (
    <div className="border rounded-lg p-3 bg-card space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isDone ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{activity.title}</span>
        </div>
        <Badge className={`text-[10px] h-4 shrink-0 ${statusColors[activity.status || 'pendente'] || 'bg-muted'}`}>
          {activity.status || 'pendente'}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatDate(activity.due_date)}</span>
        {activity.due_time && <span>• {activity.due_time.slice(0, 5)}</span>}
        {activity.priority && (
          <Badge variant="outline" className="text-[10px] h-4">{activity.priority}</Badge>
        )}
      </div>
      {activity.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
      )}
      {activity.completed_notes && (
        <p className="text-xs text-muted-foreground italic">Nota: {activity.completed_notes}</p>
      )}
    </div>
  );
}
