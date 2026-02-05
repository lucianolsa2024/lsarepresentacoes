import { format } from 'date-fns';
import { Quote } from '@/types/quote';

export interface OutlookCalendarParams {
  subject: string;
  startDate: Date;
  endDate?: Date;
  body: string;
  location?: string;
}

/**
 * Generates an Outlook Live calendar event URL
 * Opens Outlook web to create a new event with pre-filled data
 */
export function generateOutlookCalendarUrl(params: OutlookCalendarParams): string {
  const { subject, startDate, body, location } = params;
  
  // End date defaults to 1 hour after start
  const endDate = params.endDate || new Date(startDate.getTime() + 60 * 60 * 1000);
  
  // Format dates in ISO 8601 format for Outlook
  const startDt = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
  const endDt = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
  
  const searchParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: startDt,
    enddt: endDt,
    subject: subject,
    body: body,
  });
  
  if (location) {
    searchParams.set('location', location);
  }
  
  return `https://outlook.live.com/calendar/deeplink/compose?${searchParams.toString()}`;
}

/**
 * Creates an Outlook calendar event for a quote closing reminder
 */
export function createQuoteReminderUrl(quote: Quote): string | null {
  if (!quote.payment.estimatedClosingDate) {
    return null;
  }
  
  const closingDate = new Date(quote.payment.estimatedClosingDate);
  // Set time to 9:00 AM
  closingDate.setHours(9, 0, 0, 0);
  
  const clientName = quote.client.company || quote.client.name;
  const quoteNumber = quote.id.slice(0, 8).toUpperCase();
  
  const subject = `Fechamento Orçamento - ${clientName} #${quoteNumber}`;
  
  const totalFormatted = quote.total.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
  
  const body = [
    `Lembrete de fechamento de orçamento`,
    ``,
    `Cliente: ${clientName}`,
    `Valor: ${totalFormatted}`,
    `Itens: ${quote.items.length}`,
    ``,
    `Orçamento #${quoteNumber}`,
  ].join('\n');
  
  return generateOutlookCalendarUrl({
    subject,
    startDate: closingDate,
    body,
  });
}

/**
 * Opens the Outlook calendar to create a reminder for a quote
 */
export function openQuoteReminder(quote: Quote): boolean {
  const url = createQuoteReminderUrl(quote);
  if (url) {
    window.open(url, '_blank');
    return true;
  }
  return false;
}
