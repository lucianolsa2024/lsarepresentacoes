import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface OutlookCalendarParams {
  subject: string;
  startDate: Date;
  endDate: Date;
  body?: string;
  location?: string;
}

function generateOutlookUrl(params: OutlookCalendarParams): string {
  const startDt = format(params.startDate, "yyyy-MM-dd'T'HH:mm:ss");
  const endDt = format(params.endDate, "yyyy-MM-dd'T'HH:mm:ss");

  const searchParams = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: startDt,
    enddt: endDt,
    subject: params.subject,
    body: params.body || '',
  });

  if (params.location) {
    searchParams.set('location', params.location);
  }

  // Use outlook.office.com for work/school accounts (Microsoft 365)
  return `https://outlook.office.com/calendar/deeplink/compose?${searchParams.toString()}`;
}

export function generateActivityCalendarUrl(activity: Activity): string {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
  const typeEmoji = getTypeEmoji(activity.type);
  
  let startDate: Date;
  if (activity.due_time) {
    const [hours, minutes] = activity.due_time.split(':').map(Number);
    startDate = new Date(activity.due_date);
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate = new Date(activity.due_date);
    startDate.setHours(9, 0, 0, 0);
  }
  
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  
  let body = `${typeConfig.label}: ${activity.title}`;
  if (activity.description) body += `\n\n${activity.description}`;
  if (activity.client) {
    body += `\n\nCliente: ${activity.client.company}`;
    if (activity.client.phone) body += `\nTelefone: ${activity.client.phone}`;
  }
  
  return generateOutlookUrl({
    subject: `${typeEmoji} ${activity.title}`,
    startDate,
    endDate,
    body,
  });
}

function getTypeEmoji(type: Activity['type']): string {
  const emojis: Record<Activity['type'], string> = {
    followup: '🔄',
    ligacao: '📞',
    email: '📧',
    visita: '📍',
    reuniao: '🤝',
    tarefa: '📋',
    treinamento: '🎓',
    assistencia: '🔧',
    relacionamento: '💝',
    checklist_loja: '✅',
    outros: '📌',
  };
  return emojis[type];
}

export function openActivityInOutlook(activity: Activity): void {
  const url = generateActivityCalendarUrl(activity);
  window.open(url, '_blank');
}
