import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EntryRow, CategoryRow, CompanyRow } from './useFinanceReports';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

export interface ExecKpi {
  current: number;
  previous: number;
  target?: number;
  deltaPct: number;       // variação vs anterior
  targetPct?: number;     // % meta (current / target)
}

export interface ExecKpis {
  faturamento: ExecKpi;
  margem: ExecKpi;            // resultado / receitas
  giroCaixa: ExecKpi;          // entradas - saídas no mês
  inadimplencia: ExecKpi;      // % a_receber vencido sobre total a_receber
}

export interface CompanyResultLine {
  companyId: string;
  companyName: string;
  monthly: { label: string; resultado: number; receitas: number; despesas: number }[];
  totalResultado: number;
}

export interface SeasonalityPoint {
  monthLabel: string; // jan..dez
  monthIndex: number;
  receitas: number;
  despesas: number;
}

export interface CategoryShare {
  id: string;
  name: string;
  total: number;
  pct: number;
  color: string;
}

export interface DayOfWeekStat {
  dayIndex: number; // 0 dom .. 6 sáb
  dayLabel: string;
  total: number;
  count: number;
}

export interface StrategicAlert {
  id: string;
  level: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description: string;
}

export interface ExecutiveAnalytics {
  kpis: ExecKpis;
  companyResults: CompanyResultLine[];
  seasonality: SeasonalityPoint[];
  topExpenseCategories: CategoryShare[];
  bestReceivableDay: DayOfWeekStat | null;
  worstPaymentDay: DayOfWeekStat | null;
  alerts: StrategicAlert[];
  yoy: {
    receitasAtual: number;
    receitasAnoAnterior: number;
    despesasAtual: number;
    despesasAnoAnterior: number;
    deltaReceitas: number;
    deltaDespesas: number;
  };
  context: {
    monthLabel: string;
    monthStart: string;
    monthEnd: string;
  };
}

export interface ExecutiveTargets {
  monthly_revenue: number;
  monthly_margin_pct: number;
  monthly_cashflow: number;
  monthly_inadimplencia_pct: number;
}

const TARGETS_KEY = 'finance.exec.targets';
const DEFAULT_TARGETS: ExecutiveTargets = {
  monthly_revenue: 100000,
  monthly_margin_pct: 20,
  monthly_cashflow: 30000,
  monthly_inadimplencia_pct: 5,
};

export function loadTargets(): ExecutiveTargets {
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    if (raw) return { ...DEFAULT_TARGETS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_TARGETS;
}

export function saveTargets(t: ExecutiveTargets) {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(t));
}

/* -------------------------------------------------------------------------- */
/*  Helpers de data                                                            */
/* -------------------------------------------------------------------------- */

const DAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const isoMonthRange = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return { start, end };
};

const safeDelta = (curr: number, prev: number): number => {
  if (prev === 0) return curr === 0 ? 0 : 1;
  return (curr - prev) / Math.abs(prev);
};

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useExecutiveAnalytics(referenceDate: Date = new Date()) {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [targets, setTargetsState] = useState<ExecutiveTargets>(loadTargets);
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
    setEntries((e.data ?? []) as EntryRow[]);
    setCategories((c.data ?? []) as CategoryRow[]);
    setCompanies((co.data ?? []) as CompanyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateTargets = useCallback((t: ExecutiveTargets) => {
    saveTargets(t);
    setTargetsState(t);
  }, []);

  const analytics: ExecutiveAnalytics = useMemo(() => {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth();
    const curr = isoMonthRange(year, month);
    const prev = isoMonthRange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
    const lastYear = isoMonthRange(year - 1, month);

    const inMonth = (start: string, end: string) =>
      entries.filter((row) => {
        if (row.status === 'cancelado') return false;
        const ref = row.paid_date ?? row.due_date;
        return ref >= start && ref <= end;
      });

    const currEntries = inMonth(curr.start, curr.end);
    const prevEntries = inMonth(prev.start, prev.end);
    const yoyEntries = inMonth(lastYear.start, lastYear.end);

    const sumByType = (rows: EntryRow[]) => {
      let receitas = 0;
      let despesas = 0;
      let recebidoEntradas = 0;
      let recebidoSaidas = 0;
      for (const r of rows) {
        if (r.entry_type === 'a_receber') {
          receitas += Number(r.amount);
          if (r.status === 'pago') recebidoEntradas += Number(r.amount);
        } else {
          despesas += Number(r.amount);
          if (r.status === 'pago') recebidoSaidas += Number(r.amount);
        }
      }
      return { receitas, despesas, recebidoEntradas, recebidoSaidas };
    };

    const c = sumByType(currEntries);
    const p = sumByType(prevEntries);
    const y = sumByType(yoyEntries);

    const margemCurr = c.receitas > 0 ? (c.receitas - c.despesas) / c.receitas : 0;
    const margemPrev = p.receitas > 0 ? (p.receitas - p.despesas) / p.receitas : 0;

    const giroCurr = c.recebidoEntradas - c.recebidoSaidas;
    const giroPrev = p.recebidoEntradas - p.recebidoSaidas;

    // Inadimplência: a_receber vencidos / total a_receber do mês
    const recebivelTotal = currEntries.filter((r) => r.entry_type === 'a_receber');
    const recebivelVencido = recebivelTotal.filter((r) => r.status === 'vencido');
    const totalRec = recebivelTotal.reduce((s, r) => s + Number(r.amount), 0);
    const totalVencido = recebivelVencido.reduce((s, r) => s + Number(r.amount), 0);
    const inadimpCurr = totalRec > 0 ? totalVencido / totalRec : 0;

    const recebivelTotalP = prevEntries.filter((r) => r.entry_type === 'a_receber');
    const recebivelVencidoP = recebivelTotalP.filter((r) => r.status === 'vencido');
    const totalRecP = recebivelTotalP.reduce((s, r) => s + Number(r.amount), 0);
    const totalVencidoP = recebivelVencidoP.reduce((s, r) => s + Number(r.amount), 0);
    const inadimpPrev = totalRecP > 0 ? totalVencidoP / totalRecP : 0;

    const kpis: ExecKpis = {
      faturamento: {
        current: c.receitas,
        previous: p.receitas,
        target: targets.monthly_revenue,
        deltaPct: safeDelta(c.receitas, p.receitas),
        targetPct: targets.monthly_revenue > 0 ? c.receitas / targets.monthly_revenue : 0,
      },
      margem: {
        current: margemCurr,
        previous: margemPrev,
        target: targets.monthly_margin_pct / 100,
        deltaPct: safeDelta(margemCurr, margemPrev),
        targetPct: targets.monthly_margin_pct > 0 ? margemCurr / (targets.monthly_margin_pct / 100) : 0,
      },
      giroCaixa: {
        current: giroCurr,
        previous: giroPrev,
        target: targets.monthly_cashflow,
        deltaPct: safeDelta(giroCurr, giroPrev),
        targetPct: targets.monthly_cashflow > 0 ? giroCurr / targets.monthly_cashflow : 0,
      },
      inadimplencia: {
        current: inadimpCurr,
        previous: inadimpPrev,
        target: targets.monthly_inadimplencia_pct / 100,
        deltaPct: safeDelta(inadimpCurr, inadimpPrev),
        targetPct:
          targets.monthly_inadimplencia_pct > 0
            ? inadimpCurr / (targets.monthly_inadimplencia_pct / 100)
            : 0,
      },
    };

    /* ---------------- Resultado por empresa (12 meses) ----------------- */
    const months: { key: string; label: string; year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(year, month - i, 1));
      months.push({
        key: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`,
        label: `${MES[dt.getUTCMonth()]}/${String(dt.getUTCFullYear()).slice(-2)}`,
        year: dt.getUTCFullYear(),
        month: dt.getUTCMonth(),
      });
    }

    const companyMap = new Map<string, CompanyResultLine>();
    const ensureCompany = (id: string | null) => {
      const cid = id ?? 'sem-empresa';
      let line = companyMap.get(cid);
      if (!line) {
        line = {
          companyId: cid,
          companyName:
            companies.find((co) => co.id === id)?.name ?? 'Sem empresa',
          monthly: months.map((m) => ({ label: m.label, resultado: 0, receitas: 0, despesas: 0 })),
          totalResultado: 0,
        };
        companyMap.set(cid, line);
      }
      return line;
    };

    for (const r of entries) {
      if (r.status === 'cancelado') continue;
      const ref = r.paid_date ?? r.due_date;
      const idx = months.findIndex((m) => ref.startsWith(m.key));
      if (idx === -1) continue;
      const line = ensureCompany(r.company_id);
      const amt = Number(r.amount);
      if (r.entry_type === 'a_receber') {
        line.monthly[idx].receitas += amt;
        line.monthly[idx].resultado += amt;
        line.totalResultado += amt;
      } else {
        line.monthly[idx].despesas += amt;
        line.monthly[idx].resultado -= amt;
        line.totalResultado -= amt;
      }
    }

    const companyResults = Array.from(companyMap.values()).sort(
      (a, b) => b.totalResultado - a.totalResultado,
    );

    /* ---------------- Sazonalidade (ano corrente) ---------------------- */
    const seasonality: SeasonalityPoint[] = MES.map((label, idx) => ({
      monthLabel: label,
      monthIndex: idx,
      receitas: 0,
      despesas: 0,
    }));
    for (const r of entries) {
      if (r.status === 'cancelado') continue;
      const ref = r.paid_date ?? r.due_date;
      const dt = new Date(ref + 'T00:00:00Z');
      if (dt.getUTCFullYear() !== year) continue;
      const idx = dt.getUTCMonth();
      const amt = Number(r.amount);
      if (r.entry_type === 'a_receber') seasonality[idx].receitas += amt;
      else seasonality[idx].despesas += amt;
    }

    /* ---------------- Top 10 categorias de despesa --------------------- */
    const expenseByCat = new Map<string, number>();
    for (const r of currEntries) {
      if (r.entry_type !== 'a_pagar') continue;
      const id = r.category_id ?? 'sem-categoria';
      expenseByCat.set(id, (expenseByCat.get(id) ?? 0) + Number(r.amount));
    }
    const totalExp = Array.from(expenseByCat.values()).reduce((s, v) => s + v, 0);
    const palette = [
      'hsl(var(--primary))',
      'hsl(var(--destructive))',
      '#f59e0b',
      '#10b981',
      '#3b82f6',
      '#a855f7',
      '#ef4444',
      '#14b8a6',
      '#eab308',
      '#6366f1',
    ];
    const topExpenseCategories: CategoryShare[] = Array.from(expenseByCat.entries())
      .map(([id, total], i) => ({
        id,
        name: categories.find((c) => c.id === id)?.name ?? 'Sem categoria',
        total,
        pct: totalExp > 0 ? total / totalExp : 0,
        color: categories.find((c) => c.id === id)?.color ?? palette[i % palette.length],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    /* ---------------- Dia da semana ideal ------------------------------ */
    const dowReceive: DayOfWeekStat[] = DAY_LABELS.map((d, i) => ({
      dayIndex: i,
      dayLabel: d,
      total: 0,
      count: 0,
    }));
    const dowPay: DayOfWeekStat[] = DAY_LABELS.map((d, i) => ({
      dayIndex: i,
      dayLabel: d,
      total: 0,
      count: 0,
    }));
    for (const r of entries) {
      if (r.status !== 'pago' || !r.paid_date) continue;
      const dt = new Date(r.paid_date + 'T00:00:00Z');
      const dow = dt.getUTCDay();
      const arr = r.entry_type === 'a_receber' ? dowReceive : dowPay;
      arr[dow].total += Number(r.amount);
      arr[dow].count += 1;
    }
    const bestReceivableDay = dowReceive.reduce<DayOfWeekStat | null>(
      (best, cur) => (!best || cur.total > best.total ? cur : best),
      null,
    );
    const worstPaymentDay = dowPay.reduce<DayOfWeekStat | null>(
      (best, cur) => (!best || cur.total > best.total ? cur : best),
      null,
    );

    /* ---------------- Alertas estratégicos ----------------------------- */
    const alerts: StrategicAlert[] = [];

    if (kpis.faturamento.targetPct !== undefined && kpis.faturamento.targetPct < 0.8) {
      alerts.push({
        id: 'meta-fat',
        level: 'warning',
        title: 'Meta de faturamento em risco',
        description: `Atingido ${(kpis.faturamento.targetPct * 100).toFixed(0)}% da meta mensal.`,
      });
    }
    if (kpis.margem.current < 0) {
      alerts.push({
        id: 'margem-neg',
        level: 'danger',
        title: 'Margem líquida negativa',
        description: 'As despesas superaram as receitas no período. Revise custos urgentemente.',
      });
    }
    if (kpis.inadimplencia.current > (targets.monthly_inadimplencia_pct / 100)) {
      alerts.push({
        id: 'inadimp',
        level: 'warning',
        title: 'Inadimplência acima do limite',
        description: `${(kpis.inadimplencia.current * 100).toFixed(1)}% dos recebíveis estão vencidos (limite ${targets.monthly_inadimplencia_pct}%).`,
      });
    }
    if (p.despesas > 0 && safeDelta(c.despesas, p.despesas) > 0.15) {
      alerts.push({
        id: 'gasto-anormal',
        level: 'warning',
        title: 'Gasto anômalo identificado',
        description: `Despesas cresceram ${((c.despesas - p.despesas) / p.despesas * 100).toFixed(0)}% vs o mês anterior.`,
      });
    }
    // Top categoria > 30% do total
    if (topExpenseCategories[0]?.pct > 0.3) {
      alerts.push({
        id: 'concentracao',
        level: 'info',
        title: 'Concentração de despesas',
        description: `${topExpenseCategories[0].name} representa ${(topExpenseCategories[0].pct * 100).toFixed(0)}% das saídas — avalie diversificação ou negociação.`,
      });
    }
    if (kpis.giroCaixa.current > 0 && kpis.giroCaixa.deltaPct > 0.1) {
      alerts.push({
        id: 'giro-up',
        level: 'success',
        title: 'Giro de caixa em alta',
        description: `Saldo de caixa cresceu ${(kpis.giroCaixa.deltaPct * 100).toFixed(0)}% vs o mês anterior.`,
      });
    }

    return {
      kpis,
      companyResults,
      seasonality,
      topExpenseCategories,
      bestReceivableDay,
      worstPaymentDay,
      alerts,
      yoy: {
        receitasAtual: c.receitas,
        receitasAnoAnterior: y.receitas,
        despesasAtual: c.despesas,
        despesasAnoAnterior: y.despesas,
        deltaReceitas: safeDelta(c.receitas, y.receitas),
        deltaDespesas: safeDelta(c.despesas, y.despesas),
      },
      context: {
        monthLabel: `${MES[month]}/${year}`,
        monthStart: curr.start,
        monthEnd: curr.end,
      },
    };
  }, [entries, categories, companies, targets, referenceDate]);

  return {
    loading,
    analytics,
    targets,
    updateTargets,
    reload: load,
  };
}
