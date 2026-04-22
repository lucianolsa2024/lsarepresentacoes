// Parser para extratos OFX e CSV (Itaú e padrão)
export interface ParsedTransaction {
  transaction_date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // positivo crédito, negativo débito
  transaction_type: 'credit' | 'debit';
  fitid?: string;
  memo?: string;
}

const cleanText = (v: string) => v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

const parseOfxDate = (raw: string): string => {
  // OFX date: YYYYMMDD or YYYYMMDDHHMMSS[TZ]
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[1]}-${m[2]}-${m[3]}`;
};

export function parseOFX(content: string): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  // Normaliza tags SGML do OFX inserindo fechamento implícito
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const matches = content.match(blockRegex) || [];

  for (const block of matches) {
    const get = (tag: string) => {
      const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i');
      const m = block.match(re);
      return m ? cleanText(m[1]) : '';
    };
    const dt = get('DTPOSTED');
    const amt = parseFloat(get('TRNAMT').replace(',', '.'));
    if (!dt || isNaN(amt)) continue;
    const memo = get('MEMO');
    const name = get('NAME');
    const fitid = get('FITID');
    txs.push({
      transaction_date: parseOfxDate(dt),
      description: name || memo || 'Transação',
      memo: memo || undefined,
      amount: amt,
      transaction_type: amt >= 0 ? 'credit' : 'debit',
      fitid: fitid || undefined,
    });
  }
  return txs;
}

const parseBrDate = (s: string): string | null => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) {
    const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo}-${d}`;
};

const parseBrNumber = (s: string): number => {
  if (!s) return NaN;
  let v = s.trim().replace(/\s/g, '').replace(/r\$/i, '');
  // se tiver vírgula como decimal: remove pontos de milhar e troca vírgula
  if (/,\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(v);
};

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detecta separador
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';
  const split = (line: string) =>
    line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());

  const header = split(firstLine).map((h) => h.toLowerCase());

  const idxDate = header.findIndex((h) => /data|date|dt/.test(h));
  const idxDesc = header.findIndex((h) => /hist[óo]rico|descri|memo|lan[çc]amento|description/.test(h));
  const idxAmount = header.findIndex((h) => /valor|amount|montante/.test(h));
  const idxDoc = header.findIndex((h) => /documento|doc/.test(h));

  const txs: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    if (cols.length < 2) continue;
    const dateStr = cols[idxDate >= 0 ? idxDate : 0];
    const desc = cols[idxDesc >= 0 ? idxDesc : 1];
    const amountStr = cols[idxAmount >= 0 ? idxAmount : 2];
    const docStr = idxDoc >= 0 ? cols[idxDoc] : '';

    const date = parseBrDate(dateStr);
    const amount = parseBrNumber(amountStr);
    if (!date || isNaN(amount)) continue;

    txs.push({
      transaction_date: date,
      description: desc || 'Transação',
      amount,
      transaction_type: amount >= 0 ? 'credit' : 'debit',
      fitid: docStr || undefined,
    });
  }
  return txs;
}

export function parseExtract(fileName: string, content: string): ParsedTransaction[] {
  if (/\.ofx$/i.test(fileName) || content.includes('<OFX>') || content.includes('<STMTTRN>')) {
    return parseOFX(content);
  }
  return parseCSV(content);
}
