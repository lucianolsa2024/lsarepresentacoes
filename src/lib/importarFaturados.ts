// ============================================================
// importarFaturados.ts
// Parsing do Excel de Relatório de Faturados (ERP) + geração de parcelas
// ============================================================

import * as XLSX from 'xlsx';
import { parseCondPgto } from './importarPedidos';

// --------------- TIPOS ---------------

export interface FaturadoLinha {
  tipo_pedido: string;
  tabela_preco: string;
  dt_emissao: string | null;
  dt_fat: string | null;
  cliente: string;
  cond_pgto: string;
  tecido: string | null;
  oc: string | null;
  comp_prof: string | null;
  numero_pedido: number;
  numero_nf: number | null;
  representante: string;
  produto_completo: string;
  dt_cli: string | null;
  qtde: number | null;
  valor: number;
}

export interface FaturadoAgrupado {
  numero_pedido: number;
  numero_nf: number;
  dt_fat: string;
  cond_pgto: string;
  tabela_preco: string;
  representante: string;
  cliente: string;
  valor_total: number;
}

export interface ParcelaComissao {
  numero_pedido: string;
  numero_nf: string;
  cliente: string;
  representante: string;
  tabela_preco: string;
  cond_pgto: string;
  dt_fat: string;
  parcela_idx: number;
  total_parcelas: number;
  vencimento: string;
  valor_parcela: number;
  taxa_comissao: number;
  comissao_calculada: number;
  status_parcela: string;
  status_conciliacao: string;
}

export interface ImportFaturadosResult {
  linhas: FaturadoLinha[];
  totalLinhas: number;
  erros: string[];
}

export interface ProcessamentoResult {
  linhasLidas: number;
  pedidosFaturados: number;
  statusAtualizados: number;
  somenteComissao: number;
  parcelasCriadas: number;
  totalComissao: number;
  duplicatasIgnoradas: number;
}

// --------------- HELPERS ---------------

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return Math.round(n);
}

function toFloat(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  if (isNaN(n)) return 0;
  return n;
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).trim();

  // Formato brasileiro DD/MM/AAAA
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    const iso = `${year}-${month}-${day}`;
    return iso === '2027-12-31' ? null : iso;
  }

  // Serial numérico do Excel
  if (!isNaN(Number(str)) && Number(str) > 1000) {
    const ms = (Number(str) - 25569) * 86400 * 1000;
    const iso = new Date(ms).toISOString().split('T')[0];
    return iso === '2027-12-31' ? null : iso;
  }

  // ISO ou outro formato reconhecido
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  const iso = d.toISOString().split('T')[0];
  return iso === '2027-12-31' ? null : iso;
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' || s === 'NaN' ? null : s;
}

// --------------- COMISSÃO ---------------

const COMISSAO: Record<string, number> = {
  DIAMANTE: 0.10,
  OURO: 0.08,
  PRATA: 0.06,
  BRONZE: 0.04,
};

function getTaxa(tabelaPreco: string): number {
  const key = (tabelaPreco || '').toUpperCase().trim();
  for (const [name, rate] of Object.entries(COMISSAO)) {
    if (key.includes(name)) return rate;
  }
  return 0;
}

export function gerarParcelas(pedido: FaturadoAgrupado): ParcelaComissao[] {
  const taxa = getTaxa(pedido.tabela_preco);
  const dias = parseCondPgto(pedido.cond_pgto);
  const n = dias.length;
  const vp = Math.round((pedido.valor_total / n) * 100) / 100;
  const cp = Math.round(vp * taxa * 100) / 100;

  return dias.map((d, i) => {
    const venc = new Date(pedido.dt_fat + 'T00:00:00');
    venc.setDate(venc.getDate() + d);
    return {
      numero_pedido: String(pedido.numero_pedido),
      numero_nf: String(pedido.numero_nf),
      cliente: pedido.cliente,
      representante: pedido.representante,
      tabela_preco: pedido.tabela_preco,
      cond_pgto: pedido.cond_pgto,
      dt_fat: pedido.dt_fat,
      parcela_idx: i + 1,
      total_parcelas: n,
      vencimento: venc.toISOString().split('T')[0],
      valor_parcela: vp,
      taxa_comissao: taxa,
      comissao_calculada: cp,
      status_parcela: 'pendente',
      status_conciliacao: 'nao_conciliado',
    };
  });
}

// --------------- PARSING DO EXCEL ---------------

export async function importarFaturadosExcel(file: File): Promise<ImportFaturadosResult> {
  const erros: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
  });

  const linhas: FaturadoLinha[] = [];

  raw.forEach((row, idx) => {
    try {
      const numeroPedido = toInt(row['NUMERO PEDIDO']);
      const valor = toFloat(row['VALOR ( R$ )']);

      if (!numeroPedido) return; // skip totalizadores
      if (valor === 0) return;

      linhas.push({
        tipo_pedido: toStr(row['TIPO PEDIDO']) ?? '',
        tabela_preco: toStr(row['TABELA DE PREÇO']) ?? toStr(row['TABELA DE PRECO']) ?? '',
        dt_emissao: parseDate(row['DT EMISSAO']),
        dt_fat: parseDate(row['DT FAT']),
        cliente: toStr(row['CLIENTE']) ?? '',
        cond_pgto: toStr(row['COND PGTO']) ?? '',
        tecido: toStr(row['TECIDO']),
        oc: toStr(row['OC']),
        comp_prof: toStr(row['COMP + PROF']),
        numero_pedido: numeroPedido,
        numero_nf: toInt(row['NUMERO NF']),
        representante: toStr(row['REPRESENTANTE PF']) ?? '',
        produto_completo: toStr(row['PRODUTO COMPLETO']) ?? '',
        dt_cli: parseDate(row['DT CLI']),
        qtde: toInt(row['QTDE ( # )']),
        valor,
      });
    } catch (e) {
      erros.push(`Linha ${idx + 2}: erro — ${String(e)}`);
    }
  });

  return {
    linhas,
    totalLinhas: linhas.length,
    erros,
  };
}

// --------------- AGRUPAMENTO ---------------

export function agruparPorPedido(linhas: FaturadoLinha[]): FaturadoAgrupado[] {
  const map = new Map<string, FaturadoAgrupado>();

  for (const l of linhas) {
    if (!l.numero_nf || !l.dt_fat) continue;

    const key = [
      l.numero_pedido,
      l.numero_nf,
      l.dt_fat,
      l.cond_pgto,
      l.tabela_preco,
      l.representante,
      l.cliente,
    ].join('||');

    const existing = map.get(key);
    if (existing) {
      existing.valor_total += l.valor;
    } else {
      map.set(key, {
        numero_pedido: l.numero_pedido,
        numero_nf: l.numero_nf!,
        dt_fat: l.dt_fat!,
        cond_pgto: l.cond_pgto,
        tabela_preco: l.tabela_preco,
        representante: l.representante,
        cliente: l.cliente,
        valor_total: l.valor,
      });
    }
  }

  return Array.from(map.values());
}
