import { useState } from 'react';
import { OpportunityFormData, FUNNEL_STAGES_CORPORATIVO, SalesOpportunity } from '@/hooks/useSalesOpportunities';
import { Client } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  clients: Client[];
  representatives: { email: string; representative_name: string }[];
  initial?: SalesOpportunity | null;
  onSave: (data: OpportunityFormData) => void;
  onCancel: () => void;
}

export function CorporateOpportunityForm({ clients, representatives, initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<OpportunityFormData>({
    clientId: initial?.clientId || null,
    title: initial?.title || '',
    description: initial?.description || '',
    funnelType: 'corporativo',
    stage: initial?.stage || 'prospeccao',
    value: initial?.value || 0,
    notes: initial?.notes || '',
    ownerEmail: initial?.ownerEmail || '',
    nextFollowupDate: initial?.nextFollowupDate || '',
  });

  const handleSubmit = () => {
    if (!form.clientId) { toast.error('Selecione um cliente'); return; }
    if (!form.title.trim()) { toast.error('Preencha o projeto/descrição'); return; }
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={form.clientId || 'none'} onValueChange={v => setForm({ ...form, clientId: v === 'none' ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecionar...</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Representante</Label>
          <Select value={form.ownerEmail || 'none'} onValueChange={v => setForm({ ...form, ownerEmail: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecionar...</SelectItem>
              {representatives.map(r => <SelectItem key={r.email} value={r.email}>{r.representative_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Projeto / Descrição *</Label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Hotel Marina - 200 quartos" />
        </div>
        <div className="space-y-2">
          <Label>Valor estimado (R$)</Label>
          <Input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label>Etapa atual</Label>
          <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FUNNEL_STAGES_CORPORATIVO.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data do próximo follow-up</Label>
          <Input type="date" value={form.nextFollowupDate || ''} onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Observações</Label>
          <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit}>{initial ? 'Salvar' : 'Criar'}</Button>
      </div>
    </div>
  );
}
