import { useMemo, useState } from 'react';
import { Plus, Search, MoreHorizontal, CheckCircle2, Copy, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFinanceEntries, type EntryType, type EntryStatus, type FinanceEntry } from '@/hooks/useFinanceEntries';
import { EntryStatusBadge } from './EntryStatusBadge';
import { EntryFormDialog } from './EntryFormDialog';
import { EntryDetailDialog } from './EntryDetailDialog';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const PERIODS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês anterior' },
  { value: 'next_30', label: 'Próximos 30 dias' },
  { value: 'overdue', label: 'Vencidos' },
] as const;

interface Props {
  entryType: EntryType;
}

export function EntriesManager({ entryType }: Props) {
  const isPagar = entryType === 'a_pagar';
  const {
    entries, companies, categories, loading,
    createEntry, deleteEntry, markAsPaid, duplicateEntry,
  } = useFinanceEntries();

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<typeof PERIODS[number]['value']>('all');
  const [status, setStatus] = useState<EntryStatus | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FinanceEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<FinanceEntry | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const startOfMonth = (offset = 0) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset, 1);
      return d.toISOString().slice(0, 10);
    };
    const endOfMonth = (offset = 0) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset + 1, 0);
      return d.toISOString().slice(0, 10);
    };
    const next30 = () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    };

    return entries
      .filter((e) => e.entry_type === entryType)
      .filter((e) => {
        if (search && !`${e.description} ${e.counterparty ?? ''} ${e.document ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (companyFilter !== 'all' && e.company_id !== companyFilter) return false;
        if (categoryFilter !== 'all' && e.category_id !== categoryFilter) return false;

        if (status !== 'all') {
          const effective: EntryStatus =
            e.status === 'pendente' && e.due_date < today ? 'vencido' : e.status;
          if (effective !== status) return false;
        }

        if (period === 'this_month') {
          if (e.due_date < startOfMonth(0) || e.due_date > endOfMonth(0)) return false;
        } else if (period === 'last_month') {
          if (e.due_date < startOfMonth(-1) || e.due_date > endOfMonth(-1)) return false;
        } else if (period === 'next_30') {
          if (e.due_date < today || e.due_date > next30()) return false;
        } else if (period === 'overdue') {
          if (!(e.status === 'pendente' && e.due_date < today)) return false;
        }
        return true;
      });
  }, [entries, entryType, search, period, status, companyFilter, categoryFilter, today]);

  const total = filtered.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPendente = filtered.filter((e) => e.status === 'pendente').reduce((a, e) => a + Number(e.amount), 0);
  const totalPago = filtered.filter((e) => e.status === 'pago').reduce((a, e) => a + Number(e.amount), 0);

  const companiesById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies]);
  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="space-y-4">
      {/* Header / actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isPagar ? 'Contas a Pagar' : 'Contas a Receber'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} lançamento(s) · Total {fmtBRL(total)} · Pendente {fmtBRL(totalPendente)} · Pago {fmtBRL(totalPago)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {isPagar ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição, doc..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus | 'all')}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories
                  .filter((c) => c.category_type === 'ambos' || c.category_type === (isPagar ? 'despesa' : 'receita'))
                  .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ overscrollBehaviorX: 'contain' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>{isPagar ? 'Pagador (Empresa)' : 'Recebedor (Empresa)'}</TableHead>
                  <TableHead>{isPagar ? 'Fornecedor' : 'Cliente'}</TableHead>
                  <TableHead>NF / Doc</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() => setDetailEntry(e)}
                  >
                    <TableCell className="text-sm">{fmtDate(e.due_date)}</TableCell>
                    <TableCell className="font-medium">
                      {e.description}
                      {e.installment_total > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({e.installment_index}/{e.installment_total})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.category_id ? categoriesById[e.category_id]?.name ?? '—' : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.company_id ? companiesById[e.company_id]?.name ?? '—' : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{e.counterparty ?? '—'}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">{e.document ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmtBRL(Number(e.amount))}</TableCell>
                    <TableCell>
                      <EntryStatusBadge status={e.status} dueDate={e.due_date} />
                    </TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {e.status !== 'pago' && (
                            <DropdownMenuItem onClick={() => markAsPaid(e.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => duplicateEntry(e)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Pencil className="h-4 w-4 mr-2" /> Editar (em breve)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDelete(e)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entryType={entryType}
        companies={companies}
        categories={categories}
        onSubmit={createEntry}
      />

      <EntryDetailDialog
        open={!!detailEntry}
        onOpenChange={(o) => !o && setDetailEntry(null)}
        entry={detailEntry}
        companies={companies}
        categories={categories}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento "{confirmDelete?.description}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) {
                  await deleteEntry(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
