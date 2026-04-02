import { Quote } from '@/types/quote';
import { format } from 'date-fns';

/**
 * Returns a standardized quote label:
 * "Orçamento - NÚMERO - CLIENTE - OBRA - DATA"
 */
export function getQuoteLabel(quote: Quote): string {
  const number = (quote.parentQuoteId || quote.id).slice(0, 8).toUpperCase();
  const client = quote.client.company || quote.client.name || 'Cliente';
  const obra = quote.payment?.projectName || '';
  const date = format(new Date(quote.createdAt), 'dd/MM/yyyy');

  const parts = ['Orçamento', number, client];
  if (obra) parts.push(obra);
  parts.push(date);

  return parts.join(' - ');
}

/**
 * Returns a file-safe version for PDF naming
 */
export function getQuoteFileName(quote: Quote): string {
  const number = (quote.parentQuoteId || quote.id).slice(0, 8).toUpperCase();
  const client = (quote.client.company || quote.client.name || 'cliente').replace(/\s+/g, '_');
  const obra = (quote.payment?.projectName || '').replace(/\s+/g, '_');
  const date = format(new Date(quote.createdAt), 'dd-MM-yyyy');

  const parts = ['Orcamento', number, client];
  if (obra) parts.push(obra);
  parts.push(date);

  return parts.join('_') + '.pdf';
}
