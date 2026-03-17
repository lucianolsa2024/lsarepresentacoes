import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/components/ui/sonner';
import { Upload, DollarSign, TrendingUp, Clock, AlertTriangle, ChevronDown, ChevronRight, FileCheck, Download, CheckCircle, AlertCircle, FileText, Clock4, CheckSquare } from 'lucide-react';
import ExcelJS from 'exceljs';
import { format, addDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  parseFoccoERPPDF,
  conciliarComissoes,
  extractTextFromPDF,
  type ConciliacaoResult,
  type ParcelaConciliada,
  type ConciliacaoStatus,
} from '@/lib/commissionReconciliation';
import { importarPedidosExcel, chaveDuplicata, type PedidoLinha } from '@/lib/importarPedidos';

// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── Types ──

interface CommissionEntry {
  id?: string;
  tipo_pedido: string;
  tabela_preco: string;
  dt_emissao: string;
  dt_fat: string;
  cliente: string;
  cond_pgto: string;
  numero_pedido: string;
  numero_nf: string;
  representante_pf: string;
  produto_completo: string;
  valor: number;
}

interface Installment {
  index: number;
  total: number;
  dueDate: Date;
  value: number;
  rate: number;
  commission: number;
}

interface GroupedOrder {
  key: string;
  numero_pedido: string;
  numero_nf: string;
  cliente: string;
  representante_pf: string;
  tabela_preco: string;
  dt_fat: string;
  cond_pgto: string;
  valor_total: number;
  installments: Installment[];
  total_commission: number;
}

interface DuplicateInfo {
  numero_pedido: string;
  numero_nf: string;
  produto_completo: string;
  valor: number;
}

// ── Constants ──

const COMMISSION_RATES: Record<string, number> = {
  DIAMANTE: 0.10,
  OURO: 0.08,
  PRATA: 0.06,
  BRONZE: 0.04,
};

const TABLE_BADGE_COLORS: Record<string, string> = {
  DIAMANTE: 'bg-purple-500 text-white',
  OURO: 'bg-yellow-500 text-black',
  PRATA: 'bg-gray-400 text-white',
  BRONZE: 'bg-orange-500 text-white',
};

const PAID_STORAGE_KEY = 'commission_paid_installments';

// ── Helpers ──

function getRate(tabela: string): number {
  const key = (tabela || '').toUpperCase().trim();
  for (const [name, rate] of Object.entries(COMMISSION_RATES)) {
    if (key.includes(name)) return rate;
  }
  return 0;
}

function parseInstallments(condPgto: string, dtFat: string, valorTotal: number, rate: number): Installment[] {
  const cond = (condPgto || '').toUpperCase().trim();
  const fatDate = parseISO(dtFat);

  if (cond.includes('A VISTA') || cond.includes('100%') || cond === 'BLU A VISTA' || cond.includes('100% PEDIDO')) {
    const value = valorTotal;
    return [{ index: 1, total: 1, dueDate: fatDate, value, rate, commission: value * rate }];
  }

  const numbers = cond.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return [{ index: 1, total: 1, dueDate: fatDate, value: valorTotal, rate, commission: valorTotal * rate }];
  }

  const days = numbers.map(Number);
  const n = days.length;
  const parcValue = valorTotal / n;

  return days.map((d, i) => ({
    index: i + 1,
    total: n,
    dueDate: addDays(fatDate, d),
    value: parcValue,
    rate,
    commission: parcValue * rate,
  }));
}


const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

// ── Reconciliation status helpers ──

const STATUS_CONFIG: Record<ConciliacaoStatus, { icon: React.ReactNode; label: string; className: string }> = {
  conciliado: { icon: <CheckCircle className="h-4 w-4" />, label: 'Conciliado', className: 'bg-green-500 text-white' },
  divergencia: { icon: <AlertCircle className="h-4 w-4" />, label: 'Divergência', className: 'bg-yellow-500 text-black' },
  somente_pdf: { icon: <FileText className="h-4 w-4" />, label: 'Somente PDF', className: 'bg-blue-500 text-white' },
  somente_excel: { icon: <Clock4 className="h-4 w-4" />, label: 'Somente Excel', className: 'bg-gray-400 text-white' },
};

// ── Paid installments persistence ──

function loadPaidInstallments(): Set<string> {
  try {
    const stored = localStorage.getItem(PAID_STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function savePaidInstallments(paid: Set<string>) {
  localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify([...paid]));
}

// ── Component ──

export function CommissionManager() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Filters
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [filterRep, setFilterRep] = useState<string>('__all__');
  const [filterTabela, setFilterTabela] = useState<string>('__all__');
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // Duplicates dialog
  const [dupsDialogOpen, setDupsDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingImport, setPendingImport] = useState<CommissionEntry[]>([]);

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Reconciliation
  const [conciliacaoResult, setConciliacaoResult] = useState<ConciliacaoResult | null>(null);
  const [conciliacaoMap, setConciliacaoMap] = useState<Map<string, ParcelaConciliada>>(new Map());
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);

  // Manual paid status
  const [paidInstallments, setPaidInstallments] = useState<Set<string>>(loadPaidInstallments);

  const togglePaid = useCallback((nf: string, parcelaIndex: number) => {
    setPaidInstallments(prev => {
      const key = `${nf}|${parcelaIndex}`;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      savePaidInstallments(next);
      return next;
    });
  }, []);

  const isPaid = useCallback((nf: string, parcelaIndex: number) => {
    return paidInstallments.has(`${nf}|${parcelaIndex}`);
  }, [paidInstallments]);

  // ── Load data ──
  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('commission_entries' as any)
      .select('*')
      .order('dt_fat', { ascending: false });
    if (data) {
      setEntries((data as any[]).map((r: any) => ({
        id: r.id,
        tipo_pedido: r.tipo_pedido || '',
        tabela_preco: r.tabela_preco || '',
        dt_emissao: r.dt_emissao || '',
        dt_fat: r.dt_fat || '',
        cliente: r.cliente || '',
        cond_pgto: r.cond_pgto || '',
        numero_pedido: r.numero_pedido || '',
        numero_nf: r.numero_nf || '',
        representante_pf: r.representante_pf || '',
        produto_completo: r.produto_completo || '',
        valor: Number(r.valor) || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  // ── Excel import ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);

    try {
      const result = await importarPedidosExcel(file);

      if (result.erros.length > 0) {
        console.warn('[CommissionManager] Erros no parsing:', result.erros);
      }

      // Convert PedidoLinha[] to CommissionEntry[] (only lines with NF + dt_fat)
      const parsed: CommissionEntry[] = result.linhas
        .filter(l => l.numero_nf !== null && l.dt_fat !== null)
        .map(l => ({
          tipo_pedido: l.tipo_pedido,
          tabela_preco: l.tabela_preco,
          dt_emissao: l.dt_emissao || '',
          dt_fat: l.dt_fat!,
          cliente: l.cliente,
          cond_pgto: l.cond_pgto,
          numero_pedido: String(l.numero_pedido),
          numero_nf: String(l.numero_nf),
          representante_pf: l.representante,
          produto_completo: l.produto_completo,
          valor: l.valor,
        }));

      if (parsed.length === 0) {
        toast.warning(`Nenhum registro elegível (NF + DT FAT preenchidos). ${result.erros.length > 0 ? `${result.erros.length} linha(s) com erro.` : ''}`);
        setImporting(false);
        return;
      }

      const { data: existingEntries, error: existingError } = await supabase
        .from('commission_entries' as any)
        .select('numero_pedido, numero_nf, produto_completo, valor, representante_pf');

      if (existingError) {
        throw new Error('Erro ao verificar registros existentes');
      }

      const existingKeys = new Set(
        ((existingEntries as any[]) || []).map(e => `${e.numero_pedido}|${e.numero_nf}|${e.produto_completo}|${e.valor}|${e.representante_pf}`)
      );

      const dups: DuplicateInfo[] = [];
      const unique: CommissionEntry[] = [];

      for (const p of parsed) {
        const key = `${p.numero_pedido}|${p.numero_nf}|${p.produto_completo}|${p.valor}|${p.representante_pf}`;
        if (existingKeys.has(key)) {
          dups.push({ numero_pedido: p.numero_pedido, numero_nf: p.numero_nf, produto_completo: p.produto_completo, valor: p.valor });
        } else {
          existingKeys.add(key);
          unique.push(p);
        }
      }

      if (dups.length > 0 && unique.length > 0) {
        setDuplicates(dups);
        setPendingImport(unique);
        setDupsDialogOpen(true);
        setImporting(false);
        return;
      }

      if (dups.length > 0 && unique.length === 0) {
        toast.warning(`Todos os ${dups.length} registros já existem no banco.`);
        setImporting(false);
        return;
      }

      await doImport(unique, 0);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar');
      setImporting(false);
    }
  };

  const doImport = async (records: CommissionEntry[], dupsCount: number) => {
    setImporting(true);
    const BATCH = 100;
    let imported = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH).map(r => ({
        tipo_pedido: r.tipo_pedido,
        tabela_preco: r.tabela_preco,
        dt_emissao: r.dt_emissao || null,
        dt_fat: r.dt_fat,
        cliente: r.cliente,
        cond_pgto: r.cond_pgto,
        numero_pedido: r.numero_pedido,
        numero_nf: r.numero_nf,
        representante_pf: r.representante_pf,
        produto_completo: r.produto_completo,
        valor: r.valor,
      }));
      const { error } = await supabase.from('commission_entries' as any).insert(batch);
      if (!error) imported += batch.length;
    }
    toast.success(`${imported} registros importados${dupsCount > 0 ? `, ${dupsCount} duplicatas ignoradas` : ''}.`);
    await fetchEntries();
    setImporting(false);
  };

  const handleDupsConfirm = () => {
    setDupsDialogOpen(false);
    doImport(pendingImport, duplicates.length);
  };

  // ── PDF Reconciliation ──
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setParsingPdf(true);

    try {
      const text = await extractTextFromPDF(file, pdfjsLib);
      console.log('PDF text extracted, length:', text.length);
      console.log('First 2000 chars:', text.substring(0, 2000));

      const pdfResult = parseFoccoERPPDF(text);

      console.log('PDF records found:', pdfResult.records.length);
      if (pdfResult.records.length > 0) {
        console.log('First record:', pdfResult.records[0]);
      }

      if (pdfResult.records.length === 0) {
        toast.warning('Nenhum registro DUP encontrado no PDF. Verifique o formato do arquivo.');
        setParsingPdf(false);
        return;
      }

      // Build parcelas from ALL entries (not just filtered)
      const entryMap = new Map<string, CommissionEntry[]>();
      for (const e of entries) {
        const key = `${e.numero_pedido}|${e.numero_nf}|${e.dt_fat}|${e.cond_pgto}|${e.representante_pf}|${e.cliente}|${e.tabela_preco}`;
        if (!entryMap.has(key)) entryMap.set(key, []);
        entryMap.get(key)!.push(e);
      }

      const allParcelas: Array<{
        numeroPedido: string;
        numeroNF: string;
        cliente: string;
        representante: string;
        tabela: string;
        condPgto: string;
        dtFat: string;
        parcela: string;
        parcelaIdx: number;
        vencimento: string;
        valorParcela: number;
        taxa: number;
        comissaoCalculada: number;
      }> = [];

      for (const [, items] of entryMap) {
        const first = items[0];
        const valorTotal = items.reduce((s, i) => s + i.valor, 0);
        const rate = getRate(first.tabela_preco);
        const installments = parseInstallments(first.cond_pgto, first.dt_fat, valorTotal, rate);
        for (const inst of installments) {
          allParcelas.push({
            numeroPedido: first.numero_pedido,
            numeroNF: first.numero_nf,
            cliente: first.cliente,
            representante: first.representante_pf,
            tabela: first.tabela_preco,
            condPgto: first.cond_pgto,
            dtFat: first.dt_fat,
            parcela: `${inst.index}/${inst.total}`,
            parcelaIdx: inst.index,
            vencimento: format(inst.dueDate, 'dd/MM/yyyy'),
            valorParcela: inst.value,
            taxa: inst.rate,
            comissaoCalculada: inst.commission,
          });
        }
      }

      const resultado = conciliarComissoes(allParcelas, pdfResult);

      // Build lookup map: nf|parcelaIdx -> ParcelaConciliada
      const rMap = new Map<string, ParcelaConciliada>();
      for (const p of resultado.parcelas) {
        rMap.set(`${p.numeroNF}|${p.parcelaIdx}`, p);
      }

      setConciliacaoMap(rMap);
      setConciliacaoResult(resultado);
      setReconciliationDialogOpen(true);
      toast.success(`${pdfResult.records.length} registros extraídos do PDF. Conciliação concluída.`);
    } catch (err: any) {
      console.error('PDF processing error:', err);
      toast.error(err.message || 'Erro ao processar PDF');
    }
    setParsingPdf(false);
  };

  // ── Export reconciliation ──
  const handleExportReconciliation = async () => {
    if (!conciliacaoResult) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Conciliação');

    ws.columns = [
      { header: 'Nº Pedido', key: 'numeroPedido', width: 14 },
      { header: 'NF', key: 'numeroNF', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Representante', key: 'representante', width: 20 },
      { header: 'Parcela', key: 'parcela', width: 10 },
      { header: 'Vencimento', key: 'vencimento', width: 14 },
      { header: 'Valor Parcela', key: 'valorParcela', width: 14 },
      { header: 'Taxa', key: 'taxa', width: 8 },
      { header: 'Comissão Calculada', key: 'comissaoCalculada', width: 18 },
      { header: 'Comissão ERP', key: 'pdf_comLiberada', width: 16 },
      { header: 'Diferença', key: 'diferenca', width: 14 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Cliente PDF', key: 'pdf_cliente', width: 30 },
    ];

    const statusLabels: Record<string, string> = {
      conciliado: '✅ Conciliado',
      divergencia: '⚠️ Divergência',
      somente_pdf: '📋 Somente PDF',
      somente_excel: '🕐 Somente Excel',
    };

    for (const p of conciliacaoResult.parcelas) {
      ws.addRow({
        numeroPedido: p.numeroPedido,
        numeroNF: p.numeroNF,
        cliente: p.cliente,
        representante: p.representante,
        parcela: p.parcela,
        vencimento: p.vencimento,
        valorParcela: p.valorParcela,
        taxa: `${(p.taxa * 100).toFixed(0)}%`,
        comissaoCalculada: p.comissaoCalculada,
        pdf_comLiberada: p.pdf_comLiberada ?? '',
        diferenca: p.diferenca,
        status: statusLabels[p.status] || p.status,
        pdf_cliente: p.pdf_cliente || '',
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacao-comissoes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filter + group ──
  const today = format(new Date(), 'yyyy-MM-dd');

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (e.dt_fat < dateFrom || e.dt_fat > dateTo) return false;
      if (filterRep !== '__all__' && e.representante_pf !== filterRep) return false;
      if (filterTabela !== '__all__') {
        const upper = (e.tabela_preco || '').toUpperCase();
        if (!upper.includes(filterTabela)) return false;
      }
      if (getRate(e.tabela_preco) === 0) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, filterRep, filterTabela]);

  const groupedOrders = useMemo(() => {
    const map = new Map<string, CommissionEntry[]>();
    for (const e of filteredEntries) {
      const key = `${e.numero_pedido}|${e.numero_nf}|${e.dt_fat}|${e.cond_pgto}|${e.representante_pf}|${e.cliente}|${e.tabela_preco}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }

    const result: GroupedOrder[] = [];
    for (const [key, items] of map) {
      const first = items[0];
      const valorTotal = items.reduce((s, i) => s + i.valor, 0);
      const rate = getRate(first.tabela_preco);
      const installments = parseInstallments(first.cond_pgto, first.dt_fat, valorTotal, rate);
      result.push({
        key,
        numero_pedido: first.numero_pedido,
        numero_nf: first.numero_nf,
        cliente: first.cliente,
        representante_pf: first.representante_pf,
        tabela_preco: first.tabela_preco,
        dt_fat: first.dt_fat,
        cond_pgto: first.cond_pgto,
        valor_total: valorTotal,
        installments,
        total_commission: installments.reduce((s, inst) => s + inst.commission, 0),
      });
    }
    return result;
  }, [filteredEntries]);

  // Apply installment status filter + due date filter
  const displayOrders = useMemo(() => {
    return groupedOrders.filter(o => {
      const matchingInstallments = o.installments.filter(inst => {
        const due = format(inst.dueDate, 'yyyy-MM-dd');
        if (dueDateFrom && due < dueDateFrom) return false;
        if (dueDateTo && due > dueDateTo) return false;
        if (filterStatus === 'vencer' && due < today) return false;
        if (filterStatus === 'vencidas' && due >= today) return false;
        if (filterStatus === 'recebidas' && !isPaid(o.numero_nf, inst.index)) return false;
        if (filterStatus === 'pendentes' && isPaid(o.numero_nf, inst.index)) return false;
        return true;
      });
      return matchingInstallments.length > 0;
    });
  }, [groupedOrders, filterStatus, today, dueDateFrom, dueDateTo, isPaid]);

  // Get filtered installments (for summary cards)
  const filteredInstallments = useMemo(() => {
    return displayOrders.flatMap(o =>
      o.installments.filter(inst => {
        const due = format(inst.dueDate, 'yyyy-MM-dd');
        if (dueDateFrom && due < dueDateFrom) return false;
        if (dueDateTo && due > dueDateTo) return false;
        if (filterStatus === 'vencer' && due < today) return false;
        if (filterStatus === 'vencidas' && due >= today) return false;
        if (filterStatus === 'recebidas' && !isPaid(o.numero_nf, inst.index)) return false;
        if (filterStatus === 'pendentes' && isPaid(o.numero_nf, inst.index)) return false;
        return true;
      })
    );
  }, [displayOrders, dueDateFrom, dueDateTo, filterStatus, today, isPaid]);

  // ── Summary cards ──
  const totalFaturado = filteredInstallments.reduce((s, i) => s + i.value, 0);
  const totalComissao = filteredInstallments.reduce((s, i) => s + i.commission, 0);
  const aVencer = filteredInstallments.filter(i => format(i.dueDate, 'yyyy-MM-dd') >= today);
  const vencidas = filteredInstallments.filter(i => format(i.dueDate, 'yyyy-MM-dd') < today);

  // ── Reps list ──
  const reps = useMemo(() => [...new Set(entries.map(e => e.representante_pf))].sort(), [entries]);

  // ── Rep summary ──
  const repSummary = useMemo(() => {
    const map = new Map<string, { pedidos: Set<string>; faturado: number; comissaoTotal: number; rateSum: number; rateCount: number }>();
    for (const o of displayOrders) {
      if (!map.has(o.representante_pf)) map.set(o.representante_pf, { pedidos: new Set(), faturado: 0, comissaoTotal: 0, rateSum: 0, rateCount: 0 });
      const m = map.get(o.representante_pf)!;
      m.pedidos.add(`${o.numero_pedido}|${o.numero_nf}`);
      m.faturado += o.valor_total;
      m.comissaoTotal += o.total_commission;
      const rate = getRate(o.tabela_preco);
      m.rateSum += rate;
      m.rateCount += 1;
    }
    return [...map.entries()].map(([rep, m]) => ({
      rep,
      pedidos: m.pedidos.size,
      faturado: m.faturado,
      taxaMedia: m.rateCount > 0 ? m.rateSum / m.rateCount : 0,
      comissao: m.comissaoTotal,
    })).sort((a, b) => b.faturado - a.faturado);
  }, [displayOrders]);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getTabelaBadge = (tabela: string) => {
    const upper = (tabela || '').toUpperCase();
    for (const [name, cls] of Object.entries(TABLE_BADGE_COLORS)) {
      if (upper.includes(name)) return <Badge className={cls}>{name}</Badge>;
    }
    return <Badge variant="outline">{tabela || '—'}</Badge>;
  };

  // ── Footer totals ──
  const footerValorTotal = displayOrders.reduce((s, o) => s + o.valor_total, 0);
  const footerComissaoTotal = displayOrders.reduce((s, o) => s + o.total_commission, 0);

  const hasReconciliation = conciliacaoMap.size > 0;

  const getInstallmentReconciliation = (nf: string, parcelaIndex: number): ParcelaConciliada | undefined => {
    return conciliacaoMap.get(`${nf}|${parcelaIndex}`);
  };

  const getInstallmentStatus = (nf: string, parcelaIndex: number, dueDate: string, hasRec: boolean, rec?: ParcelaConciliada) => {
    const paid = isPaid(nf, parcelaIndex);
    if (paid) {
      return (
        <Badge className="bg-green-600 text-white">
          <CheckSquare className="h-4 w-4 mr-1" />
          Recebida
        </Badge>
      );
    }
    if (hasRec && rec) {
      return (
        <Badge className={STATUS_CONFIG[rec.status].className}>
          {STATUS_CONFIG[rec.status].icon}
          <span className="ml-1">{STATUS_CONFIG[rec.status].label}</span>
        </Badge>
      );
    }
    if (hasRec && !rec) {
      return (
        <Badge className="bg-gray-400 text-white">
          <Clock4 className="h-4 w-4" />
          <span className="ml-1">Somente Excel</span>
        </Badge>
      );
    }
    // Default status
    const isOverdue = dueDate < today;
    return isOverdue
      ? <Badge variant="destructive">🔴 Vencida</Badge>
      : <Badge className="bg-yellow-500 text-black">🟡 A vencer</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Import buttons */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button disabled={importing} asChild variant="outline">
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importando...' : 'Importar Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} disabled={importing} />
          </label>
        </Button>
        <Button disabled={parsingPdf} asChild variant="outline">
          <label className="cursor-pointer">
            <FileCheck className="h-4 w-4 mr-2" />
            {parsingPdf ? 'Processando...' : 'Conciliar com PDF do ERP'}
            <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={parsingPdf} />
          </label>
        </Button>
        {hasReconciliation && (
          <Button variant="outline" size="sm" onClick={() => setReconciliationDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Ver Conciliação
          </Button>
        )}
        {hasReconciliation && (
          <Button variant="outline" size="sm" onClick={() => { setConciliacaoMap(new Map()); setConciliacaoResult(null); }}>
            Limpar Conciliação
          </Button>
        )}
        {loading && <span className="text-sm text-muted-foreground">Carregando...</span>}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Faturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {fmt(totalFaturado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              {fmt(totalComissao)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parcelas a Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {aVencer.length}
            </div>
            <p className="text-xs text-muted-foreground">{fmt(aVencer.reduce((s, i) => s + i.value, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parcelas Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {vencidas.length}
            </div>
            <p className="text-xs text-muted-foreground">{fmt(vencidas.reduce((s, i) => s + i.value, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-xs">Faturamento - Início</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Faturamento - Fim</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Vencimento - Início</Label>
          <Input type="date" value={dueDateFrom} onChange={e => setDueDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Vencimento - Fim</Label>
          <Input type="date" value={dueDateTo} onChange={e => setDueDateTo(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Representante</Label>
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {reps.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tabela</Label>
          <Select value={filterTabela} onValueChange={setFilterTabela}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              <SelectItem value="DIAMANTE">Diamante</SelectItem>
              <SelectItem value="OURO">Ouro</SelectItem>
              <SelectItem value="PRATA">Prata</SelectItem>
              <SelectItem value="BRONZE">Bronze</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status Parcela</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              <SelectItem value="vencer">A Vencer</SelectItem>
              <SelectItem value="vencidas">Vencidas</SelectItem>
              <SelectItem value="recebidas">Recebidas</SelectItem>
              <SelectItem value="pendentes">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nº Pedido</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Representante</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Dt. Faturamento</TableHead>
              <TableHead>Cond. Pgto</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Parcelas</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
            {displayOrders.map(order => {
              const isOpen = expanded.has(order.key);
              return (
                <Collapsible key={order.key} open={isOpen} onOpenChange={() => toggleExpanded(order.key)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{order.numero_pedido}</TableCell>
                        <TableCell>{order.numero_nf}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{order.cliente}</TableCell>
                        <TableCell>{order.representante_pf}</TableCell>
                        <TableCell>{getTabelaBadge(order.tabela_preco)}</TableCell>
                        <TableCell>{order.dt_fat ? format(parseISO(order.dt_fat), 'dd/MM/yyyy') : '—'}</TableCell>
                        <TableCell>{order.cond_pgto}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(order.valor_total)}</TableCell>
                        <TableCell className="text-center">{order.installments.length}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(order.total_commission)}</TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={11} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Parcela</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead className="text-center">Taxa</TableHead>
                                  <TableHead className="text-right">Comissão Calc.</TableHead>
                                  {hasReconciliation && (
                                    <>
                                      <TableHead className="text-right">Comissão ERP</TableHead>
                                      <TableHead className="text-right">Diferença</TableHead>
                                    </>
                                  )}
                                  <TableHead className="text-center">Status</TableHead>
                                  <TableHead className="text-center w-24">Ação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.installments.map(inst => {
                                  const dueDateStr = format(inst.dueDate, 'yyyy-MM-dd');
                                  const rec = hasReconciliation ? getInstallmentReconciliation(order.numero_nf, inst.index) : undefined;
                                  const rowClass = rec?.status === 'divergencia' ? 'bg-yellow-50 dark:bg-yellow-950/20' : '';
                                  const paid = isPaid(order.numero_nf, inst.index);

                                  return (
                                    <TableRow key={inst.index} className={rowClass}>
                                      <TableCell>{inst.index}/{inst.total}</TableCell>
                                      <TableCell>{format(inst.dueDate, 'dd/MM/yyyy')}</TableCell>
                                      <TableCell className="text-right">{fmt(inst.value)}</TableCell>
                                      <TableCell className="text-center">{fmtPct(inst.rate)}</TableCell>
                                      <TableCell className="text-right">{fmt(inst.commission)}</TableCell>
                                      {hasReconciliation && (
                                        <>
                                          <TableCell className="text-right">
                                            {rec?.pdf_comLiberada != null ? fmt(rec.pdf_comLiberada) : '—'}
                                          </TableCell>
                                          <TableCell className={`text-right ${rec && Math.abs(rec.diferenca) > 0.10 ? 'text-destructive font-medium' : ''}`}>
                                            {rec ? fmt(rec.diferenca) : '—'}
                                          </TableCell>
                                        </>
                                      )}
                                      <TableCell className="text-center">
                                        {getInstallmentStatus(order.numero_nf, inst.index, dueDateStr, hasReconciliation, rec)}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Button
                                          variant={paid ? 'outline' : 'ghost'}
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            togglePaid(order.numero_nf, inst.index);
                                          }}
                                        >
                                          {paid ? 'Desfazer' : 'Dar baixa'}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
          {displayOrders.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={8} className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold">{fmt(footerValorTotal)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold">{fmt(footerComissaoTotal)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Rep summary */}
      {repSummary.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Resumo por Representante</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Representante</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Total Faturado</TableHead>
                  <TableHead className="text-center">Taxa Média</TableHead>
                  <TableHead className="text-right">Total Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repSummary.map(r => (
                  <TableRow key={r.rep}>
                    <TableCell className="font-medium">{r.rep}</TableCell>
                    <TableCell className="text-center">{r.pedidos}</TableCell>
                    <TableCell className="text-right">{fmt(r.faturado)}</TableCell>
                    <TableCell className="text-center">{fmtPct(r.taxaMedia)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.comissao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Duplicates dialog */}
      <Dialog open={dupsDialogOpen} onOpenChange={setDupsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Duplicatas encontradas</DialogTitle>
            <DialogDescription>
              {duplicates.length} registro(s) já existem no banco e serão ignorados.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-auto text-sm space-y-1">
            {duplicates.slice(0, 20).map((d, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                <span>Pedido {d.numero_pedido} / NF {d.numero_nf}</span>
                <span className="text-muted-foreground truncate ml-2 max-w-[200px]">{d.produto_completo}</span>
              </div>
            ))}
            {duplicates.length > 20 && <p className="text-muted-foreground">...e mais {duplicates.length - 20}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupsDialogOpen(false)}>Cancelar importação</Button>
            <Button onClick={handleDupsConfirm}>
              Ignorar duplicatas e importar ({pendingImport.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Summary Dialog */}
      <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Conciliação</DialogTitle>
            <DialogDescription>
              Extrato de Comissões — RCTR0370
            </DialogDescription>
          </DialogHeader>
          {conciliacaoResult && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                {conciliacaoResult.representante && (
                  <p><span className="font-medium">Representante:</span> {conciliacaoResult.representante}</p>
                )}
                {conciliacaoResult.periodo && (
                  <p><span className="font-medium">Período PDF:</span> {conciliacaoResult.periodo}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Conciliados</p>
                    <p className="text-xs text-muted-foreground">
                      {conciliacaoResult.resumo.conciliados} parcelas — {fmt(
                        conciliacaoResult.parcelas
                          .filter(p => p.status === 'conciliado')
                          .reduce((s, p) => s + (p.pdf_comLiberada || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Divergências</p>
                    <p className="text-xs text-muted-foreground">
                      {conciliacaoResult.resumo.divergencias} parcelas — {fmt(
                        Math.abs(conciliacaoResult.parcelas
                          .filter(p => p.status === 'divergencia')
                          .reduce((s, p) => s + p.diferenca, 0))
                      )} de diferença
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Somente no PDF</p>
                    <p className="text-xs text-muted-foreground">{conciliacaoResult.resumo.somentePDF} registros</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Clock4 className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Somente no Excel</p>
                    <p className="text-xs text-muted-foreground">{conciliacaoResult.resumo.somenteExcel} parcelas</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Comissão ERP:</span>
                  <span className="font-medium">{fmt(conciliacaoResult.resumo.totalComissaoPDF)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Comissão Calculada:</span>
                  <span className="font-medium">{fmt(conciliacaoResult.resumo.totalComissaoExcel)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Diferença:</span>
                  <span className={`font-bold ${Math.abs(conciliacaoResult.resumo.diferenca) > 0.10 ? 'text-destructive' : ''}`}>
                    {fmt(conciliacaoResult.resumo.diferenca)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconciliationDialogOpen(false)}>Fechar</Button>
            <Button onClick={handleExportReconciliation}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Conciliação (.xlsx)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
