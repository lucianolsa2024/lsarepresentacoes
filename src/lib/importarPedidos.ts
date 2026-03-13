// ============================================================
// importarPedidos.ts
// Lógica de parsing do Excel de pedidos FoccoERP + deduplicação
// ============================================================

import * as XLSX from 'xlsx';

// --------------- TIPOS ---------------

export interface PedidoLinha {
  tipo_pedido: string;
  tabela_preco: string;
  dt_emissao: string | null;
  dt_fat: string | null;
  cliente: string;
  cond_pgto: string;
  fornecedor: string;
  tecido: string | null;
  oc: string | null;
  comp_prof: string | null;
  numero_pedido: number;
  numero_nf: number | null;
  representante: string;
  produto_completo: string;
  data_entrega: string | null;
  qtde: number | null;
  valor: number;
}

export interface ImportacaoResult {
  linhas: PedidoLinha[];
  totalLinhas: number;
  totalFaturados: number;
  totalSemDataEntrega: number;
  erros: string[];
}

// --------------- HELPERS ---------------

/**
 * Converte número inteiro do Excel (pode vir como 215739.0) para número inteiro.
 * Evita o bug onde "215739.0" não bate com "215739" no banco.
 */
function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return Math.round(n);
}

/**
 * Converte valor numérico do Excel para float (valor monetário, qtde, etc.)
 */
function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return n;
}

/**
 * Converte data do Excel para string ISO (YYYY-MM-DD) ou null.
 * Trata o placeholder 2027-12-31 como "sem data".
 */
function toDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  let iso: string;

  if (typeof value === 'number') {
    // Data serial do Excel → converter para ISO
    // Fórmula: (serial - 25569) dias desde 01/01/1970
    const ms = (value - 25569) * 86400 * 1000;
    iso = new Date(ms).toISOString().split('T')[0];
  } else {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return null;
    iso = d.toISOString().split('T')[0];
  }

  // 2027-12-31 é placeholder de "sem data" no ERP — tratar como null
  return iso === '2027-12-31' ? null : iso;
}

/**
 * Limpa string: remove espaços extras, converte null/undefined para null.
 */
function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' || s === 'NaN' ? null : s;
}

// --------------- PARSING DE COND PGTO ---------------

/**
 * Parseia condição de pagamento e retorna array de dias para cada parcela.
 *
 * Exemplos:
 *   "BLU A VISTA"                          → [0]       (1 parcela, à vista)
 *   "15 DIAS"                              → [15]      (1 parcela, 15 dias)
 *   "30/60/90 DIAS"                        → [30,60,90](3 parcelas)
 *   "50% PEDIDO + 50% FATURAMENTO"         → [0, 30]   (entrada + 30 dias)
 *   "CARTÃO 8X 30/60/90/120/150/180/210/240"→ [30,60,90,120,150,180,210,240]
 *   "SEM DEBITO/WITHOUT COMMERCIAL VALUE"  → [0]       (sem cobrança)
 */
export function parseCondPgto(cond: string): number[] {
  const upper = (cond ?? '').trim().toUpperCase();

  // Casos à vista / sem cobrança
  if (
    upper === 'BLU A VISTA' ||
    upper === '100% PEDIDO' ||
    upper === 'SEM DEBITO/WITHOUT COMMERCIAL VALUE'
  ) {
    return [0];
  }

  // "50% PEDIDO + 50% FATURAMENTO" → entrada na emissão + 30 dias no faturamento
  if (upper.includes('50% PEDIDO')) {
    return [0, 30];
  }

  // Caso padrão: extrair todos os números da string
  const matches = upper.match(/\d+/g);
  if (matches) {
    const numeros = matches.map(Number);

    // Para "CARTÃO 8X ...", o primeiro número (8) é a quantidade de parcelas — ignorar
    if (upper.startsWith('CARTÃO') || upper.startsWith('CARTAO')) {
      return numeros.slice(1);
    }

    return numeros;
  }

  return [0];
}

// --------------- PROCESSAMENTO DO EXCEL ---------------

/**
 * Lê um arquivo Excel (.xlsx) de pedidos e retorna as linhas normalizadas.
 * Corrige todos os problemas conhecidos de tipagem e colunas novas.
 *
 * @param file - O File object do input do usuário
 */
export async function importarPedidosExcel(file: File): Promise<ImportacaoResult> {
  const erros: string[] = [];

  // Ler o arquivo
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  // Usar a primeira aba (Export)
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converter para JSON (cabeçalho na primeira linha)
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null,
    dateNF: 'yyyy-mm-dd',
  });

  const linhas: PedidoLinha[] = [];

  raw.forEach((row, idx) => {
    try {
      const numeroPedido = toInt(row['NUMERO PEDIDO']);
      const numeroNF = toInt(row['NUMERO NF']);
      const valor = toFloat(row['VALOR ( R$ )']);

      // Validações mínimas
      if (!numeroPedido) {
        erros.push(`Linha ${idx + 2}: NUMERO PEDIDO inválido — linha ignorada`);
        return;
      }
      if (valor === null) {
        erros.push(`Linha ${idx + 2}: VALOR inválido — linha ignorada`);
        return;
      }

      linhas.push({
        tipo_pedido:      toStr(row['TIPO PEDIDO']) ?? '',
        tabela_preco:     toStr(row['TABELA DE PREÇO']) ?? '',
        dt_emissao:       toDate(row['DT EMISSAO']),
        dt_fat:           toDate(row['DT FAT']),
        cliente:          toStr(row['CLIENTE']) ?? '',
        cond_pgto:        toStr(row['COND PGTO']) ?? '',
        fornecedor:       toStr(row['fornecedor']) ?? 'sohome',
        tecido:           toStr(row['TECIDO']),
        oc:               toStr(row['OC']),
        comp_prof:        toStr(row['COMP + PROF']),
        numero_pedido:    numeroPedido,
        numero_nf:        numeroNF,
        representante:    toStr(row['REPRESENTANTE PF']) ?? '',
        produto_completo: toStr(row['PRODUTO COMPLETO']) ?? '',
        data_entrega:     toDate(row['data de entrega']),
        qtde:             toInt(row['QTDE ( # )']),
        valor:            valor,
      });
    } catch (e) {
      erros.push(`Linha ${idx + 2}: erro inesperado — ${String(e)}`);
    }
  });

  return {
    linhas,
    totalLinhas: linhas.length,
    totalFaturados: linhas.filter((l) => l.numero_nf !== null && l.dt_fat !== null).length,
    totalSemDataEntrega: linhas.filter((l) => l.data_entrega === null).length,
    erros,
  };
}

// --------------- DETECÇÃO DE DUPLICATAS ---------------

/**
 * Chave única de uma linha de pedido.
 * Usada para detectar se uma linha já foi importada antes.
 */
export function chaveDuplicata(linha: PedidoLinha): string {
  return [
    linha.numero_pedido,
    linha.numero_nf ?? 'sem_nf',
    linha.produto_completo.toLowerCase().trim(),
    linha.valor.toFixed(2),
    linha.representante.toLowerCase().trim(),
  ].join('|');
}

/**
 * Filtra as linhas novas, removendo as que já existem no banco.
 *
 * @param novas   - Linhas vindas do Excel
 * @param existentes - Chaves já salvas no banco (chamar chaveDuplicata para cada registro existente)
 */
export function filtrarDuplicatas(
  novas: PedidoLinha[],
  existentes: Set<string>
): { unicas: PedidoLinha[]; duplicatas: PedidoLinha[] } {
  const unicas: PedidoLinha[] = [];
  const duplicatas: PedidoLinha[] = [];

  novas.forEach((linha) => {
    if (existentes.has(chaveDuplicata(linha))) {
      duplicatas.push(linha);
    } else {
      unicas.push(linha);
    }
  });

  return { unicas, duplicatas };
}
