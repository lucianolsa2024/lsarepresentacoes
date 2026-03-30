/**
 * Returns the display name for a client: tradeName if available, otherwise company.
 */
export function clientDisplayName(client: { tradeName?: string; company: string } | null | undefined): string {
  if (!client) return '';
  return client.tradeName?.trim() || client.company;
}

/**
 * Returns display name from raw DB fields (trade_name, company).
 */
export function clientDisplayNameRaw(tradeName: string | null | undefined, company: string | null | undefined): string {
  return tradeName?.trim() || company || '';
}
