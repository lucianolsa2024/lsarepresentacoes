// Algoritmo de matching entre transações bancárias e lançamentos financeiros
export interface BankTx {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
}

export interface FinanceEntry {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  entry_type: string; // a_pagar | a_receber
  counterparty?: string | null;
}

export interface MatchSuggestion {
  entry: FinanceEntry;
  score: number; // 0..1
  reasons: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function tokenSimilarity(a: string, b: string): number {
  const at = new Set(norm(a).split(' ').filter((t) => t.length >= 3));
  const bt = new Set(norm(b).split(' ').filter((t) => t.length >= 3));
  if (at.size === 0 || bt.size === 0) return 0;
  let inter = 0;
  at.forEach((t) => {
    if (bt.has(t)) inter++;
  });
  return inter / Math.max(at.size, bt.size);
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

export function suggestMatches(
  tx: BankTx,
  entries: FinanceEntry[],
  maxDays = 3,
): MatchSuggestion[] {
  const txAbs = Math.abs(tx.amount);
  // Filtra por tipo: crédito → a_receber; débito → a_pagar
  const expectedType = tx.transaction_type === 'credit' ? 'a_receber' : 'a_pagar';
  const candidates = entries.filter((e) => e.entry_type === expectedType);

  const suggestions: MatchSuggestion[] = [];
  for (const e of candidates) {
    const reasons: string[] = [];
    let score = 0;

    // Valor
    const diff = Math.abs(Math.abs(e.amount) - txAbs);
    const tolerance = Math.max(0.01, txAbs * 0.005); // 0.5%
    if (diff <= tolerance) {
      score += 0.6;
      reasons.push('Valor exato');
    } else if (diff <= txAbs * 0.02) {
      score += 0.3;
      reasons.push('Valor próximo');
    } else {
      continue; // sem valor próximo, descarta
    }

    // Data
    const ref = e.paid_date || e.due_date;
    const dDays = daysDiff(tx.transaction_date, ref);
    if (dDays === 0) {
      score += 0.25;
      reasons.push('Mesma data');
    } else if (dDays <= maxDays) {
      score += 0.15;
      reasons.push(`±${dDays} dia(s)`);
    } else if (dDays <= 7) {
      score += 0.05;
      reasons.push(`${dDays} dias de diferença`);
    }

    // Texto
    const textTarget = `${e.description} ${e.counterparty || ''}`;
    const sim = tokenSimilarity(tx.description, textTarget);
    if (sim >= 0.5) {
      score += 0.2;
      reasons.push('Descrição similar');
    } else if (sim >= 0.25) {
      score += 0.1;
      reasons.push('Termos em comum');
    }

    suggestions.push({ entry: e, score: Math.min(1, score), reasons });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}
