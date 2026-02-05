import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';
import { format } from 'date-fns';

interface OutlookCalendarParams {
  subject: string;
  startDate: Date;
  endDate: Date;
  body?: string;
  location?: string;
}

function generateOutlookUrl(params: OutlookCalendarParams): string {
  const formatDateForOutlook = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const baseUrl = 'https://outlook.live.com/calendar/0/action/compose';
  const queryParams = new URLSearchParams({
    allday: 'false',
    subject: params.subject,
    startdt: formatDateForOutlook(params.startDate),
    enddt: formatDateForOutlook(params.endDate),
    body: params.body || '',
    location: params.location || '',
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

export function generateActivityCalendarUrl(activity: Activity): string {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
  const typeEmoji = getTypeEmoji(activity.type);
  
  // Parse date and time
  let startDate: Date;
  if (activity.due_time) {
    const [hours, minutes] = activity.due_time.split(':').map(Number);
    startDate = new Date(activity.due_date);
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate = new Date(activity.due_date);
    startDate.setHours(9, 0, 0, 0); // Default to 9 AM
  }
  
  // End date is 1 hour after start
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  
  // Build body
  let body = `${typeConfig.label}: ${activity.title}`;
  if (activity.description) {
    body += `\n\n${activity.description}`;
  }
  if (activity.client) {
    body += `\n\nCliente: ${activity.client.company}`;
    if (activity.client.phone) {
      body += `\nTelefone: ${activity.client.phone}`;
    }
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
  };
  return emojis[type];
}

export function openActivityInOutlook(activity: Activity): void {
  const url = generateActivityCalendarUrl(activity);
  window.open(url, '_blank');
}
