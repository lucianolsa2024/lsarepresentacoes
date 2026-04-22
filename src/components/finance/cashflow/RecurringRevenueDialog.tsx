import { useState } from 'react';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { CompanyRow, CategoryRow } from '@/hooks/useFinanceReports';
import type { RecurringRevenue } from '@/hooks/useCashflowProjection';
import { fmtBRL } from '@/hooks/useCashflowProjection';

type Props = {
  recurring: RecurringRevenue[];
  setRecurring: (next: RecurringRevenue[]) => void;
  companies: CompanyRow[];
  categories: CategoryRow[];
};

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export function RecurringRevenueDialog({ recurring, setRecurring, companies, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<RecurringRevenue>>({
    description: '',
    amount: 0,
    company_id: null,
    category_id: null,
    day_of_month: 5,
    start_month: monthStart(),
    end_month: null,
    active: true,
  });

  const add = () => {
    if (!draft.description || !draft.amount || draft.amount <= 0) {
      toast.error('Preencha descrição e valor.');
      return;
    }
    const item: RecurringRevenue = {
      id: crypto.randomUUID(),
      description: draft.description,
      amount: Number(draft.amount),
      company_id: draft.company_id ?? null,
      category_id: draft.category_id ?? null,
      day_of_month: Math.min(Math.max(1, Number(draft.day_of_month ?? 1)), 28),
      start_month: draft.start_month ?? monthStart(),
      end_month: draft.end_month ?? null,
      active: draft.active ?? true,
    };
    setRecurring([...recurring, item]);
    setDraft({
      description: '',
      amount: 0,
      company_id: null,
      category_id: null,
      day_of_month: 5,
      start_month: monthStart(),
      end_month: null,
      active: true,
    });
    toast.success('Receita recorrente adicionada.');
  };

  const remove = (id: string) => setRecurring(recurring.filter((r) => r.id !== id));
  const toggle = (id: string, active: boolean) =>
    setRecurring(recurring.map((r) => (r.id === id ? { ...r, active } : r)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCcw className="h-4 w-4" />
          Recorrentes ({recurring.filter((r) => r.active).length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receitas recorrentes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-6">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={draft.description ?? ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ex: Mensalidade contrato X"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                value={draft.amount ?? 0}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dia</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={draft.day_of_month ?? 5}
                onChange={(e) => setDraft({ ...draft, day_of_month: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Select
                value={draft.company_id ?? 'all'}
                onValueChange={(v) => setDraft({ ...draft, company_id: v === 'all' ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={draft.category_id ?? 'all'}
                onValueChange={(v) => setDraft({ ...draft, category_id: v === 'all' ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">—</SelectItem>
                  {categories.filter((c) => c.category_type !== 'despesa').map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button size="sm" onClick={add} className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Dia</TableHead>
                  <TableHead className="text-center">Ativa</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurring.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {companies.find((c) => c.id === r.company_id)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {fmtBRL(r.amount)}
                    </TableCell>
                    <TableCell className="text-center">{r.day_of_month}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recurring.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Nenhuma receita recorrente cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
