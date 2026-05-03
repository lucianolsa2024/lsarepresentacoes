import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { EntryStatus, FinanceCategory, FinanceCompany, FinanceEntry } from '@/hooks/useFinanceEntries';

const PAYMENT_METHODS_PAGAR = ['Boleto', 'PIX', 'Transferência', 'Cartão de Crédito', 'Débito Automático', 'Dinheiro'];
const PAYMENT_METHODS_RECEBER = ['Boleto', 'PIX', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Cheque'];

type Frequency = 'semanal' | 'quinzenal' | 'mensal' | 'anual';

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinanceEntry | null;
  companies: FinanceCompany[];
  categories: FinanceCategory[];
  onSaved: () => void;
}

const stepDate = (iso: string, freq: Frequency, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (freq === 'semanal') dt.setUTCDate(dt.getUTCDate() + 7 * n);
  else if (freq === 'quinzenal') dt.setUTCDate(dt.getUTCDate() + 15 * n);
  else if (freq === 'mensal') dt.setUTCMonth(dt.getUTCMonth() + n);
  else if (freq === 'anual') dt.setUTCFullYear(dt.getUTCFullYear() + n);
  return dt.toISOString().slice(0, 10);
};

export function EntryEditDialog({ open, onOpenChange, entry, companies, categories, onSaved }: Props) {
  const isPagar = entry?.entry_type === 'a_pagar';

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState<EntryStatus>('pendente');
  const [costCenter, setCostCenter] = useState('');
  const [document, setDocument] = useState('');
  const [notes, setNotes] = useState('');

  const [recEnabled, setRecEnabled] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('mensal');
  const [repeatCount, setRepeatCount] = useState(12);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('finance_bank_accounts')
      .select('id, name, bank_name, active')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setBankAccounts((data ?? []) as BankAccount[]));
  }, [open]);

  useEffect(() => {
    if (entry && open) {
      setDescription(entry.description ?? '');
      setCounterparty(entry.counterparty ?? '');
      setAmount(String(entry.amount ?? '').replace('.', ','));
      setDueDate(entry.due_date ? String(entry.due_date).slice(0, 10) : '');
      setCategoryId(entry.category_id ?? '');
      setBankAccountId((entry as any).bank_account_id ?? '');
      setCompanyId(entry.company_id ?? '');
      setPaymentMethod(entry.payment_method ?? '');
      setStatus(entry.status === 'vencido' ? 'pendente' : entry.status);
      setCostCenter(entry.cost_center ?? '');
      setDocument(entry.document ?? '');
      setNotes(entry.notes ?? '');
      setRecEnabled(!!entry.recurrence_rule);
      setFrequency(((entry.recurrence_rule as Frequency) ?? 'mensal') as Frequency);
      setRepeatCount(12);
    }
  }, [entry, open]);

  const filteredCategories = categories.filter(
    (c) => c.category_type === 'ambos' || c.category_type === (isPagar ? 'despesa' : 'receita'),
  );

  const paymentMethods = isPagar ? PAYMENT_METHODS_PAGAR : PAYMENT_METHODS_RECEBER;

  const handleSave = async () => {
    if (!entry) return;
    const amt = Number(amount.replace(',', '.'));
    if (!description.trim()) return toast.error('Descrição obrigatória');
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Valor inválido');
    if (!dueDate) return toast.error('Vencimento obrigatório');

    setSaving(true);
    const patch: Record<string, unknown> = {
      description: description.trim(),
      counterparty: counterparty.trim() || null,
      amount: amt,
      due_date: dueDate,
      category_id: categoryId || null,
      bank_account_id: bankAccountId || null,
      company_id: companyId || null,
      payment_method: paymentMethod || null,
      status,
      paid_date: status === 'pago' ? entry.paid_date ?? new Date().toISOString().slice(0, 10) : null,
      cost_center: costCenter.trim() || null,
      document: document.trim() || null,
      notes: notes.trim() || null,
      recurrence_rule: recEnabled ? frequency : null,
    };
    const { error } = await supabase.from('finance_entries').update(patch).eq('id', entry.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Lançamento atualizado');
    onSaved();
    onOpenChange(false);
  };

  const handleGenerateInstallments = async () => {
    if (!entry) return;
    if (!recEnabled) return toast.error('Ative a recorrência primeiro');
    const n = Math.max(1, Math.min(120, Number(repeatCount) || 0));
    if (n < 1) return toast.error('Informe o número de ocorrências');
    const amt = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Valor inválido');
    if (!dueDate) return toast.error('Vencimento obrigatório');

    setGenerating(true);
    const recurrenceId = entry.recurrence_id ?? crypto.randomUUID();
    const total = n + 1; // current + n future

    // Update parent with recurrence_id and totals
    await supabase
      .from('finance_entries')
      .update({
        recurrence_id: recurrenceId,
        recurrence_rule: frequency,
        installment_index: 1,
        installment_total: total,
      })
      .eq('id', entry.id);

    const rows = Array.from({ length: n }, (_, i) => ({
      entry_type: entry.entry_type,
      description: description.trim(),
      amount: amt,
      due_date: stepDate(dueDate, frequency, i + 1),
      status: 'pendente' as EntryStatus,
      category_id: categoryId || null,
      bank_account_id: bankAccountId || null,
      company_id: companyId || null,
      counterparty: counterparty.trim() || null,
      payment_method: paymentMethod || null,
      notes: notes.trim() || null,
      cost_center: costCenter.trim() || null,
      document: document.trim() || null,
      installment_index: i + 2,
      installment_total: total,
      recurrence_id: recurrenceId,
      recurrence_rule: frequency,
    }));

    const { error } = await supabase.from('finance_entries').insert(rows);
    setGenerating(false);
    if (error) {
      toast.error('Erro ao gerar parcelas: ' + error.message);
      return;
    }
    toast.success(`${n} parcelas geradas`);
    onSaved();
    onOpenChange(false);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {isPagar ? 'Conta a Pagar' : 'Conta a Receber'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$) *</Label>
              <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{isPagar ? 'Fornecedor' : 'Cliente'}</Label>
              <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={150} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Conta Bancária</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.bank_name ? ` — ${b.bank_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Centro de Custo</Label>
              <Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} maxLength={100} />
            </div>
            <div className="grid gap-2">
              <Label>Documento / NF</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} maxLength={50} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
          </div>

          <Separator />

          {/* Recorrência */}
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">É recorrente?</Label>
                <p className="text-xs text-muted-foreground">Defina uma frequência e gere as parcelas futuras.</p>
              </div>
              <Switch checked={recEnabled} onCheckedChange={setRecEnabled} />
            </div>

            {recEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Frequência</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Repetir por (nº futuros)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateInstallments}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? 'Gerando...' : 'Gerar parcelas agora'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
