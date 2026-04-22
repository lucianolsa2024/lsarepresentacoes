import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';
import { toast } from 'sonner';
import type { EntryFormInput, EntryType, FinanceCategory, FinanceCompany, RecurrenceRule } from '@/hooks/useFinanceEntries';

const PAYMENT_METHODS_PAGAR = ['Boleto', 'PIX', 'Transferência', 'Cartão de Crédito', 'Débito Automático', 'Dinheiro'];
const PAYMENT_METHODS_RECEBER = ['Boleto', 'PIX', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Cheque'];

const schema = z.object({
  description: z.string().trim().min(1, 'Descrição obrigatória').max(200),
  amount: z.number().positive('Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Vencimento obrigatório'),
  category_id: z.string().min(1, 'Categoria obrigatória'),
  company_id: z.string().min(1, 'Empresa obrigatória'),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryType: EntryType;
  companies: FinanceCompany[];
  categories: FinanceCategory[];
  onSubmit: (input: EntryFormInput) => Promise<boolean>;
}

export function EntryFormDialog({ open, onOpenChange, entryType, companies, categories, onSubmit }: Props) {
  const isPagar = entryType === 'a_pagar';
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [document, setDocument] = useState('');

  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('mensal');
  const [recurrenceCount, setRecurrenceCount] = useState(12);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription('');
      setAmount('');
      setDueDate(new Date().toISOString().slice(0, 10));
      setCategoryId('');
      setCompanyId('');
      setCounterparty('');
      setPaymentMethod('');
      setNotes('');
      setCostCenter('');
      setDocument('');
      setEnableInstallments(false);
      setInstallments(2);
      setEnableRecurrence(false);
      setRecurrenceRule('mensal');
      setRecurrenceCount(12);
    }
  }, [open, entryType]);

  const filteredCategories = categories.filter(
    (c) => c.category_type === 'ambos' || c.category_type === (isPagar ? 'despesa' : 'receita'),
  );

  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      description,
      amount: Number(amount.replace(',', '.')),
      due_date: dueDate,
      category_id: categoryId,
      company_id: companyId,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    const ok = await onSubmit({
      entry_type: entryType,
      description: parsed.data.description,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      category_id: parsed.data.category_id,
      company_id: parsed.data.company_id,
      counterparty: counterparty.trim() || null,
      payment_method: paymentMethod || null,
      notes: notes.trim() || null,
      cost_center: costCenter.trim() || null,
      document: document.trim() || null,
      installment_total: enableInstallments && !enableRecurrence ? installments : 1,
      recurrence_rule: enableRecurrence ? recurrenceRule : null,
      recurrence_count: enableRecurrence ? recurrenceCount : 0,
    });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  const paymentMethods = isPagar ? PAYMENT_METHODS_PAGAR : PAYMENT_METHODS_RECEBER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPagar ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Obrigatórios */}
          <div className="grid gap-2">
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Ex.: Aluguel showroom março" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$) *</Label>
              <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="grid gap-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Empresa *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Específicos / opcionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{isPagar ? 'Fornecedor' : 'Cliente'}</Label>
              <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={150} />
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

          {/* Recorrência / Parcelamento */}
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
            <div className="flex items-start gap-2">
              <Checkbox
                id="parc"
                checked={enableInstallments}
                disabled={enableRecurrence}
                onCheckedChange={(v) => setEnableInstallments(!!v)}
              />
              <div className="grid gap-1 flex-1">
                <Label htmlFor="parc" className="cursor-pointer">Parcelamento</Label>
                {enableInstallments && (
                  <div className="flex items-center gap-2 mt-1">
                    <Label className="text-xs text-muted-foreground">Nº parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      max={60}
                      value={installments}
                      onChange={(e) => setInstallments(Math.max(2, Number(e.target.value)))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      Valor por parcela: R$ {amount ? (Number(amount.replace(',', '.')) / installments).toFixed(2) : '0,00'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="rec"
                checked={enableRecurrence}
                disabled={enableInstallments}
                onCheckedChange={(v) => setEnableRecurrence(!!v)}
              />
              <div className="grid gap-1 flex-1">
                <Label htmlFor="rec" className="cursor-pointer">Recorrência</Label>
                {enableRecurrence && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Select value={recurrenceRule ?? 'mensal'} onValueChange={(v) => setRecurrenceRule(v as RecurrenceRule)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label className="text-xs text-muted-foreground">Ocorrências</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Math.max(1, Number(e.target.value)))}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
