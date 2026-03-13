import { format, parse } from 'date-fns';

// ── Types ──

export interface PdfRecord {
  nf: string;
  parcela: number;
  dtMov: string; // yyyy-MM-dd
  dtVcto: string; // yyyy-MM-dd
  tipoMov: number;
  pctComissao: number;
  base: number;
  comGerada: number;
  comLiberada: number;
  clientePdf: string;
}

export interface PdfHeader {
  representante: string;
  periodoInicio: string;
  periodoFim: string;
}

export type ReconciliationStatus = 'conciliado' | 'divergencia' | 'somente_pdf' | 'somente_excel';

export interface ReconciliationResult {
  nf: string;
  parcela: number;
  clientePdf?: string;
  clienteExcel?: string;
  dtVcto?: string;
  valorExcel?: number;
  comissaoExcel?: number;
  comLiberadaPdf?: number;
  basePdf?: number;
  pctPdf?: number;
  diferenca: number;
  status: ReconciliationStatus;
}

export interface ReconciliationSummary {
  header: PdfHeader;
  results: ReconciliationResult[];
  conciliados: number;
  divergencias: number;
  somentePdf: number;
  somenteExcel: number;
  totalComissaoErp: number;
  totalComissaoCalc: number;
  totalDiferenca: number;
  valorConciliados: number;
  valorDivergencias: number;
}

// ── PDF Parsing ──

function parseBrMoney(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseBrDate(s: string): string {
  // dd/mm/aa → yyyy-MM-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return '';
  const day = m[1];
  const month = m[2];
  let year = m[3];
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${day}`;
}

function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePdfText(text: string): { header: PdfHeader; records: PdfRecord[] } {
  const lines = text.split('\n');
  const records: PdfRecord[] = [];
  
  // Extract header info
  let representante = '';
  let periodoInicio = '';
  let periodoFim = '';
  
  for (const line of lines) {
    // Look for representative line like "1345 - LSA - JULIANA CECCONI"
    const repMatch = line.match(/(\d+\s*-\s*.+(?:LSA|representant).+)/i);
    if (repMatch && !representante) {
      representante = repMatch[1].trim();
    }
    // Look for period like "Período: 26/01/2026 a 25/02/2026" or date ranges
    const periodMatch = line.match(/Per[ií]odo[:\s]*(\d{2}\/\d{2}\/\d{2,4})\s*(?:a|até|à)\s*(\d{2}\/\d{2}\/\d{2,4})/i);
    if (periodMatch) {
      periodoInicio = parseBrDate(periodMatch[1]);
      periodoFim = parseBrDate(periodMatch[2]);
    }
  }

  // Parse DUP lines
  // Pattern: DUP <NF> - <PARCELA> <DT_MOV> <DT_VCTO> <COD_MOV> - (<COD_MOV>) <DESC_MOV> <PCT_COM> <BASE> <COM_GERADA> <COM_LIBERADA>
  const dupRegex = /^DUP\s+(\d+)\s+-\s+(\d+)\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+(\d+)\s+-\s+\(\d+\)\s+[\w\/]+(?:\s+-\s+\w+)?\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(dupRegex);
    if (match) {
      // Next line is client
      let clientePdf = '';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // Client line: "6497 - UNIQUE BY HOUSE COMERCIO DE MOVEIS LTDA"
        const clientMatch = nextLine.match(/^\d+\s*-\s*(.+)$/);
        if (clientMatch) {
          clientePdf = clientMatch[1].trim();
        } else {
          clientePdf = nextLine;
        }
      }

      records.push({
        nf: match[1],
        parcela: parseInt(match[2]),
        dtMov: parseBrDate(match[3]),
        dtVcto: parseBrDate(match[4]),
        tipoMov: parseInt(match[5]),
        pctComissao: parseInt(match[6]),
        base: parseBrMoney(match[7]),
        comGerada: parseBrMoney(match[8]),
        comLiberada: parseBrMoney(match[9]),
        clientePdf,
      });
    }
  }

  return {
    header: { representante, periodoInicio, periodoFim },
    records,
  };
}

// ── Reconciliation Logic ──

export interface ExcelInstallment {
  nf: string;
  parcelaIndex: number;
  cliente: string;
  dueDate: string; // yyyy-MM-dd
  value: number;
  commission: number;
  rate: number;
}

export function reconcile(
  pdfRecords: PdfRecord[],
  excelInstallments: ExcelInstallment[]
): ReconciliationResult[] {
  const results: ReconciliationResult[] = [];
  const matchedExcelKeys = new Set<string>();

  for (const pdf of pdfRecords) {
    // Find matching Excel installment by NF + parcela number
    const excelMatch = excelInstallments.find(ei => {
      const key = `${ei.nf}|${ei.parcelaIndex}`;
      if (matchedExcelKeys.has(key)) return false;
      if (ei.nf !== pdf.nf) return false;
      if (ei.parcelaIndex !== pdf.parcela) return false;
      // Optionally check client similarity
      return true;
    });

    if (excelMatch) {
      const key = `${excelMatch.nf}|${excelMatch.parcelaIndex}`;
      matchedExcelKeys.add(key);
      
      const diff = Math.abs(pdf.comLiberada - excelMatch.commission);
      const status: ReconciliationStatus = diff <= 0.10 ? 'conciliado' : 'divergencia';

      results.push({
        nf: pdf.nf,
        parcela: pdf.parcela,
        clientePdf: pdf.clientePdf,
        clienteExcel: excelMatch.cliente,
        dtVcto: pdf.dtVcto || excelMatch.dueDate,
        valorExcel: excelMatch.value,
        comissaoExcel: excelMatch.commission,
        comLiberadaPdf: pdf.comLiberada,
        basePdf: pdf.base,
        pctPdf: pdf.pctComissao,
        diferenca: pdf.comLiberada - excelMatch.commission,
        status,
      });
    } else {
      // Only in PDF
      results.push({
        nf: pdf.nf,
        parcela: pdf.parcela,
        clientePdf: pdf.clientePdf,
        dtVcto: pdf.dtVcto,
        basePdf: pdf.base,
        comLiberadaPdf: pdf.comLiberada,
        pctPdf: pdf.pctComissao,
        diferenca: 0,
        status: 'somente_pdf',
      });
    }
  }

  // Find Excel installments not matched
  for (const ei of excelInstallments) {
    const key = `${ei.nf}|${ei.parcelaIndex}`;
    if (!matchedExcelKeys.has(key)) {
      results.push({
        nf: ei.nf,
        parcela: ei.parcelaIndex,
        clienteExcel: ei.cliente,
        dtVcto: ei.dueDate,
        valorExcel: ei.value,
        comissaoExcel: ei.commission,
        diferenca: 0,
        status: 'somente_excel',
      });
    }
  }

  return results;
}

export function buildSummary(header: PdfHeader, results: ReconciliationResult[]): ReconciliationSummary {
  const conciliados = results.filter(r => r.status === 'conciliado');
  const divergencias = results.filter(r => r.status === 'divergencia');
  const somentePdf = results.filter(r => r.status === 'somente_pdf');
  const somenteExcel = results.filter(r => r.status === 'somente_excel');

  return {
    header,
    results,
    conciliados: conciliados.length,
    divergencias: divergencias.length,
    somentePdf: somentePdf.length,
    somenteExcel: somenteExcel.length,
    totalComissaoErp: results.reduce((s, r) => s + (r.comLiberadaPdf || 0), 0),
    totalComissaoCalc: results.reduce((s, r) => s + (r.comissaoExcel || 0), 0),
    totalDiferenca: divergencias.reduce((s, r) => s + Math.abs(r.diferenca), 0),
    valorConciliados: conciliados.reduce((s, r) => s + (r.comLiberadaPdf || 0), 0),
    valorDivergencias: Math.abs(divergencias.reduce((s, r) => s + r.diferenca, 0)),
  };
}
