import { useState } from 'react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { Client } from '@/hooks/useClients';
import { PortfolioClient, StoreTraining, NpsResponse } from '@/hooks/usePortfolio';
import { useRepresentatives } from '@/hooks/useRepresentatives';
import { useActivities } from '@/hooks/useActivities';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MapPin, Phone, Mail, Building2, Calendar, Star, TrendingUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ClientInfluencer } from '@/types/quote';

const CURVE_BADGE: Record<string, { label: string; className: string }> = {
  A: { label: 'Curva A', className: 'bg-green-100 text-green-800 border-green-300' },
  B: { label: 'Curva B', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  C: { label: 'Curva C', className: 'bg-gray-100 text-gray-800 border-gray-300' },
};

interface Props {
  portfolioClient: PortfolioClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainings: StoreTraining[];
  npsResponses: NpsResponse[];
  onAddTraining: (data: any) => Promise<{ success: boolean; npsToken?: string }>;
  onAddNps: (data: any) => Promise<boolean>;
  onRegisterVisit: (clientId: string, data: { date: string; description: string; result: string; nextStep: string }) => Promise<boolean>;
  influencers: ClientInfluencer[];
}

export function StoreDetailSheet({
  portfolioClient, open, onOpenChange, trainings, npsResponses,
  onAddTraining, onAddNps, onRegisterVisit, influencers,
}: Props) {
  const { representatives } = useRepresentatives();
  const { activities } = useActivities();
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showNpsForm, setShowNpsForm] = useState(false);
  const [visitForm, setVisitForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', result: 'positivo', nextStep: '' });
  const [trainingForm, setTrainingForm] = useState({ trainingDate: new Date().toISOString().split('T')[0], trainerEmail: '', collection: '', observations: '', participants: [] as string[] });
  const [npsForm, setNpsForm] = useState({ consultantName: '', scores: [0, 0, 0, 0, 0], comment: '', responseDate: new Date().toISOString().split('T')[0] });

  if (!portfolioClient) return null;
  const { client, curve, npsAverage } = portfolioClient;
  const activeReps = representatives.filter(r => r.active);

  const visitActivities = (activities || [])
    .filter(a => a.client_id === client.id && a.type === 'visita' && ['realizada', 'concluida'].includes(a.status))
    .sort((a, b) => b.due_date.localeCompare(a.due_date));

  const handleVisitSubmit = async () => {
    const ok = await onRegisterVisit(client.id, visitForm);
    if (ok) {
      setShowVisitForm(false);
      setVisitForm({ date: new Date().toISOString().split('T')[0], description: '', result: 'positivo', nextStep: '' });
    }
  };

  const handleTrainingSubmit = async () => {
    if (!trainingForm.trainerEmail) { toast.error('Selecione o representante'); return; }
    const ok = await onAddTraining({
      clientId: client.id,
      ...trainingForm,
    });
    if (ok) {
      setShowTrainingForm(false);
      setTrainingForm({ trainingDate: new Date().toISOString().split('T')[0], trainerEmail: '', collection: '', observations: '', participants: [] });
    }
  };

  const handleNpsSubmit = async () => {
    if (!npsForm.consultantName) { toast.error('Informe o consultor'); return; }
    const ok = await onAddNps({
      clientId: client.id,
      consultantName: npsForm.consultantName,
      scores: npsForm.scores,
      comment: npsForm.comment,
      responseDate: npsForm.responseDate,
    });
    if (ok) {
      setShowNpsForm(false);
      setNpsForm({ consultantName: '', scores: [0, 0, 0, 0, 0], comment: '', responseDate: new Date().toISOString().split('T')[0] });
    }
  };

  const emailToName = Object.fromEntries(representatives.map(r => [r.email, r.name]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {client.company}
            {curve && (
              <Badge variant="outline" className={CURVE_BADGE[curve]?.className}>
                {CURVE_BADGE[curve]?.label}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="visitas">Visitas</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
            <TabsTrigger value="nps">NPS</TabsTrigger>
          </TabsList>

          {/* ABA 1 - Dados Cadastrais */}
          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">CNPJ/CPF:</span>
                <p className="font-medium">{client.document || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Segmento:</span>
                <p className="font-medium">{client.segment || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Endereço:</span>
                <p className="font-medium">
                  {[client.address.street, client.address.number, client.address.complement, client.address.neighborhood].filter(Boolean).join(', ')}
                  {client.address.city && ` — ${client.address.city}/${client.address.state}`}
                  {client.address.zipCode && ` (${client.address.zipCode})`}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone:</span>
                <p className="font-medium">{client.phone || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email:</span>
                <p className="font-medium">{client.email || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável:</span>
                <p className="font-medium">
                  {client.representativeEmails?.map(e => emailToName[e] || e).join(', ') || client.ownerEmail || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Curva:</span>
                <p className="font-medium">{curve || 'Sem classificação'}</p>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2 - Histórico de Visitas */}
          <TabsContent value="visitas" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Histórico de Visitas</h3>
              <Button size="sm" onClick={() => setShowVisitForm(true)}><Plus className="h-4 w-4 mr-1" /> Registrar Visita</Button>
            </div>
            {visitActivities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma visita registrada</p>}
            <div className="space-y-2">
              {visitActivities.map(v => (
                <div key={v.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(v.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {v.result && (
                      <Badge variant="outline" className={
                        v.result === 'positivo' ? 'bg-green-50 text-green-700' :
                        v.result === 'negativo' ? 'bg-red-50 text-red-700' :
                        'bg-yellow-50 text-yellow-700'
                      }>
                        {v.result === 'positivo' ? 'Positivo' : v.result === 'negativo' ? 'Negativo' : 'Neutro'}
                      </Badge>
                    )}
                  </div>
                  {v.assigned_to_email && <p className="text-xs text-muted-foreground">{emailToName[v.assigned_to_email] || v.assigned_to_email}</p>}
                  {v.description && <p className="text-xs">{v.description}</p>}
                  {v.next_step && <p className="text-xs text-primary">Próximo passo: {v.next_step}</p>}
                </div>
              ))}
            </div>

            {/* Visit form dialog */}
            <Dialog open={showVisitForm} onOpenChange={setShowVisitForm}>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Visita</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Data</Label><Input type="date" value={visitForm.date} onChange={e => setVisitForm({ ...visitForm, date: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Descrição</Label><Textarea value={visitForm.description} onChange={e => setVisitForm({ ...visitForm, description: e.target.value })} rows={3} /></div>
                  <div className="space-y-1"><Label>Resultado</Label>
                    <Select value={visitForm.result} onValueChange={v => setVisitForm({ ...visitForm, result: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positivo">Positivo</SelectItem>
                        <SelectItem value="neutro">Neutro</SelectItem>
                        <SelectItem value="negativo">Negativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Próximo passo</Label><Input value={visitForm.nextStep} onChange={e => setVisitForm({ ...visitForm, nextStep: e.target.value })} /></div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowVisitForm(false)}>Cancelar</Button>
                    <Button onClick={handleVisitSubmit}>Registrar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ABA 3 - Treinamentos */}
          <TabsContent value="treinamentos" className="space-y-4 mt-4">
            {/* Consultores da loja */}
            {influencers.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Consultores da Loja</h4>
                <div className="flex flex-wrap gap-2">
                  {influencers.map(inf => (
                    <Badge key={inf.id} variant="secondary" className="text-xs">
                      {inf.name}{inf.role && ` (${inf.role})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Histórico de Treinamentos</h3>
              <Button size="sm" onClick={() => setShowTrainingForm(true)}><Plus className="h-4 w-4 mr-1" /> Registrar Treinamento</Button>
            </div>

            {trainings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum treinamento registrado</p>}
            <div className="space-y-2">
              {trainings.map(t => (
                <div key={t.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(t.trainingDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs text-muted-foreground">{emailToName[t.trainerEmail] || t.trainerEmail}</span>
                  </div>
                  {t.collection && <p className="text-xs"><strong>Coleção:</strong> {t.collection}</p>}
                  {t.participants.length > 0 && <p className="text-xs"><strong>Participantes:</strong> {t.participants.join(', ')}</p>}
                  {t.observations && <p className="text-xs text-muted-foreground">{t.observations}</p>}
                </div>
              ))}
            </div>

            {/* Training form dialog */}
            <Dialog open={showTrainingForm} onOpenChange={setShowTrainingForm}>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Treinamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Data</Label><Input type="date" value={trainingForm.trainingDate} onChange={e => setTrainingForm({ ...trainingForm, trainingDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Representante</Label>
                    <Select value={trainingForm.trainerEmail} onValueChange={v => setTrainingForm({ ...trainingForm, trainerEmail: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {activeReps.map(r => <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {influencers.length > 0 && (
                    <div className="space-y-1">
                      <Label>Consultores participantes</Label>
                      <div className="flex flex-wrap gap-2">
                        {influencers.map(inf => {
                          const selected = trainingForm.participants.includes(inf.name);
                          return (
                            <Badge
                              key={inf.id}
                              variant={selected ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                setTrainingForm(prev => ({
                                  ...prev,
                                  participants: selected
                                    ? prev.participants.filter(p => p !== inf.name)
                                    : [...prev.participants, inf.name],
                                }));
                              }}
                            >
                              {selected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {inf.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1"><Label>Coleção / Produto</Label><Input value={trainingForm.collection} onChange={e => setTrainingForm({ ...trainingForm, collection: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea value={trainingForm.observations} onChange={e => setTrainingForm({ ...trainingForm, observations: e.target.value })} rows={2} /></div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowTrainingForm(false)}>Cancelar</Button>
                    <Button onClick={handleTrainingSubmit}>Salvar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ABA 4 - NPS */}
          <TabsContent value="nps" className="space-y-4 mt-4">
            {npsAverage !== null && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Média NPS da Loja</p>
                <p className="text-3xl font-bold text-primary">{npsAverage.toFixed(1)}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Respostas NPS</h3>
              <Button size="sm" onClick={() => setShowNpsForm(true)}><Plus className="h-4 w-4 mr-1" /> Registrar NPS</Button>
            </div>

            {npsResponses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta NPS</p>}
            <div className="space-y-2">
              {npsResponses.map(n => (
                <div key={n.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{n.consultantName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(n.responseDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {n.scores.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                    <span className="text-xs font-semibold ml-2">Média: {n.average.toFixed(1)}</span>
                  </div>
                  {n.trainerEmail && <p className="text-xs text-muted-foreground">Rep: {emailToName[n.trainerEmail] || n.trainerEmail}</p>}
                  {n.comment && <p className="text-xs text-muted-foreground">{n.comment}</p>}
                </div>
              ))}
            </div>

            {/* NPS form dialog */}
            <Dialog open={showNpsForm} onOpenChange={setShowNpsForm}>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar NPS</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Consultor</Label>
                    {influencers.length > 0 ? (
                      <Select value={npsForm.consultantName} onValueChange={v => setNpsForm({ ...npsForm, consultantName: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {influencers.map(inf => <SelectItem key={inf.id} value={inf.name}>{inf.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={npsForm.consultantName} onChange={e => setNpsForm({ ...npsForm, consultantName: e.target.value })} placeholder="Nome do consultor" />
                    )}
                  </div>
                  <div className="space-y-1"><Label>Data</Label><Input type="date" value={npsForm.responseDate} onChange={e => setNpsForm({ ...npsForm, responseDate: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Notas (1-10)</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {npsForm.scores.map((score, i) => (
                        <div key={i}>
                          <Label className="text-xs text-muted-foreground">Nota {i + 1}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={score || ''}
                            onChange={e => {
                              const newScores = [...npsForm.scores];
                              newScores[i] = parseInt(e.target.value) || 0;
                              setNpsForm({ ...npsForm, scores: newScores });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1"><Label>Comentário</Label><Textarea value={npsForm.comment} onChange={e => setNpsForm({ ...npsForm, comment: e.target.value })} rows={2} /></div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowNpsForm(false)}>Cancelar</Button>
                    <Button onClick={handleNpsSubmit}>Salvar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
