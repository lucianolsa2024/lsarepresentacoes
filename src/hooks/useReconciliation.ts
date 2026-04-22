import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ParsedTransaction } from '@/lib/ofxParser';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  initial_balance: number;
  active: boolean;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  fitid: string | null;
  memo: string | null;
  reconciliation_status: 'pendente' | 'conciliado' | 'ignorado';
  imported_at: string;
  source: string;
}

export interface Reconciliation {
  id: string;
  bank_transaction_id: string;
  entry_id: string;
  match_score: number | null;
  match_type: string;
  confirmed_at: string;
  notes: string | null;
}

export function useReconciliation() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('finance_bank_accounts')
      .select('*')
      .order('name');
    if (error) {
      console.error(error);
      return;
    }
    setAccounts((data || []) as BankAccount[]);
  }, []);

  const loadTransactions = useCallback(async (accountId?: string, from?: string, to?: string) => {
    let q = supabase
      .from('finance_bank_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(1000);
    if (accountId) q = q.eq('bank_account_id', accountId);
    if (from) q = q.gte('transaction_date', from);
    if (to) q = q.lte('transaction_date', to);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      return;
    }
    setTransactions((data || []) as BankTransaction[]);
  }, []);

  const loadReconciliations = useCallback(async () => {
    const { data, error } = await supabase
      .from('finance_reconciliations')
      .select('*');
    if (error) {
      console.error(error);
      return;
    }
    setReconciliations((data || []) as Reconciliation[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadTransactions(), loadReconciliations()]).finally(() =>
      setLoading(false),
    );
  }, [loadAccounts, loadTransactions, loadReconciliations]);

  const createAccount = async (input: Partial<BankAccount>) => {
    const { data, error } = await supabase
      .from('finance_bank_accounts')
      .insert({
        name: input.name!,
        bank_name: input.bank_name || null,
        agency: input.agency || null,
        account_number: input.account_number || null,
        account_type: input.account_type || 'corrente',
        initial_balance: input.initial_balance || 0,
        active: input.active ?? true,
      })
      .select()
      .single();
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
      return null;
    }
    await loadAccounts();
    toast.success('Conta bancária criada');
    return data;
  };

  const importTransactions = async (
    accountId: string,
    parsed: ParsedTransaction[],
    source: 'ofx' | 'csv',
  ) => {
    if (!parsed.length) {
      toast.error('Nenhuma transação encontrada no arquivo');
      return { inserted: 0, duplicates: 0 };
    }

    const rows = parsed.map((t) => ({
      bank_account_id: accountId,
      transaction_date: t.transaction_date,
      description: t.description,
      amount: t.amount,
      transaction_type: t.transaction_type,
      fitid: t.fitid || null,
      memo: t.memo || null,
      source,
    }));

    // Para evitar duplicados quando há FITID, usamos upsert por (bank_account_id, fitid)
    const withFitid = rows.filter((r) => r.fitid);
    const withoutFitid = rows.filter((r) => !r.fitid);

    let inserted = 0;
    let duplicates = 0;

    if (withFitid.length) {
      // tenta inserir; ignora violações de unique
      const { data, error } = await supabase
        .from('finance_bank_transactions')
        .upsert(withFitid, { onConflict: 'bank_account_id,fitid', ignoreDuplicates: true })
        .select('id');
      if (error) {
        toast.error('Erro ao importar: ' + error.message);
        return { inserted: 0, duplicates: 0 };
      }
      inserted += (data || []).length;
      duplicates += withFitid.length - (data || []).length;
    }

    if (withoutFitid.length) {
      const { data, error } = await supabase
        .from('finance_bank_transactions')
        .insert(withoutFitid)
        .select('id');
      if (error) {
        toast.error('Erro ao importar: ' + error.message);
      } else {
        inserted += (data || []).length;
      }
    }

    await loadTransactions();
    toast.success(`${inserted} transações importadas${duplicates ? ` (${duplicates} duplicadas ignoradas)` : ''}`);
    return { inserted, duplicates };
  };

  const reconcile = async (bankTransactionId: string, entryId: string, score?: number) => {
    const { error } = await supabase.from('finance_reconciliations').insert({
      bank_transaction_id: bankTransactionId,
      entry_id: entryId,
      match_score: score ?? null,
      match_type: score ? 'suggested' : 'manual',
      confirmed_by: user?.email || null,
    });
    if (error) {
      toast.error('Erro ao conciliar: ' + error.message);
      return false;
    }
    await supabase
      .from('finance_bank_transactions')
      .update({ reconciliation_status: 'conciliado' })
      .eq('id', bankTransactionId);
    await supabase
      .from('finance_entries')
      .update({ status: 'pago', paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', entryId);
    await Promise.all([loadTransactions(), loadReconciliations()]);
    toast.success('Conciliação confirmada');
    return true;
  };

  const undoReconciliation = async (reconciliationId: string) => {
    const rec = reconciliations.find((r) => r.id === reconciliationId);
    if (!rec) return;
    const { error } = await supabase.from('finance_reconciliations').delete().eq('id', reconciliationId);
    if (error) {
      toast.error('Erro ao desfazer: ' + error.message);
      return;
    }
    await supabase
      .from('finance_bank_transactions')
      .update({ reconciliation_status: 'pendente' })
      .eq('id', rec.bank_transaction_id);
    await Promise.all([loadTransactions(), loadReconciliations()]);
    toast.success('Conciliação desfeita');
  };

  const setStatus = async (
    bankTransactionId: string,
    status: 'pendente' | 'conciliado' | 'ignorado',
  ) => {
    const { error } = await supabase
      .from('finance_bank_transactions')
      .update({ reconciliation_status: status })
      .eq('id', bankTransactionId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadTransactions();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('finance_bank_transactions').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadTransactions();
    toast.success('Transação removida');
  };

  return {
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
    refresh: () => Promise.all([loadAccounts(), loadTransactions(), loadReconciliations()]),
    loadTransactions,
  };
}
