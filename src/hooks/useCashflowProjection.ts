import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EntryRow, CompanyRow, CategoryRow } from './useFinanceReports';

export type Scenario = 'realista' | 'otimista' | 'pessimista';

export interface ScenarioConfig {
  id: Scenario;
  label: string;
  /** multiplicador aplicado em entradas projetadas */
  inFactor: number;
  /** multiplicador aplicado em saídas projetadas */
  outFactor: number;
  description: string;
}

export const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  realista: { id: 'realista', label: 'Realista', inFactor: 1, outFactor: 1, description: 'Sem ajuste — projeção atual.' },
  otimista: { id: 'otimista', label: 'Otimista', inFactor: 1.1, outFactor: 0.95, description: '+10% entradas, -5% saídas.' },
  pessimista: { id: 'pessimista', label: 'Pessimista', inFactor: 0.85, outFactor: 1.1, description: '-15% entradas, +10% saídas.' },
};

export interface RecurringRevenue {
  id: string;
  description: string;
  amount: number;
  company_id: string | null;
  category_id: string | null;
  day_of_month: number;
  start_month: string; // YYYY-MM-01
  end_month: string | null;
  active: boolean;
}

export interface CashflowFilters {
  companyId: string | 'all';
  categoryId: string | 'all';
  scenario: Scenario;
  /** mês inicial (YYYY-MM-01) — projeção sempre 12 meses a partir daqui */
  startMonth: string;
}

const monthStart = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

export const defaultCashflowFilters = (): CashflowFilters => ({
  companyId: 'all',
  categoryId: 'all',
  scenario: 'realista',
  startMonth: monthStart(new Date()),
});

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface MonthBucket {
  key: string;          // YYYY-MM
  label: string;        // mmm/aa
  monthDate: Date;      // primeiro dia
  realIn: number;
  realOut: number;
  projIn: number;
  projOut: number;
  recurringIn: number;
  totalIn: number;      // após cenário
  totalOut: number;     // após cenário
  saldoMes: number;
  saldoAcumulado: number;
  isPast: boolean;
  entries: EntryRow[];  // para drill-down
}

export interface DayBucket {
  date: string;         // YYYY-MM-DD
  label: string;        // dd/mm
  in: number;
  out: number;
  saldo: number;
  saldoAcumulado: number;
  entries: EntryRow[];
}

export function useCashflowProjection() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurring, setRecurring] = useState<RecurringRevenue[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, c, co, accs] = await Promise.all([
      supabase
        .from('finance_entries')
        .select('id,entry_type,description,amount,due_date,paid_date,status,category_id,company_id,counterparty')
        .order('due_date', { ascending: true }),
      supabase.from('finance_categories').select('id,name,category_type,color').eq('active', true),
      supabase.from('finance_companies').select('id,name,entity_type').eq('active', true).order('name'),
      supabase.from('finance_bank_accounts').select('initial_balance').eq('active', true),
    ]);

    if (e.error || c.error || co.error) toast.error('Erro ao carregar dados de fluxo de caixa');

    setEntries((e.data ?? []) as EntryRow[]);
    setCategories((c.data ?? []) as CategoryRow[]);
    setCompanies((co.data ?? []) as CompanyRow[]);
    const opening = (accs.data ?? []).reduce((s: number, a: any) => s + Number(a.initial_balance ?? 0), 0);
    setOpeningBalance(opening);

    // tenta carregar recorrentes do localStorage (não exige tabela nova)
    try {
      const raw = localStorage.getItem('finance_recurring_revenues');
      setRecurring(raw ? (JSON.parse(raw) as RecurringRevenue[]) : []);
    } catch {
      setRecurring([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persistRecurring = useCallback((next: RecurringRevenue[]) => {
    setRecurring(next);
    try {
      localStorage.setItem('finance_recurring_revenues', JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, []);

  return {
    entries,
    companies,
    categories,
    recurring,
    openingBalance,
    loading,
    reload: load,
    setRecurring: persistRecurring,
  };
}

/** Constrói 12 meses a partir do startMonth aplicando cenário, recorrentes e filtros. */
export function buildProjection(
  entries: EntryRow[],
  recurring: RecurringRevenue[],
  filters: CashflowFilters,
  openingBalance: number,
): MonthBucket[] {
  const scenario = SCENARIOS[filters.scenario];
  const start = new Date(filters.startMonth + 'T00:00:00');
  const months: MonthBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: `${MES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
      monthDate: d,
      realIn: 0,
      realOut: 0,
      projIn: 0,
      projOut: 0,
      recurringIn: 0,
      totalIn: 0,
      totalOut: 0,
      saldoMes: 0,
      saldoAcumulado: 0,
      isPast: d < new Date(today.getFullYear(), today.getMonth(), 1),
      entries: [],
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));

  // distribui lançamentos
  for (const row of entries) {
    if (row.status === 'cancelado') continue;
    if (filters.companyId !== 'all' && row.company_id !== filters.companyId) continue;
    if (filters.categoryId !== 'all' && row.category_id !== filters.categoryId) continue;

    const isPaid = row.status === 'pago' && row.paid_date;
    const ref = isPaid ? row.paid_date! : row.due_date;
    const k = ref.slice(0, 7);
    const b = byKey.get(k);
    if (!b) continue;
    b.entries.push(row);
    const amt = Number(row.amount);
    if (row.entry_type === 'a_receber') {
      if (isPaid) b.realIn += amt;
      else b.projIn += amt;
    } else {
      if (isPaid) b.realOut += amt;
      else b.projOut += amt;
    }
  }

  // adiciona receitas recorrentes (apenas em meses futuros e ativos)
  for (const rec of recurring) {
    if (!rec.active) continue;
    if (filters.companyId !== 'all' && rec.company_id && rec.company_id !== filters.companyId) continue;
    if (filters.categoryId !== 'all' && rec.category_id && rec.category_id !== filters.categoryId) continue;
    for (const m of months) {
      if (m.isPast) continue;
      const mKey = m.key + '-01';
      if (mKey < rec.start_month) continue;
      if (rec.end_month && mKey > rec.end_month) continue;
      m.recurringIn += Number(rec.amount);
    }
  }

  // aplica cenário e calcula saldos
  let acc = openingBalance;
  for (const m of months) {
    m.totalIn = m.realIn + m.projIn * scenario.inFactor + m.recurringIn * scenario.inFactor;
    m.totalOut = m.realOut + m.projOut * scenario.outFactor;
    m.saldoMes = m.totalIn - m.totalOut;
    acc += m.saldoMes;
    m.saldoAcumulado = acc;
  }
  return months;
}

/** Detalha um mês em dias com saldo diário projetado. */
export function buildDailyDetail(
  monthBucket: MonthBucket,
  recurring: RecurringRevenue[],
  filters: CashflowFilters,
  openingBalanceMonth: number,
): DayBucket[] {
  const scenario = SCENARIOS[filters.scenario];
  const year = monthBucket.monthDate.getFullYear();
  const month = monthBucket.monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const days: DayBucket[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date,
      label: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
      in: 0,
      out: 0,
      saldo: 0,
      saldoAcumulado: 0,
      entries: [],
    });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const row of monthBucket.entries) {
    const isPaid = row.status === 'pago' && row.paid_date;
    const ref = isPaid ? row.paid_date! : row.due_date;
    const day = byDate.get(ref);
    if (!day) continue;
    day.entries.push(row);
    const amt = Number(row.amount);
    if (row.entry_type === 'a_receber') {
      day.in += isPaid ? amt : amt * scenario.inFactor;
    } else {
      day.out += isPaid ? amt : amt * scenario.outFactor;
    }
  }

  // recorrentes no dia do mês configurado
  if (!monthBucket.isPast) {
    for (const rec of recurring) {
      if (!rec.active) continue;
      if (filters.companyId !== 'all' && rec.company_id && rec.company_id !== filters.companyId) continue;
      if (filters.categoryId !== 'all' && rec.category_id && rec.category_id !== filters.categoryId) continue;
      const mKey = monthBucket.key + '-01';
      if (mKey < rec.start_month) continue;
      if (rec.end_month && mKey > rec.end_month) continue;
      const dayNum = Math.min(Math.max(1, rec.day_of_month), lastDay);
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const day = byDate.get(date);
      if (day) day.in += Number(rec.amount) * scenario.inFactor;
    }
  }

  let acc = openingBalanceMonth;
  for (const d of days) {
    d.saldo = d.in - d.out;
    acc += d.saldo;
    d.saldoAcumulado = acc;
  }
  return days;
}

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const fmtBRLDetail = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export function useCashflowFilters() {
  const [filters, setFilters] = useState<CashflowFilters>(defaultCashflowFilters);
  return useMemo(() => ({ filters, setFilters }), [filters]);
}
