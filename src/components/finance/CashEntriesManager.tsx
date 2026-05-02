import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, ArrowDownCircle, ArrowUpCircle, Wallet, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { logFinanceAudit } from '@/hooks/useFinanceAudit';

const CATEGORIES = [
  'Combustível',
  'Alimentação',
  'Material Escritório',
  'Retirada',
  'Depósito',
  'Estacionamento',
  'Outros',
];

type CashEntry = {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  description: string;
  category: string | null;
  cost_center: string | null;
  entry_date: string;
  bank_account_id: string | null;
  receipt_url: string | null;
  created_at: string;
};

type Account = { id: string; name: string; color: string | null };

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const todayIso = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  direction: 'out' as 'in' | 'out',
  amount: '' as number | '',
  description: '',
  category: '',
  bank_account_id: '',
  entry_date: todayIso(),
};

export function CashEntriesManager() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // filters
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('finance_cash_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (filterAccount !== 'all') q = q.eq('bank_account_id', filterAccount);
    if (filterFrom) q = q.gte('entry_date', filterFrom);
    if (filterTo) q = q.lte('entry_date', filterTo);
    const [eRes, aRes] = await Promise.all([
      q,
      supabase.from('finance_bank_accounts').select('id, name, color').eq('active', true).order('name'),
    ]);
    setEntries((eRes.data as CashEntry[]) ?? []);
    setAccounts((aRes.data as Account[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAccount, filterFrom, filterTo]);

  const openNew = () => {
    setForm(emptyForm);
    setReceipt(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Informe a descrição');
      return;
    }
    setSaving(true);
    let receipt_url: string | null = null;
    if (receipt) {
      const path = `cash/${Date.now()}_${receipt.name.replace(/\s+/g, '_')}`;
      const up = await supabase.storage.from('finance-documents').upload(path, receipt);
      if (up.error) {
        toast.error('Erro ao subir comprovante: ' + up.error.message);
      } else {
        receipt_url = up.data.path;
      }
    }
    const { data, error } = await supabase
      .from('finance_cash_entries')
      .insert({
        direction: form.direction,
        amount: Number(form.amount),
        description: form.description.trim(),
        category: form.category || null,
        bank_account_id: form.bank_account_id || null,
        entry_date: form.entry_date,
        receipt_url,
      })
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar lançamento');
      return;
    }
    toast.success('Lançamento registrado');
    await logFinanceAudit({
      table_name: 'finance_cash_entries',
      action: 'create',
      record_id: data?.id ?? null,
      payload: { ...form, amount: Number(form.amount) },
    });
    setOpen(false);
    load();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" /> Lançamentos de Caixa
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Entradas e saídas rápidas de dinheiro (combustível, alimentação, retiradas, depósitos…).
            </p>
          </div>
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Lançamento de Caixa
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* filters */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Conta</Label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">De</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento de caixa no período.
            </p>
          ) : (
            <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="p-0">
                        <div
                          className={cn(
                            'h-12 w-1.5 rounded-r',
                            e.direction === 'in' ? 'bg-green-500' : 'bg-destructive',
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {e.description}
                          {e.receipt_url && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {e.category ? <Badge variant="outline">{e.category}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{accountName(e.bank_account_id)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono font-medium',
                          e.direction === 'in' ? 'text-green-600' : 'text-destructive',
                        )}
                      >
                        {e.direction === 'in' ? '+' : '−'} {fmtBRL(Number(e.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lançamento de caixa</DialogTitle>
            <DialogDescription>Registre rapidamente uma entrada ou saída de dinheiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'in' })}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 transition',
                  form.direction === 'in'
                    ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-border text-muted-foreground hover:border-green-500/50',
                )}
              >
                <ArrowUpCircle className="h-6 w-6" />
                <span className="text-sm font-semibold">ENTRADA</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'out' })}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 transition',
                  form.direction === 'out'
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/50',
                )}
              >
                <ArrowDownCircle className="h-6 w-6" />
                <span className="text-sm font-semibold">SAÍDA</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                className="h-14 text-2xl font-bold"
                placeholder="0,00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Combustível Posto Shell"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select
                  value={form.bank_account_id}
                  onValueChange={(v) => setForm({ ...form, bank_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comprovante</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
