import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Check } from 'lucide-react';

interface LeadJson {
  id: string;
  rank: number;
  empreendimento: string;
  incorporadora: string;
  bairro: string;
  endereco: string;
  tipologia: string;
  area_min_m2: number;
  area_max_m2: number;
  preco_m2_min: number;
  preco_m2_max: number;
  ticket_medio_min: number;
  ticket_medio_max: number | null;
  unidades: number;
  status_obra: string;
  status_obra_label: string;
  data_lancamento: string | null;
  data_entrega: string | null;
  arquitetura: string | null;
  paisagismo: string | null;
  decoracao: string | null;
  vgv_estimado: number | null;
  score: number;
  prioridade: string;
  scores_detalhe: Record<string, number>;
  acao_recomendada: string;
  timing: string;
  tags: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  ownerEmail?: string;
}

export function LeadJsonImporter({ open, onOpenChange, onImported, ownerEmail }: Props) {
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<LeadJson[] | null>(null);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    try {
      const data = JSON.parse(jsonText);
      const leads: LeadJson[] = data.leads || data;
      if (!Array.isArray(leads) || leads.length === 0) {
        toast.error('JSON inválido: array "leads" não encontrado');
        return;
      }
      setParsed(leads);
      toast.success(`${leads.length} leads encontrados`);
    } catch {
      toast.error('JSON inválido');
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);

    try {
      const records = parsed.map(lead => {
        const notes = [
          `📊 Score: ${lead.score} | Prioridade: ${lead.prioridade} | Timing: ${lead.timing}`,
          `🏗️ Status: ${lead.status_obra_label}`,
          `📐 Tipologia: ${lead.tipologia} | Área: ${lead.area_min_m2}–${lead.area_max_m2}m²`,
          `💰 R$/m²: ${lead.preco_m2_min?.toLocaleString('pt-BR')}–${lead.preco_m2_max?.toLocaleString('pt-BR')}`,
          `🏢 Unidades: ${lead.unidades}`,
          lead.arquitetura ? `🎨 Arquitetura: ${lead.arquitetura}` : null,
          lead.paisagismo ? `🌿 Paisagismo: ${lead.paisagismo}` : null,
          lead.decoracao ? `🛋️ Decoração: ${lead.decoracao}` : null,
          lead.vgv_estimado ? `💎 VGV: R$ ${lead.vgv_estimado.toLocaleString('pt-BR')}` : null,
          `📍 ${lead.endereco}`,
          `🏷️ Tags: ${lead.tags.join(', ')}`,
          `\n💡 Ação: ${lead.acao_recomendada}`,
        ].filter(Boolean).join('\n');

        return {
          title: `${lead.empreendimento} — ${lead.incorporadora}`,
          description: lead.acao_recomendada,
          funnel_type: 'corporativo',
          stage: 'lead',
          value: lead.ticket_medio_min || 0,
          notes,
          contact_name: lead.incorporadora,
          owner_email: ownerEmail || null,
          expected_close_date: lead.data_entrega || null,
          stage_changed_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('sales_opportunities')
        .insert(records as any);

      if (error) throw error;

      toast.success(`${records.length} leads importados com sucesso!`);
      onImported();
      onOpenChange(false);
      setJsonText('');
      setParsed(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar leads');
    } finally {
      setImporting(false);
    }
  };

  const prioridadeColor = (p: string) => {
    if (p === 'quente') return 'destructive';
    if (p === 'morno') return 'default';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar Leads (JSON)
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cole o JSON com os leads. O formato esperado é <code>{`{ "leads": [...] }`}</code>.
            </p>
            <Textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              rows={12}
              placeholder='{"leads": [...]}'
              className="font-mono text-xs"
            />
            <Button onClick={handleParse} disabled={!jsonText.trim()}>
              Analisar JSON
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {parsed.length} leads prontos para importar na etapa <Badge variant="outline">Lead</Badge>
            </p>
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {parsed.map((lead, i) => (
                <div key={i} className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{lead.empreendimento}</p>
                    <Badge variant={prioridadeColor(lead.prioridade)} className="text-xs">
                      {lead.prioridade} · {lead.score}pts
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.incorporadora} · {lead.bairro}</p>
                  <p className="text-xs text-muted-foreground">{lead.tipologia} · {lead.unidades} un.</p>
                  <p className="text-xs font-medium text-primary">
                    Ticket: R$ {lead.ticket_medio_min?.toLocaleString('pt-BR')}
                    {lead.ticket_medio_max ? ` – R$ ${lead.ticket_medio_max.toLocaleString('pt-BR')}` : ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsed(null)}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                <Check className="h-4 w-4 mr-2" />
                {importing ? 'Importando...' : `Importar ${parsed.length} leads`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
