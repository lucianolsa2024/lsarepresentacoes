import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Quote } from '@/types/quote';
import { RouteWithVisits, RouteVisit, RouteClient } from '@/types/route';
import { formatAddress } from '@/utils/mapUtils';
import { getQuoteLabel } from '@/utils/quoteLabel';

export interface OutlookCalendarParams {
  subject: string;
  startDate: Date;
  endDate?: Date;
  body: string;
  location?: string;
  isAllDay?: boolean;
}

/**
 * Generates an Outlook calendar event URL using outlook.office.com
 * This works for Microsoft 365 / work accounts (uses logged-in user's account)
 */
export function generateOutlookCalendarUrl(params: OutlookCalendarParams): string {
  const { subject, startDate, body, location, isAllDay } = params;
  const endDate = params.endDate || new Date(startDate.getTime() + 60 * 60 * 1000);
  
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
  
  if (location) searchParams.set('location', location);
  if (isAllDay) searchParams.set('allday', 'true');
  
  // Use outlook.office.com for work/school Microsoft 365 accounts
  return `https://outlook.office.com/calendar/deeplink/compose?${searchParams.toString()}`;
}

/**
 * Creates an Outlook calendar event for a quote closing reminder
 */
export function createQuoteReminderUrl(quote: Quote): string | null {
  if (!quote.payment.estimatedClosingDate) return null;
  
  const closingDate = new Date(quote.payment.estimatedClosingDate);
  closingDate.setHours(9, 0, 0, 0);
  
  const label = getQuoteLabel(quote);
  const subject = `Fechamento ${label}`;
  const totalFormatted = quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const body = [
    `Lembrete de fechamento de orçamento`,
    ``,
    `${label}`,
    `Valor: ${totalFormatted}`,
    `Itens: ${quote.items.length}`,
  ].join('\n');
  
  return generateOutlookCalendarUrl({ subject, startDate: closingDate, body });
}

/**
 * Opens the Outlook calendar to create a reminder for a quote
 */
export function openQuoteReminder(quote: Quote): boolean {
  const url = createQuoteReminderUrl(quote);
  if (url) { window.open(url, '_blank'); return true; }
  return false;
}

/**
 * Creates an Outlook calendar URL for an entire route (multi-day event)
 */
export function generateRouteCalendarUrl(route: RouteWithVisits): string {
  const startDate = new Date(route.start_date + 'T09:00:00');
  const endDate = new Date(route.end_date + 'T18:00:00');
  const cities = [...new Set(route.visits.map(v => v.client?.city).filter(Boolean))];
  const citiesStr = cities.join(', ');
  const clientsList = route.visits.filter(v => v.client).map(v => `• ${v.client?.company}`).join('\n');
  
  const body = [
    `Rota de Visitas: ${route.name}`,
    ``,
    `Período: ${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`,
    `Total de visitas: ${route.visits.length}`,
    ``,
    `Clientes:`,
    clientsList,
    ``,
    route.notes ? `Observações: ${route.notes}` : '',
  ].filter(Boolean).join('\n');
  
  return generateOutlookCalendarUrl({ subject: `🗺️ ${route.name}`, startDate, endDate, body, location: citiesStr, isAllDay: true });
}

/**
 * Creates an Outlook calendar URL for a single visit
 */
export function generateVisitCalendarUrl(visit: RouteVisit, client: RouteClient): string {
  const visitDate = new Date(visit.visit_date + 'T09:00:00');
  visitDate.setHours(9 + (visit.visit_order - 1), 0, 0, 0);
  const endTime = new Date(visitDate.getTime() + 60 * 60 * 1000);
  
  const address = formatAddress({ street: client.street, number: client.number, neighborhood: client.neighborhood, city: client.city, state: client.state });
  
  const body = [
    `Visita ao cliente: ${client.company}`,
    ``,
    client.name ? `Contato: ${client.name}` : '',
    client.phone ? `Telefone: ${client.phone}` : '',
    client.email ? `Email: ${client.email}` : '',
    ``,
    address ? `Endereço: ${address}` : '',
    ``,
    visit.notes ? `Observações: ${visit.notes}` : '',
  ].filter(Boolean).join('\n');
  
  return generateOutlookCalendarUrl({ subject: `📍 Visita - ${client.company}`, startDate: visitDate, endDate: endTime, body, location: address });
}
