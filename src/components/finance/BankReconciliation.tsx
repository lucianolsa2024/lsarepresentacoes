import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Trash2,
  X,
  ArrowRight,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReconciliation, type BankTransaction } from '@/hooks/useReconciliation';
import { useFinanceEntries } from '@/hooks/useFinanceEntries';
import { parseExtract } from '@/lib/ofxParser';
import { suggestMatches, type FinanceEntry as MatchEntry, type MatchSuggestion } from '@/lib/reconciliationMatch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

export function BankReconciliation() {
  const {
    accounts,
    transactions,
    reconciliations,
    loading,
    createAccount,
    importTransactions,
    reconcile,
    undoReconciliation,
    setStatus,
    deleteTransaction,
    loadTransactions,
  } = useReconciliation();

  const { entries, companies, categories, reload: refreshEntries, createEntry } = useFinanceEntries();

  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [prefillEntry, setPrefillEntry] = useState<{ amount?: number; description?: string; due_date?: string; entry_type?: 'a_pagar' | 'a_receber' } | null>(null);
  const [activeTx, setActiveTx] = useState<BankTransaction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-select first account
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  // Reload transactions when filters change
  useEffect(() => {
    if (selectedAccount) {
      loadTransactions(selectedAccount, periodFrom || undefined, periodTo || undefined);
    }
  }, [selectedAccount, periodFrom, periodTo, loadTransactions]);

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => (selectedAccount ? t.bank_account_id === selectedAccount : true));
  }, [transactions, selectedAccount]);

  // Lançamentos disponíveis para conciliação (não pagos OU sem reconciliação ainda)
  const reconciledEntryIds = useMemo(() => new Set(reconciliations.map((r) => r.entry_id)), [reconciliations]);

  const availableEntries: MatchEntry[] = useMemo(() => {
    return entries
      .filter((e) => !reconciledEntryIds.has(e.id))
      .map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        due_date: e.due_date,
        paid_date: e.paid_date,
        entry_type: e.entry_type,
        counterparty: e.counterparty,
      }));
  }, [entries, reconciledEntryIds]);

  const totals = useMemo(() => {
    const conc = filteredTx.filter((t) => t.reconciliation_status === 'conciliado');
    const pend = filteredTx.filter((t) => t.reconciliation_status === 'pendente');
    const ign = filteredTx.filter((t) => t.reconciliation_status === 'ignorado');
    const sum = (arr: BankTransaction[]) => arr.reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      conciliado: { count: conc.length, value: sum(conc) },
      pendente: { count: pend.length, value: sum(pend) },
      ignorado: { count: ign.length, value: sum(ign) },
      total: filteredTx.length,
    };
  }, [filteredTx]);

  // Sugestões automáticas para a transação ativa
  const suggestions: MatchSuggestion[] = useMemo(() => {
    if (!activeTx) return [];
    return suggestMatches(
      {
        id: activeTx.id,
        transaction_date: activeTx.transaction_date,
        description: activeTx.description,
        amount: activeTx.amount,
        transaction_type: activeTx.transaction_type,
      },
      availableEntries,
    );
  }, [activeTx, availableEntries]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccount) {
      if (!selectedAccount) toast.error('Selecione uma conta antes de importar');
      return;
    }
    try {
      const content = await file.text();
      const parsed = parseExtract(file.name, content);
      const source = /\.ofx$/i.test(file.name) ? 'ofx' : 'csv';
      await importTransactions(selectedAccount, parsed, source);
      setShowImportDialog(false);
    } catch (err: any) {
      toast.error('Erro ao processar arquivo: ' + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirmMatch = async (txId: string, entryId: string, score: number) => {
    const ok = await reconcile(txId, entryId, score);
    if (ok) {
      await refreshEntries();
      setActiveTx(null);
    }
  };

  const handleManualMatch = async (entryId: string) => {
    if (!activeTx) return;
    await handleConfirmMatch(activeTx.id, entryId, 0);
  };

  const handleCreateEntryFromTx = (tx: BankTransaction) => {
    setPrefillEntry({
      amount: Math.abs(tx.amount),
      description: tx.description,
      due_date: tx.transaction_date,
      entry_type: tx.transaction_type === 'credit' ? 'a_receber' : 'a_pagar',
    });
    setShowEntryDialog(true);
  };

  const onDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData('entryId', entryId);
  };

  const onDropOnTx = async (e: React.DragEvent, tx: BankTransaction) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData('entryId');
    if (entryId) {
      await reconcile(tx.id, entryId, 0);
      await refreshEntries();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Carregando conciliação...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo / KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total importado"
          value={totals.total.toString()}
          sub="transações no período"
          icon={Filter}
          tone="default"
        />
        <KpiCard
          label="Conciliado"
          value={fmtBRL(totals.conciliado.value)}
          sub={`${totals.conciliado.count} transações`}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Pendente"
          value={fmtBRL(totals.pendente.value)}
          sub={`${totals.pendente.count} aguardando`}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label="Ignorado / Divergência"
          value={fmtBRL(totals.ignorado.value)}
          sub={`${totals.ignorado.count} marcados`}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      {/* Filtros e ações */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex-1">
            <div>
              <Label className="text-xs">Conta bancária</Label>
              <div className="flex gap-2">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground">Nenhuma conta cadastrada</div>
                    )}
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} {a.bank_name ? `· ${a.bank_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowAccountDialog(true)} title="Nova conta">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)} disabled={!selectedAccount}>
              <Upload className="mr-2 h-4 w-4" />
              Importar OFX/CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3-column layout */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Coluna 1: Extrato bancário */}
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              Extrato bancário
              <Badge variant="outline" className="ml-auto">{filteredTx.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-2">
                {filteredTx.length === 0 && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Nenhuma transação. Importe um extrato OFX/CSV.
                  </p>
                )}
                {filteredTx.map((tx) => {
                  const isActive = activeTx?.id === tx.id;
                  const tone =
                    tx.reconciliation_status === 'conciliado'
                      ? 'border-l-emerald-500 bg-emerald-500/5'
                      : tx.reconciliation_status === 'ignorado'
                        ? 'border-l-rose-500 bg-rose-500/5'
                        : 'border-l-amber-500 bg-amber-500/5';
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setActiveTx(tx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropOnTx(e, tx)}
                      className={cn(
                        'w-full rounded-md border border-l-4 p-2 text-left transition-colors',
                        tone,
                        isActive ? 'ring-2 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {fmtDate(tx.transaction_date)}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          {tx.transaction_type === 'credit' ? '+' : ''}
                          {fmtBRL(tx.amount)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-foreground">{tx.description}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            tx.reconciliation_status === 'conciliado' && 'border-emerald-500 text-emerald-700',
                            tx.reconciliation_status === 'pendente' && 'border-amber-500 text-amber-700',
                            tx.reconciliation_status === 'ignorado' && 'border-rose-500 text-rose-700',
                          )}
                        >
                          {tx.reconciliation_status}
                        </Badge>
                        {tx.reconciliation_status === 'pendente' && (
                          <span
                            className="text-[10px] text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(tx.id, 'ignorado');
                            }}
                          >
                            Ignorar
                          </span>
                        )}
                        {tx.reconciliation_status === 'conciliado' && (
                          <button
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rec = reconciliations.find((r) => r.bank_transaction_id === tx.id);
                              if (rec) undoReconciliation(rec.id);
                            }}
                          >
                            <RotateCcw className="inline h-3 w-3" /> Desfazer
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Coluna 2: Sugestões da IA */}
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              Sugestões automáticas
              {activeTx && <Badge variant="outline" className="ml-auto">{suggestions.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 p-3">
                {!activeTx && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Selecione uma transação à esquerda para ver as sugestões.
                  </p>
                )}
                {activeTx && suggestions.length === 0 && (
                  <div className="space-y-2 rounded-md border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground">Nenhum lançamento compatível encontrado.</p>
                    <Button size="sm" onClick={() => handleCreateEntryFromTx(activeTx)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Criar lançamento
                    </Button>
                  </div>
                )}
                {activeTx &&
                  suggestions.map((s) => {
                    const pct = Math.round(s.score * 100);
                    return (
                      <div key={s.entry.id} className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{s.entry.description}</p>
                            {s.entry.counterparty && (
                              <p className="truncate text-xs text-muted-foreground">{s.entry.counterparty}</p>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              'shrink-0',
                              pct >= 80
                                ? 'bg-emerald-500 text-white'
                                : pct >= 50
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-muted text-foreground',
                            )}
                          >
                            {pct}%
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {fmtDate(s.entry.due_date)} · {s.entry.entry_type === 'a_pagar' ? 'A pagar' : 'A receber'}
                          </span>
                          <span className="font-semibold tabular-nums">{fmtBRL(Number(s.entry.amount))}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.reasons.map((r, i) => (
                            <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {r}
                            </span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleConfirmMatch(activeTx.id, s.entry.id, s.score)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Conciliar
                        </Button>
                      </div>
                    );
                  })}
                {activeTx && suggestions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCreateEntryFromTx(activeTx)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Criar novo lançamento
                  </Button>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Coluna 3: Lançamentos não conciliados */}
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4" />
              Lançamentos disponíveis
              <Badge variant="outline" className="ml-auto">{availableEntries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-2">
                {availableEntries.length === 0 && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Todos os lançamentos foram conciliados.
                  </p>
                )}
                {availableEntries.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => onDragStart(ev, e.id)}
                    onClick={() => activeTx && handleManualMatch(e.id)}
                    className={cn(
                      'cursor-grab rounded-md border border-border bg-card p-2 active:cursor-grabbing',
                      activeTx ? 'hover:border-primary hover:bg-primary/5' : 'hover:bg-muted/50',
                    )}
                    title={activeTx ? 'Clique para conciliar com a transação selecionada' : 'Arraste para a transação'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{fmtDate(e.due_date)}</span>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          e.entry_type === 'a_receber' ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {fmtBRL(Number(e.amount))}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground">{e.description}</p>
                    {e.counterparty && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{e.counterparty}</p>
                    )}
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {e.entry_type === 'a_pagar' ? 'A pagar' : 'A receber'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Nova conta */}
      <NewAccountDialog
        open={showAccountDialog}
        onClose={() => setShowAccountDialog(false)}
        onCreate={async (data) => {
          const acc = await createAccount(data);
          if (acc) {
            setSelectedAccount(acc.id);
            setShowAccountDialog(false);
          }
        }}
      />

      {/* Dialog: Importar */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar extrato bancário</DialogTitle>
            <DialogDescription>
              Selecione um arquivo OFX (Itaú e demais bancos) ou CSV exportado do internet banking.
              Transações com identificador duplicado (FITID) serão automaticamente ignoradas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Conta de destino</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
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
            <div>
              <Label className="text-xs">Arquivo (.ofx ou .csv)</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={handleFileUpload}
                disabled={!selectedAccount}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar lançamento rápido a partir da transação */}
      <Dialog
        open={showEntryDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowEntryDialog(false);
            setPrefillEntry(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar lançamento e conciliar</DialogTitle>
            <DialogDescription>
              Os dados foram pré-preenchidos a partir da transação bancária. Ajuste e confirme.
            </DialogDescription>
          </DialogHeader>
          <QuickEntryForm
            prefill={prefillEntry}
            companies={companies}
            categories={categories}
            onCancel={() => {
              setShowEntryDialog(false);
              setPrefillEntry(null);
            }}
            onSubmit={async (data) => {
              const ok = await createEntry(data);
              if (ok && activeTx) {
                // Busca o lançamento mais recente criado para concilliar
                const { data: latest } = await supabase
                  .from('finance_entries')
                  .select('id')
                  .eq('description', data.description)
                  .eq('amount', data.amount)
                  .eq('due_date', data.due_date)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (latest?.id) {
                  await reconcile(activeTx.id, latest.id, 1);
                }
              }
              await refreshEntries();
              setShowEntryDialog(false);
              setPrefillEntry(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickEntryForm({
  prefill,
  companies,
  categories,
  onCancel,
  onSubmit,
}: {
  prefill: { amount?: number; description?: string; due_date?: string; entry_type?: 'a_pagar' | 'a_receber' } | null;
  companies: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; category_type: string }>;
  onCancel: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [description, setDescription] = useState(prefill?.description || '');
  const [amount, setAmount] = useState(String(prefill?.amount ?? ''));
  const [dueDate, setDueDate] = useState(prefill?.due_date || new Date().toISOString().slice(0, 10));
  const [entryType, setEntryType] = useState<'a_pagar' | 'a_receber'>(prefill?.entry_type || 'a_pagar');
  const [categoryId, setCategoryId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredCats = categories.filter(
    (c) => c.category_type === 'ambos' || c.category_type === (entryType === 'a_pagar' ? 'despesa' : 'receita'),
  );

  return (
    <>
      <div className="grid gap-3">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={entryType} onValueChange={(v) => setEntryType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a_pagar">Conta a Pagar</SelectItem>
              <SelectItem value="a_receber">Conta a Receber</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Descrição</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Vencimento</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button
          disabled={submitting}
          onClick={async () => {
            if (!description || !amount || !dueDate) {
              toast.error('Preencha descrição, valor e vencimento');
              return;
            }
            setSubmitting(true);
            await onSubmit({
              entry_type: entryType,
              description,
              amount: Number(amount),
              due_date: dueDate,
              category_id: categoryId || null,
              company_id: companyId || null,
            });
            setSubmitting(false);
          }}
        >
          {submitting ? 'Salvando...' : 'Criar e conciliar'}
        </Button>
      </DialogFooter>
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-600'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-600'
        : tone === 'danger'
          ? 'bg-rose-500/10 text-rose-600'
          : 'bg-primary/10 text-primary';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
          </div>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewAccountDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; bank_name: string; agency: string; account_number: string; account_type: string; initial_balance: number }) => void;
}) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('corrente');
  const [initialBalance, setInitialBalance] = useState('0');

  useEffect(() => {
    if (!open) {
      setName(''); setBankName(''); setAgency(''); setAccountNumber(''); setAccountType('corrente'); setInitialBalance('0');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta bancária</DialogTitle>
          <DialogDescription>Cadastre as contas usadas para conciliação.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nome / Apelido *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Itaú PJ Principal" />
          </div>
          <div>
            <Label className="text-xs">Banco</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Itaú" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Agência</Label>
            <Input value={agency} onChange={(e) => setAgency(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Conta</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Saldo inicial</Label>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!name) {
                toast.error('Informe um nome');
                return;
              }
              onCreate({
                name,
                bank_name: bankName,
                agency,
                account_number: accountNumber,
                account_type: accountType,
                initial_balance: parseFloat(initialBalance) || 0,
              });
            }}
          >
            Criar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
