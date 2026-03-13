// ============================================================
// commissionReconciliation.ts
// Lógica completa de parsing do PDF FoccoERP + Conciliação
// Compatível com pdfjs-dist (browser) e Node.js
// ============================================================

// --------------- TIPOS ---------------

export interface PDFRecord {
  nf: string;
  parcela: number;
  dtMov: string;        // dd/mm/aa
  dtVcto: string;       // dd/mm/aa
  pctComissao: number;  // ex: 8 (%)
  base: number;
  comGerada: number;
  comLiberada: number;
  cliente: string;
}

export interface PDFParseResult {
  representante: string;
  periodo: string;
  records: PDFRecord[];
  totalBase: number;
  totalComLiberada: number;
}

export type ConciliacaoStatus =
  | 'conciliado'      // ✅ match exato dentro da tolerância
  | 'divergencia'     // ⚠️ match encontrado mas valores diferem
  | 'somente_pdf'     // 📋 no PDF mas não no Excel
  | 'somente_excel';  // 🕐 no Excel mas não no PDF

export interface ParcelaConciliada {
  // Dados do Excel
  numeroPedido: string;
  numeroNF: string;
  cliente: string;
  representante: string;
  tabela: string;
  condPgto: string;
  dtFat: string;
  parcela: string;       // "1/3"
  parcelaIdx: number;    // 1, 2, 3...
  vencimento: string;
  valorParcela: number;
  taxa: number;
  comissaoCalculada: number;

  // Dados do PDF (preenchido se encontrou match)
  pdf_nf?: string;
  pdf_parcela?: number;
  pdf_dtVcto?: string;
  pdf_base?: number;
  pdf_comGerada?: number;
  pdf_comLiberada?: number;
  pdf_cliente?: string;

  // Resultado
  status: ConciliacaoStatus;
  diferenca: number;     // comissaoCalculada - pdf_comLiberada (0 se não conciliado)
}

export interface ConciliacaoResult {
  representante: string;
  periodo: string;
  parcelas: ParcelaConciliada[];
  resumo: {
    conciliados: number;
    divergencias: number;
    somenteExcel: number;
    somentePDF: number;
    totalComissaoExcel: number;
    totalComissaoPDF: number;
    diferenca: number;
  };
}

// --------------- PARSING DO PDF ---------------

/**
 * Converte número no formato brasileiro para float
 * Ex: "1.935,19" → 1935.19
 */
function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

/**
 * Extrai todos os registros DUP de um bloco de texto extraído do PDF.
 *
 * Regex explicado:
 * DUP\s+           → literal "DUP" + espaços
 * (\d+)            → [1] Número da NF/título
 * \s+-\s+          → separador " - "
 * (\d+)            → [2] Número da parcela
 * \s+(\d{2}/\d{2}/\d{2})  → [3] Data movimento
 * \s+(\d{2}/\d{2}/\d{2})  → [4] Data vencimento
 * \s+\d+-\s+\(\d+\)\s+    → código do movimento (ignorado)
 * .+?              → descrição do movimento (lazy, ignorada)
 * \s+(\d+)         → [5] Percentual de comissão
 * \s+([\d.]+,\d{2})→ [6] Valor base
 * \s+([\d.]+,\d{2})→ [7] Comissão gerada
 * \s+([\d.]+,\d{2})→ [8] Comissão liberada
 */
const DUP_REGEX =
  /DUP\s+(\d+)\s+-\s+(\d+)\s+(?:.*?\s+)?(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+\d+\s+-\s+\(\d+\)\s+[\w/]+(?:\s+-\s+\w+)?\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/;

const CLIENTE_LINE_REGEX = /^\d+\s+-\s+(.+)$/;
const REP_REGEX = /Representante\s*:?\s*(\d+\s*-\s*.+?)(?:\s+Cnpj|$)/i;
const PERIOD_REGEX = /(\d{2}\/\d{2}\/\d{4})\|(\d{2}\/\d{2}\/\d{4})/;

/**
 * Parseia o texto extraído de um PDF FoccoERP (RCTR0370).
 * @param pdfText Texto completo extraído do PDF (todas as páginas concatenadas com \n)
 */
export function parseFoccoERPPDF(pdfText: string): PDFParseResult {
  const lines = pdfText.split('\n');

  let representante = '';
  let periodo = '';
  const records: PDFRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Cabeçalho: representante
    const repMatch = REP_REGEX.exec(line);
    if (repMatch && !representante) {
      representante = repMatch[1].trim();
    }

    // Cabeçalho: período
    const periodMatch = PERIOD_REGEX.exec(line);
    if (periodMatch && !periodo) {
      periodo = `${periodMatch[1]} a ${periodMatch[2]}`;
    }

    // Linha de registro DUP
    const dupMatch = DUP_REGEX.exec(line);
    if (dupMatch) {
      const pct = parseInt(dupMatch[5], 10);
      const pctDecimal = pct / 100;

      // Parse all monetary values
      const v1 = parseBRNumber(dupMatch[6]);
      const v2 = parseBRNumber(dupMatch[7]);
      const v3 = parseBRNumber(dupMatch[8]);
      const v4 = dupMatch[9] ? parseBRNumber(dupMatch[9]) : null;

      // First value is always Base
      const base = v1;
      const expectedCom = base * pctDecimal;

      // Determine ComLiberada: find the value closest to Base × %
      let comLiberada = 0;
      let comGerada = 0;

      if (v4 !== null) {
        // 4 values: Base, ComGerada, ValorPago, ComLiberada
        comGerada = v2;
        comLiberada = v4;
        if (comLiberada === 0 && Math.abs(v3 - expectedCom) < Math.abs(v3 * 0.5)) {
          comLiberada = v3;
        }
      } else {
        // 3 values: need to determine which is ComLiberada
        const candidates = [v2, v3];
        const closest = candidates.reduce((best, v) =>
          Math.abs(v - expectedCom) < Math.abs(best - expectedCom) ? v : best
        );
        comLiberada = closest;
        comGerada = closest === v2 ? 0 : v2;
      }

      const record: PDFRecord = {
        nf: dupMatch[1],
        parcela: parseInt(dupMatch[2], 10),
        dtMov: dupMatch[3],
        dtVcto: dupMatch[4],
        pctComissao: pct,
        base,
        comGerada,
        comLiberada,
        cliente: '',
      };

      // A linha seguinte é sempre o cliente (código - nome)
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.startsWith('DUP') || nextLine.startsWith('Sub-Total') || nextLine.startsWith('Total')) break;
        const clienteMatch = CLIENTE_LINE_REGEX.exec(nextLine);
        if (clienteMatch) {
          record.cliente = clienteMatch[1].trim();
          break;
        }
        if (nextLine.length > 3 && !nextLine.match(/^\d{2}\/\d{2}/)) {
          record.cliente = nextLine;
          break;
        }
      }

      records.push(record);
    }
  }

  const totalBase = records.reduce((acc, r) => acc + r.base, 0);
  const totalComLiberada = records.reduce((acc, r) => acc + r.comLiberada, 0);

  return { representante, periodo, records, totalBase, totalComLiberada };
}

// --------------- CONCILIAÇÃO ---------------

/**
 * Normaliza nome de cliente para comparação:
 * remove acentos, converte para maiúsculas, remove caracteres especiais
 */
function normalizeCliente(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se dois nomes de clientes são equivalentes
 * (um contém o outro ou vice-versa, após normalização)
 */
function clientesEquivalentes(a: string, b: string): boolean {
  const na = normalizeCliente(a);
  const nb = normalizeCliente(b);
  return na.includes(nb) || nb.includes(na);
}

/**
 * Tolerância monetária para considerar valores iguais (R$ 0,10)
 */
const TOLERANCIA = 0.10;

/**
 * Realiza a conciliação entre as parcelas do Excel/banco e os registros do PDF.
 */
export function conciliarComissoes(
  parcelas: Array<{
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
  }>,
  pdfResult: PDFParseResult
): ConciliacaoResult {
  const pdfUsed = new Set<number>();

  const result: ParcelaConciliada[] = parcelas.map((p) => {
    // Tentativa 1: match por NF + parcela exatos
    let pdfIdx = pdfResult.records.findIndex(
      (r, i) =>
        !pdfUsed.has(i) &&
        r.nf === p.numeroNF &&
        r.parcela === p.parcelaIdx
    );

    // Tentativa 2: match por NF + cliente similar
    if (pdfIdx === -1) {
      pdfIdx = pdfResult.records.findIndex(
        (r, i) =>
          !pdfUsed.has(i) &&
          r.nf === p.numeroNF &&
          clientesEquivalentes(r.cliente, p.cliente)
      );
    }

    // Tentativa 3: match por NF apenas (parcelas únicas)
    if (pdfIdx === -1) {
      const nfMatches = pdfResult.records
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => !pdfUsed.has(i) && r.nf === p.numeroNF);
      if (nfMatches.length === 1) {
        pdfIdx = nfMatches[0].i;
      }
    }

    if (pdfIdx !== -1) {
      pdfUsed.add(pdfIdx);
      const pdf = pdfResult.records[pdfIdx];
      const diferenca = Math.abs(p.comissaoCalculada - pdf.comLiberada);
      const status: ConciliacaoStatus =
        diferenca <= TOLERANCIA ? 'conciliado' : 'divergencia';

      return {
        ...p,
        pdf_nf: pdf.nf,
        pdf_parcela: pdf.parcela,
        pdf_dtVcto: pdf.dtVcto,
        pdf_base: pdf.base,
        pdf_comGerada: pdf.comGerada,
        pdf_comLiberada: pdf.comLiberada,
        pdf_cliente: pdf.cliente,
        status,
        diferenca: status === 'divergencia' ? p.comissaoCalculada - pdf.comLiberada : 0,
      };
    }

    return { ...p, status: 'somente_excel' as ConciliacaoStatus, diferenca: 0 };
  });

  // Registros do PDF sem correspondência no Excel
  const somentePDF: ParcelaConciliada[] = pdfResult.records
    .filter((_, i) => !pdfUsed.has(i))
    .map((r) => ({
      numeroPedido: '',
      numeroNF: r.nf,
      cliente: r.cliente,
      representante: pdfResult.representante,
      tabela: '',
      condPgto: '',
      dtFat: '',
      parcela: `${r.parcela}`,
      parcelaIdx: r.parcela,
      vencimento: r.dtVcto,
      valorParcela: r.base,
      taxa: r.pctComissao / 100,
      comissaoCalculada: 0,
      pdf_nf: r.nf,
      pdf_parcela: r.parcela,
      pdf_dtVcto: r.dtVcto,
      pdf_base: r.base,
      pdf_comGerada: r.comGerada,
      pdf_comLiberada: r.comLiberada,
      pdf_cliente: r.cliente,
      status: 'somente_pdf' as ConciliacaoStatus,
      diferenca: 0,
    }));

  const all = [...result, ...somentePDF];

  const resumo = {
    conciliados: all.filter((p) => p.status === 'conciliado').length,
    divergencias: all.filter((p) => p.status === 'divergencia').length,
    somenteExcel: all.filter((p) => p.status === 'somente_excel').length,
    somentePDF: all.filter((p) => p.status === 'somente_pdf').length,
    totalComissaoExcel: result.reduce((acc, p) => acc + p.comissaoCalculada, 0),
    totalComissaoPDF: pdfResult.totalComLiberada,
    diferenca:
      result.reduce((acc, p) => acc + p.comissaoCalculada, 0) -
      pdfResult.totalComLiberada,
  };

  return {
    representante: pdfResult.representante,
    periodo: pdfResult.periodo,
    parcelas: all,
    resumo,
  };
}

// --------------- HELPER: EXTRAIR TEXTO DO PDF (pdfjs-dist) ---------------

export async function extractTextFromPDF(
  file: File,
  pdfjsLib: any
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      height: number;
    }>;

    let lastY: number | null = null;
    let lineText = '';

    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        fullText += lineText.trim() + '\n';
        lineText = '';
      }
      lineText += item.str + ' ';
      lastY = y;
    }
    if (lineText.trim()) fullText += lineText.trim() + '\n';
  }

  return fullText;
}

// --------------- HELPER: TABELA DE COMISSÃO ---------------

export const TABELA_COMISSAO: Record<string, number> = {
  DIAMANTE: 0.10,
  OURO: 0.08,
  PRATA: 0.06,
  BRONZE: 0.04,
};

export function parseCondPgto(cond: string): number[] {
  const upper = cond.toUpperCase().trim();
  if (['BLU A VISTA', '100% PEDIDO'].includes(upper)) return [0];
  const matches = upper.match(/\d+/g);
  return matches ? matches.map(Number) : [0];
}
