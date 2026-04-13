/**
 * Normaliza o nome do fornecedor para exibição.
 * CENTURY e PONTO VIRGULA são marcas da SOHOME.
 */
const SOHOME_ALIASES = ['CENTURY', 'PONTOVIRGULA', 'PONTO VIRGULA', 'PV'];

export function normalizeSupplier(supplier: string | null | undefined): string {
  if (!supplier) return '';
  const upper = supplier.trim().toUpperCase();
  if (SOHOME_ALIASES.includes(upper)) return 'SOHOME';
  return upper;
}
