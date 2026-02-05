import { Activity, ACTIVITY_TYPE_CONFIG } from '@/types/activity';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    console.warn('Notificações foram bloqueadas pelo usuário');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showActivityNotification(activity: Activity): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
  
  const notification = new Notification(`Lembrete: ${activity.title}`, {
    body: `${typeConfig.label}${activity.client ? ` - ${activity.client.company}` : ''}`,
    icon: '/favicon.ico',
    tag: activity.id,
    requireInteraction: true,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Check for due activities and show notifications
export function checkDueActivities(activities: Activity[]): void {
  const now = new Date();
  
  activities.forEach(activity => {
    if (activity.status !== 'pendente' || !activity.reminder_at) {
      return;
    }
    
    const reminderTime = new Date(activity.reminder_at);
    
    // Check if reminder is due (within the last minute)
    const diffMinutes = (now.getTime() - reminderTime.getTime()) / (1000 * 60);
    
    if (diffMinutes >= 0 && diffMinutes < 1) {
      showActivityNotification(activity);
    }
  });
}
