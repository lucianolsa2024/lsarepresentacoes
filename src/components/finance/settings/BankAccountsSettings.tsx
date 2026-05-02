import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logFinanceAudit } from '@/hooks/useFinanceAudit';
import { cn } from '@/lib/utils';

type Account = {
  id: string;
  name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  initial_balance: number;
  initial_balance_date: string | null;
  initial_balance_notes: string | null;
  color: string | null;
  active: boolean;
  company_id: string | null;
};

type Company = { id: string; name: string };

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const emptyAccount = {
  name: '',
  bank_name: '',
  agency: '',
  account_number: '',
  account_type: 'corrente',
  color: '#6366f1',
  company_id: '',
};

const emptyBalance = { initial_balance: 0, initial_balance_date: '', initial_balance_notes: '' };

export function BankAccountsSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // create
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState(emptyAccount);
  const [newSaving, setNewSaving] = useState(false);

  // edit balance
  const [balOpen, setBalOpen] = useState(false);
  const [balEditing, setBalEditing] = useState<Account | null>(null);
  const [balForm, setBalForm] = useState(emptyBalance);
  const [balSaving, setBalSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [accRes, compRes, payRes, recRes, cashRes] = await Promise.all([
      supabase.from('finance_bank_accounts').select('*').eq('active', true).order('name'),
      supabase.from('finance_companies').select('id, name').eq('active', true).order('name'),
      supabase
        .from('finance_entries')
        .select('amount, bank_account_id')
        .eq('entry_type', 'a_pagar')
        .eq('status', 'pago'),
      supabase
        .from('finance_entries')
        .select('amount, bank_account_id')
        .eq('entry_type', 'a_receber')
        .eq('status', 'pago'),
      supabase.from('finance_cash_entries').select('amount, bank_account_id, direction'),
    ]);

    const accs = (accRes.data as Account[]) ?? [];
    setAccounts(accs);
    setCompanies((compRes.data as Company[]) ?? []);

    const map: Record<string, number> = {};
    accs.forEach((a) => (map[a.id] = Number(a.initial_balance ?? 0)));
    (recRes.data ?? []).forEach((r: any) => {
      if (r.bank_account_id) map[r.bank_account_id] = (map[r.bank_account_id] ?? 0) + Number(r.amount ?? 0);
    });
    (payRes.data ?? []).forEach((r: any) => {
      if (r.bank_account_id) map[r.bank_account_id] = (map[r.bank_account_id] ?? 0) - Number(r.amount ?? 0);
    });
    (cashRes.data ?? []).forEach((r: any) => {
      if (!r.bank_account_id) return;
      const v = Number(r.amount ?? 0);
      map[r.bank_account_id] = (map[r.bank_account_id] ?? 0) + (r.direction === 'in' ? v : -v);
    });
    setBalances(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setNewForm(emptyAccount);
    setNewOpen(true);
  };

  const saveNew = async () => {
    if (!newForm.name.trim()) {
      toast.error('Informe o nome da conta');
      return;
    }
    setNewSaving(true);
    const { data, error } = await supabase
      .from('finance_bank_accounts')
      .insert({
        name: newForm.name.trim(),
        bank_name: newForm.bank_name.trim() || null,
        agency: newForm.agency.trim() || null,
        account_number: newForm.account_number.trim() || null,
        account_type: newForm.account_type,
        color: newForm.color,
        company_id: newForm.company_id || null,
        initial_balance: 0,
        active: true,
      })
      .select('id')
      .single();
    setNewSaving(false);
    if (error) {
      toast.error('Erro ao criar conta');
      return;
    }
    toast.success('Conta criada');
    await logFinanceAudit({
      table_name: 'finance_bank_accounts',
      action: 'create',
      record_id: data?.id ?? null,
      payload: newForm,
    });
    setNewOpen(false);
    load();
  };

  const openBal = (a: Account) => {
    setBalEditing(a);
    setBalForm({
      initial_balance: Number(a.initial_balance ?? 0),
      initial_balance_date: a.initial_balance_date ?? '',
      initial_balance_notes: a.initial_balance_notes ?? '',
    });
    setBalOpen(true);
  };

  const saveBal = async () => {
    if (!balEditing) return;
    setBalSaving(true);
    const { error } = await supabase
      .from('finance_bank_accounts')
      .update({
        initial_balance: Number(balForm.initial_balance) || 0,
        initial_balance_date: balForm.initial_balance_date || null,
        initial_balance_notes: balForm.initial_balance_notes.trim() || null,
      })
      .eq('id', balEditing.id);
    setBalSaving(false);
    if (error) {
      toast.error('Erro ao salvar saldo');
      return;
    }
    toast.success('Saldo inicial atualizado');
    await logFinanceAudit({
      table_name: 'finance_bank_accounts',
      action: 'update',
      record_id: balEditing.id,
      payload: balForm,
    });
    setBalOpen(false);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" /> Contas Bancárias
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Saldo atual = saldo inicial + recebimentos − pagamentos + caixa.
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((a) => {
              const balance = balances[a.id] ?? 0;
              const positive = balance >= 0;
              return (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="mt-1 h-8 w-2 shrink-0 rounded-full"
                        style={{ background: a.color ?? '#6366f1' }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.bank_name || '—'}
                          {a.agency || a.account_number
                            ? ` · Ag ${a.agency || '—'} / Cc ${a.account_number || '—'}`
                            : ''}
                        </p>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {a.account_type}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openBal(a)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Saldo
                    </Button>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo inicial</p>
                      <p className="text-sm font-medium text-foreground">{fmtBRL(Number(a.initial_balance ?? 0))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo atual</p>
                      <p className={cn('text-lg font-bold', positive ? 'text-green-600' : 'text-destructive')}>
                        {fmtBRL(balance)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal: nova conta */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta bancária</DialogTitle>
            <DialogDescription>Cadastre uma conta corrente, poupança ou caixa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ex.: LSA Representações - Itaú"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Input
                  value={newForm.bank_name}
                  onChange={(e) => setNewForm({ ...newForm, bank_name: e.target.value })}
                  placeholder="Ex.: Itaú"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={newForm.account_type}
                  onValueChange={(v) => setNewForm({ ...newForm, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agência</Label>
                <Input
                  value={newForm.agency}
                  onChange={(e) => setNewForm({ ...newForm, agency: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Input
                  value={newForm.account_number}
                  onChange={(e) => setNewForm({ ...newForm, account_number: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select
                value={newForm.company_id}
                onValueChange={(v) => setNewForm({ ...newForm, company_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewForm({ ...newForm, color: c })}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition',
                      newForm.color === c ? 'border-foreground scale-110' : 'border-transparent',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={saveNew} disabled={newSaving}>
              {newSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: editar saldo inicial */}
      <Dialog open={balOpen} onOpenChange={setBalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar saldo inicial</DialogTitle>
            <DialogDescription>{balEditing?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Saldo inicial *</Label>
              <Input
                type="number"
                step="0.01"
                value={balForm.initial_balance}
                onChange={(e) => setBalForm({ ...balForm, initial_balance: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data do saldo *</Label>
              <Input
                type="date"
                value={balForm.initial_balance_date}
                onChange={(e) => setBalForm({ ...balForm, initial_balance_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={balForm.initial_balance_notes}
                onChange={(e) => setBalForm({ ...balForm, initial_balance_notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalOpen(false)}>Cancelar</Button>
            <Button onClick={saveBal} disabled={balSaving}>
              {balSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
