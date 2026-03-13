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
  // dd/mm/aa or dd/mm/yyyy → yyyy-MM-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return '';
  const day = m[1];
  const month = m[2];
  let year = m[3];
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${day}`;
}

export function parsePdfText(text: string): { header: PdfHeader; records: PdfRecord[] } {
  const lines = text.split('\n');
  const records: PdfRecord[] = [];
  
  // Extract header info
  let representante = '';
  let periodoInicio = '';
  let periodoFim = '';
  
  for (const line of lines) {
    // Look for representative line like "Representante : 1345 - LSA - JULIANA CECCONI"
    const repMatch = line.match(/Representante\s*:?\s*(\d+\s*-\s*.+?)(?:\s+Cnpj|$)/i);
    if (repMatch && !representante) {
      representante = repMatch[1].trim();
    }
    // Also try pattern like "1345 - LSA - JULIANA CECCONI"
    if (!representante) {
      const repMatch2 = line.match(/(\d+\s*-\s*.+(?:LSA).+)/i);
      if (repMatch2) representante = repMatch2[1].trim();
    }
    // Look for period with pipe separator: "26/01/2026|25/02/2026"
    const pipeMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\|(\d{2}\/\d{2}\/\d{4})/);
    if (pipeMatch && !periodoInicio) {
      periodoInicio = parseBrDate(pipeMatch[1]);
      periodoFim = parseBrDate(pipeMatch[2]);
    }
    // Also try "Período: dd/mm/yyyy a dd/mm/yyyy"
    if (!periodoInicio) {
      const periodMatch = line.match(/Per[ií]odo[:\s]*(\d{2}\/\d{2}\/\d{2,4})\s*(?:a|até|à)\s*(\d{2}\/\d{2}\/\d{2,4})/i);
      if (periodMatch) {
        periodoInicio = parseBrDate(periodMatch[1]);
        periodoFim = parseBrDate(periodMatch[2]);
      }
    }
  }

  // Parse DUP lines - flexible regex that handles client text between parcela and dates
  // Format: DUP <NF> - <PARCELA> [optional client text] <DT_MOV dd/mm/yy> <DT_VCTO dd/mm/yy> <MOV_CODE> - (<MOV_CODE>) <DESC> <PCT> <val1> <val2> <val3> [val4]
  const dupRegex = /DUP\s+(\d+)\s+-\s+(\d+)\s+(?:.*?\s+)?(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+(\d+)\s+-\s+\(\d+\)\s+[\w\/]+(?:\s+-\s+\w+)?\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(dupRegex);
    if (match) {
      const pct = parseInt(match[6]);
      const pctDecimal = pct / 100;
      
      // Parse all monetary values
      const v1 = parseBrMoney(match[7]);
      const v2 = parseBrMoney(match[8]);
      const v3 = parseBrMoney(match[9]);
      const v4 = match[10] ? parseBrMoney(match[10]) : null;

      // First value is always Base
      const base = v1;
      const expectedCom = base * pctDecimal;

      // Determine ComLiberada: find the value closest to Base × %
      // ComLiberada ≈ Base × % (can differ slightly due to rounding)
      let comLiberada = 0;
      let comGerada = 0;

      if (v4 !== null) {
        // 4 values: Base, ComGerada, ValorPago, ComLiberada
        comGerada = v2;
        comLiberada = v4;
        // If v4 is 0 or empty-like, check if v3 is the commission
        if (comLiberada === 0 && Math.abs(v3 - expectedCom) < Math.abs(v3 * 0.5)) {
          comLiberada = v3;
        }
      } else {
        // 3 values: need to determine which is ComLiberada
        // ComLiberada should be ≈ Base × %
        const candidates = [v2, v3];
        const closest = candidates.reduce((best, v) =>
          Math.abs(v - expectedCom) < Math.abs(best - expectedCom) ? v : best
        );
        comLiberada = closest;
        comGerada = closest === v2 ? 0 : v2;
      }

      // Extract client from next line(s)
      let clientePdf = '';
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j].trim();
        // Skip empty lines
        if (!nextLine) continue;
        // Stop if next DUP line
        if (nextLine.startsWith('DUP') || nextLine.startsWith('Sub-Total') || nextLine.startsWith('Total')) break;
        // Client line pattern: "6497 - UNIQUE BY HOUSE..." or just text
        const clientMatch = nextLine.match(/^\d+\s*-\s*(.+)$/);
        if (clientMatch) {
          clientePdf = clientMatch[1].trim();
          break;
        }
        // If it's not empty and not a DUP line, it might be the client
        if (nextLine.length > 3 && !nextLine.match(/^\d{2}\/\d{2}/)) {
          clientePdf = nextLine;
          break;
        }
      }

      records.push({
        nf: match[1],
        parcela: parseInt(match[2]),
        dtMov: parseBrDate(match[3]),
        dtVcto: parseBrDate(match[4]),
        tipoMov: parseInt(match[5]),
        pctComissao: pct,
        base,
        comGerada,
        comLiberada,
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
    const excelMatch = excelInstallments.find(ei => {
      const key = `${ei.nf}|${ei.parcelaIndex}`;
      if (matchedExcelKeys.has(key)) return false;
      if (ei.nf !== pdf.nf) return false;
      if (ei.parcelaIndex !== pdf.parcela) return false;
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
