import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EntryType = 'a_pagar' | 'a_receber';
export type EntryStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';
export type RecurrenceRule = 'mensal' | 'anual' | null;

export interface FinanceCompany {
  id: string;
  name: string;
  entity_type: 'pj' | 'pf';
  document: string | null;
  active: boolean;
}

export interface FinanceCategory {
  id: string;
  name: string;
  category_type: 'despesa' | 'receita' | 'ambos';
  color: string | null;
  active: boolean;
}

export interface FinanceEntry {
  id: string;
  entry_type: EntryType;
  description: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: EntryStatus;
  category_id: string | null;
  company_id: string | null;
  counterparty: string | null;
  payment_method: string | null;
  notes: string | null;
  cost_center: string | null;
  document: string | null;
  installment_index: number;
  installment_total: number;
  recurrence_id: string | null;
  recurrence_rule: RecurrenceRule;
  created_at: string;
  updated_at: string;
}

export interface InstallmentInput {
  due_date: string; // ISO yyyy-mm-dd
  amount: number;
}

export interface EntryFormInput {
  entry_type: EntryType;
  description: string;
  amount: number;
  due_date: string; // ISO yyyy-mm-dd
  category_id?: string | null;
  company_id?: string | null;
  counterparty?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  cost_center?: string | null;
  document?: string | null;
  // recorrência / parcelamento
  installment_total?: number;     // 1 = sem parcelamento
  recurrence_rule?: RecurrenceRule; // null = sem recorrência (cria N parcelas mensais consecutivas)
  recurrence_count?: number;        // qtd de ocorrências quando recurrence_rule != null
  // lista pronta de parcelas (vinda de NF/XML) — quando preenchida, ignora installment_total/recurrence
  installments_list?: InstallmentInput[];
}

const addMonthsISO = (iso: string, months: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
};
const addYearsISO = (iso: string, years: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y + years, m - 1, d));
  return dt.toISOString().slice(0, 10);
};

export function useFinanceEntries() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [companies, setCompanies] = useState<FinanceCompany[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, c, cat] = await Promise.all([
      supabase.from('finance_entries').select('*').order('due_date', { ascending: true }),
      supabase.from('finance_companies').select('*').eq('active', true).order('name'),
      supabase.from('finance_categories').select('*').eq('active', true).order('name'),
    ]);
    if (e.error) toast.error('Erro ao carregar lançamentos');
    if (c.error) toast.error('Erro ao carregar empresas');
    if (cat.error) toast.error('Erro ao carregar categorias');
    setEntries((e.data ?? []) as FinanceEntry[]);
    setCompanies((c.data ?? []) as FinanceCompany[]);
    setCategories((cat.data ?? []) as FinanceCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createEntry = useCallback(
    async (input: EntryFormInput) => {
      // Caminho 1: lista explícita de parcelas (vinda de NF/XML/PDF processada por IA)
      const explicit = (input.installments_list ?? []).filter(
        (p) => p && p.due_date && Number.isFinite(p.amount) && p.amount > 0,
      );

      type EntryRow = Database['public']['Tables']['finance_entries']['Insert'];
      let rows: EntryRow[];
      let total: number;
      let recurrenceId: string | null;
      let isRecurrence = false;

      if (explicit.length > 0) {
        total = explicit.length;
        recurrenceId = total > 1 ? crypto.randomUUID() : null;
        rows = explicit.map((p, i) => ({
          entry_type: input.entry_type,
          description:
            total > 1 ? `${input.description} (${i + 1}/${total})` : input.description,
          amount: +p.amount.toFixed(2),
          due_date: p.due_date,
          status: 'pendente' as EntryStatus,
          category_id: input.category_id ?? null,
          company_id: input.company_id ?? null,
          counterparty: input.counterparty ?? null,
          payment_method: input.payment_method ?? null,
          notes: input.notes ?? null,
          cost_center: input.cost_center ?? null,
          document: input.document ?? null,
          installment_index: i + 1,
          installment_total: total,
          recurrence_id: recurrenceId,
          recurrence_rule: null,
        }));
      } else {
        // Caminho 2: parcelamento simples (valor / N) ou recorrência
        const installments = Math.max(1, input.installment_total ?? 1);
        const recurrenceCount = input.recurrence_rule
          ? Math.max(1, input.recurrence_count ?? 12)
          : 0;
        isRecurrence = recurrenceCount > 0;

        total = 1;
        let stepFn: (iso: string, i: number) => string = (iso) => iso;

        if (recurrenceCount > 0) {
          total = recurrenceCount;
          stepFn = (iso, i) =>
            input.recurrence_rule === 'anual' ? addYearsISO(iso, i) : addMonthsISO(iso, i);
        } else if (installments > 1) {
          total = installments;
          stepFn = (iso, i) => addMonthsISO(iso, i);
        }

        recurrenceId = total > 1 ? crypto.randomUUID() : null;
        const installmentAmount =
          recurrenceCount > 0 ? input.amount : +(input.amount / installments).toFixed(2);

        rows = Array.from({ length: total }, (_, i) => ({
          entry_type: input.entry_type,
          description:
            total > 1 && recurrenceCount === 0
              ? `${input.description} (${i + 1}/${total})`
              : input.description,
          amount: installmentAmount,
          due_date: stepFn(input.due_date, i),
          status: 'pendente' as EntryStatus,
          category_id: input.category_id ?? null,
          company_id: input.company_id ?? null,
          counterparty: input.counterparty ?? null,
          payment_method: input.payment_method ?? null,
          notes: input.notes ?? null,
          cost_center: input.cost_center ?? null,
          document: input.document ?? null,
          installment_index: i + 1,
          installment_total: total,
          recurrence_id: recurrenceId,
          recurrence_rule: isRecurrence ? input.recurrence_rule : null,
        }));
      }

      const { error } = await supabase.from('finance_entries').insert(rows);
      if (error) {
        toast.error('Erro ao criar lançamento');
        return false;
      }
      toast.success(total > 1 ? `${total} lançamentos criados` : 'Lançamento criado');
      await load();
      return true;
    },
    [load],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<FinanceEntry>) => {
      const { error } = await supabase.from('finance_entries').update(patch).eq('id', id);
      if (error) {
        toast.error('Erro ao atualizar');
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('finance_entries').delete().eq('id', id);
      if (error) {
        toast.error('Erro ao excluir');
        return false;
      }
      toast.success('Lançamento excluído');
      await load();
      return true;
    },
    [load],
  );

  const markAsPaid = useCallback(
    async (id: string) => {
      const today = new Date().toISOString().slice(0, 10);
      return updateEntry(id, { status: 'pago', paid_date: today });
    },
    [updateEntry],
  );

  const duplicateEntry = useCallback(
    async (entry: FinanceEntry) => {
      const { id, created_at, updated_at, ...rest } = entry;
      const copy = {
        ...rest,
        description: `${entry.description} (cópia)`,
        status: 'pendente' as EntryStatus,
        paid_date: null,
        installment_index: 1,
        installment_total: 1,
        recurrence_id: null,
        recurrence_rule: null,
      };
      const { error } = await supabase.from('finance_entries').insert(copy);
      if (error) {
        toast.error('Erro ao duplicar');
        return false;
      }
      toast.success('Lançamento duplicado');
      await load();
      return true;
    },
    [load],
  );

  return {
    entries,
    companies,
    categories,
    loading,
    reload: load,
    createEntry,
    updateEntry,
    deleteEntry,
    markAsPaid,
    duplicateEntry,
  };
}
