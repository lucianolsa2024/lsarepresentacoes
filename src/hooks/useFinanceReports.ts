import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EntryRow = {
  id: string;
  entry_type: 'a_pagar' | 'a_receber';
  description: string;
  amount: number;
  due_date: string;       // ISO yyyy-mm-dd
  paid_date: string | null;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  category_id: string | null;
  company_id: string | null;
  counterparty: string | null;
};

export type CategoryRow = {
  id: string;
  name: string;
  category_type: 'despesa' | 'receita' | 'ambos';
  color: string | null;
};

export type CompanyRow = {
  id: string;
  name: string;
  entity_type: 'pj' | 'pf';
};

export interface ReportFilters {
  start: string; // ISO yyyy-mm-dd
  end: string;   // ISO yyyy-mm-dd
  companyId: string | 'all';
  /** base de cálculo: 'caixa' usa paid_date; 'competencia' usa due_date */
  basis: 'caixa' | 'competencia';
}

const monthStartISO = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
const monthEndISO = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

export const defaultReportFilters = (): ReportFilters => ({
  start: monthStartISO(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1))),
  end: monthEndISO(),
  companyId: 'all',
  basis: 'competencia',
});

export function useFinanceReports() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, c, co] = await Promise.all([
      supabase
        .from('finance_entries')
        .select('id,entry_type,description,amount,due_date,paid_date,status,category_id,company_id,counterparty')
        .order('due_date', { ascending: true }),
      supabase.from('finance_categories').select('id,name,category_type,color').eq('active', true),
      supabase.from('finance_companies').select('id,name,entity_type').eq('active', true).order('name'),
    ]);
    if (e.error || c.error || co.error) {
      toast.error('Erro ao carregar dados de relatórios');
    }
    setEntries((e.data ?? []) as EntryRow[]);
    setCategories((c.data ?? []) as CategoryRow[]);
    setCompanies((co.data ?? []) as CompanyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, categories, companies, loading, reload: load };
}

/** Filtra entradas pelo período e empresa, considerando a base (caixa/competência). */
export function filterEntries(entries: EntryRow[], f: ReportFilters): EntryRow[] {
  return entries.filter((row) => {
    if (row.status === 'cancelado') return false;
    if (f.companyId !== 'all' && row.company_id !== f.companyId) return false;

    const refDate =
      f.basis === 'caixa' ? row.paid_date : row.due_date;
    if (!refDate) return false;
    return refDate >= f.start && refDate <= f.end;
  });
}

/** Agrupa por mês (YYYY-MM) somando entradas/saídas. */
export interface MonthlyBucket {
  key: string;           // YYYY-MM
  label: string;         // mmm/aa
  receitas: number;
  despesas: number;
  resultado: number;
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function groupByMonth(entries: EntryRow[], f: ReportFilters): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();
  // pré-popula meses do range para garantir continuidade
  const start = new Date(f.start + 'T00:00:00Z');
  const end = new Date(f.end + 'T00:00:00Z');
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = `${MES[cursor.getUTCMonth()]}/${String(cursor.getUTCFullYear()).slice(-2)}`;
    map.set(k, { key: k, label, receitas: 0, despesas: 0, resultado: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  for (const row of entries) {
    const ref = f.basis === 'caixa' ? row.paid_date : row.due_date;
    if (!ref) continue;
    const k = ref.slice(0, 7);
    const bucket = map.get(k);
    if (!bucket) continue;
    if (row.entry_type === 'a_receber') bucket.receitas += Number(row.amount);
    else bucket.despesas += Number(row.amount);
    bucket.resultado = bucket.receitas - bucket.despesas;
  }

  return Array.from(map.values());
}

/** Estrutura de DRE: receitas, despesas por categoria e resultado. */
export interface DreLine {
  id: string;            // category_id ou 'sem-categoria'
  name: string;
  total: number;
  entries: EntryRow[];
}

export interface DreReport {
  receitas: DreLine[];
  despesas: DreLine[];
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  margem: number;        // resultado / receitas
}

export function buildDre(
  entries: EntryRow[],
  categories: CategoryRow[],
): DreReport {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const receitasMap = new Map<string, DreLine>();
  const despesasMap = new Map<string, DreLine>();

  const ensure = (m: Map<string, DreLine>, id: string, name: string): DreLine => {
    let line = m.get(id);
    if (!line) {
      line = { id, name, total: 0, entries: [] };
      m.set(id, line);
    }
    return line;
  };

  for (const row of entries) {
    const target = row.entry_type === 'a_receber' ? receitasMap : despesasMap;
    const catId = row.category_id ?? 'sem-categoria';
    const catName =
      (row.category_id && catMap.get(row.category_id)?.name) ||
      (row.entry_type === 'a_receber' ? 'Outras receitas' : 'Sem categoria');
    const line = ensure(target, catId, catName);
    line.total += Number(row.amount);
    line.entries.push(row);
  }

  const receitas = Array.from(receitasMap.values()).sort((a, b) => b.total - a.total);
  const despesas = Array.from(despesasMap.values()).sort((a, b) => b.total - a.total);
  const totalReceitas = receitas.reduce((s, l) => s + l.total, 0);
  const totalDespesas = despesas.reduce((s, l) => s + l.total, 0);
  const resultado = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? resultado / totalReceitas : 0;

  return { receitas, despesas, totalReceitas, totalDespesas, resultado, margem };
}

/** Fluxo de caixa: realizado (status=pago) + projetado (pendente/vencido) por mês. */
export interface CashflowBucket {
  key: string;
  label: string;
  realizadoEntradas: number;
  realizadoSaidas: number;
  projetadoEntradas: number;
  projetadoSaidas: number;
  saldoMes: number;
  saldoAcumulado: number;
}

export function buildCashflow(entries: EntryRow[], f: ReportFilters, openingBalance = 0): CashflowBucket[] {
  const buckets = new Map<string, CashflowBucket>();
  const start = new Date(f.start + 'T00:00:00Z');
  const end = new Date(f.end + 'T00:00:00Z');
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = `${MES[cursor.getUTCMonth()]}/${String(cursor.getUTCFullYear()).slice(-2)}`;
    buckets.set(k, {
      key: k,
      label,
      realizadoEntradas: 0,
      realizadoSaidas: 0,
      projetadoEntradas: 0,
      projetadoSaidas: 0,
      saldoMes: 0,
      saldoAcumulado: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  for (const row of entries) {
    const isPaid = row.status === 'pago' && row.paid_date;
    const ref = isPaid ? row.paid_date! : row.due_date;
    const k = ref.slice(0, 7);
    const b = buckets.get(k);
    if (!b) continue;
    if (row.entry_type === 'a_receber') {
      if (isPaid) b.realizadoEntradas += Number(row.amount);
      else b.projetadoEntradas += Number(row.amount);
    } else {
      if (isPaid) b.realizadoSaidas += Number(row.amount);
      else b.projetadoSaidas += Number(row.amount);
    }
  }

  let acc = openingBalance;
  const list = Array.from(buckets.values());
  for (const b of list) {
    b.saldoMes =
      b.realizadoEntradas + b.projetadoEntradas - b.realizadoSaidas - b.projetadoSaidas;
    acc += b.saldoMes;
    b.saldoAcumulado = acc;
  }
  return list;
}

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const fmtBRLDetail = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
export const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function useReportFilters() {
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  return useMemo(() => ({ filters, setFilters }), [filters]);
}
