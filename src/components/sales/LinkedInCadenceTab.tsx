import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { UserPlus, MessageSquare, Mic, Eye, Copy, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CadenceItem {
  id: string;
  opportunity_id: string;
  tipo: string;
  acao_titulo: string;
  acao_script: string | null;
  data_prevista: string;
  data_realizada: string | null;
  status: string;
  notas_execucao: string | null;
  urgencia: 'hoje' | 'atrasada' | 'futura' | 'feita' | string;
}

interface Props {
  opportunityId: string;
}

const tipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'linkedin_conexao': return UserPlus;
    case 'linkedin_msg1':
    case 'linkedin_msg2':
    case 'linkedin_msg3': return MessageSquare;
    case 'linkedin_audio': return Mic;
    case 'linkedin_visita': return Eye;
    default: return MessageSquare;
  }
};

const urgenciaConfig: Record<string, { label: string; className: string; border: string }> = {
  hoje: { label: 'Hoje', className: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-4 border-l-blue-500' },
  atrasada: { label: 'Atrasada', className: 'bg-red-100 text-red-800 border-red-300', border: 'border-l-4 border-l-red-500' },
  futura: { label: 'Futura', className: 'bg-muted text-muted-foreground border-border', border: '' },
  feita: { label: 'Feita', className: 'bg-green-100 text-green-800 border-green-300', border: '' },
};

export function LinkedInCadenceTab({ opportunityId }: Props) {
  const [items, setItems] = useState<CadenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scriptModal, setScriptModal] = useState<CadenceItem | null>(null);
  const [doneModal, setDoneModal] = useState<CadenceItem | null>(null);
  const [doneNotes, setDoneNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vw_cadencia_linkedin' as any)
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('data_prevista', { ascending: true });

    if (error) {
      console.error(error);
      toast.error('Erro ao carregar cadência');
    } else {
      setItems((data as unknown as CadenceItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (opportunityId) fetchItems();
  }, [opportunityId]);

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "dd 'de' MMM, yyyy", { locale: ptBR }); }
    catch { return d; }
  };

  const formatDateTime = (d: string) => {
    try { return format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
    catch { return d; }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Texto copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleMarkDone = async () => {
    if (!doneModal) return;
    setSaving(true);
    const { error } = await supabase
      .from('opportunity_activities' as any)
      .update({
        status: 'feita',
        data_realizada: new Date().toISOString(),
        notas_execucao: doneNotes || null,
      })
      .eq('id', doneModal.id);

    if (error) {
      console.error(error);
      toast.error('Erro ao marcar como feita');
    } else {
      toast.success('Atividade marcada como feita!');
      setDoneModal(null);
      setDoneNotes('');
      await fetchItems();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma cadência iniciada para esta oportunidade.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map(item => {
          const Icon = tipoIcon(item.tipo);
          const urg = urgenciaConfig[item.urgencia] || urgenciaConfig.futura;
          const isDone = item.status === 'feita';
          return (
            <div
              key={item.id}
              className={cn(
                'border rounded-lg p-3 bg-card space-y-2 transition-opacity',
                urg.border,
                isDone && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.acao_titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(item.data_prevista)}
                      {isDone && item.data_realizada && (
                        <> • Feita em {formatDateTime(item.data_realizada)}</>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', urg.className)}>
                  {urg.label}
                </Badge>
              </div>

              {isDone && item.notas_execucao && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                  {item.notas_execucao}
                </p>
              )}

              {!isDone && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.acao_script && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setScriptModal(item)}
                    >
                      <FileText className="h-3 w-3" /> Ver script
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setDoneModal(item); setDoneNotes(''); }}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Marcar como feita
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Script */}
      <Dialog open={!!scriptModal} onOpenChange={(o) => !o && setScriptModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{scriptModal?.acao_titulo}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <p className="text-sm whitespace-pre-line text-foreground/90 pr-2">
              {scriptModal?.acao_script}
            </p>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => scriptModal?.acao_script && handleCopy(scriptModal.acao_script)}
            >
              <Copy className="h-3.5 w-3.5" /> Copiar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Marcar como feita */}
      <Dialog open={!!doneModal} onOpenChange={(o) => { if (!o) { setDoneModal(null); setDoneNotes(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Marcar como feita</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {doneModal?.acao_script && (
              <div className="border rounded-md p-3 bg-muted/30 max-h-[30vh] overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{doneModal.acao_titulo}</p>
                <p className="text-xs whitespace-pre-line text-foreground/80">{doneModal.acao_script}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Como foi? (opcional)</label>
              <Textarea
                value={doneNotes}
                onChange={(e) => setDoneNotes(e.target.value)}
                placeholder="Ex: Lead respondeu positivamente, pediu para retornar na próxima semana..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDoneModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleMarkDone} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
