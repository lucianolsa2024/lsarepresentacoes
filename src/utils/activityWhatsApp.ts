import { Activity, ActivityType } from '@/types/activity';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientInfo {
  name?: string;
  company: string;
  phone?: string;
}

const messageTemplates: Record<string, (clientName: string, activityDate?: string) => string> = {
  followup: (clientName, _date) => 
    `Olá ${clientName}! Passando para verificar sobre o orçamento que enviamos. Podemos conversar?`,
  ligacao: (clientName, _date) => 
    `Olá ${clientName}! Tentei entrar em contato por telefone. Quando seria um bom horário para conversarmos?`,
  email: (clientName, _date) => 
    `Olá ${clientName}! Enviei um email, conseguiu verificar? Fico à disposição para esclarecer dúvidas.`,
  visita: (clientName, date) => 
    `Olá ${clientName}! Confirmando nossa visita para ${date || 'o dia agendado'}. Tudo certo?`,
  reuniao: (clientName, date) => 
    `Olá ${clientName}! Confirmando nossa reunião para ${date || 'o horário agendado'}. Nos vemos lá!`,
  tarefa: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem?`,
  treinamento: (clientName, date) => 
    `Olá ${clientName}! Confirmando nosso treinamento para ${date || 'o dia agendado'}. Tudo certo?`,
  assistencia: (clientName, _date) => 
    `Olá ${clientName}! Estou entrando em contato sobre a assistência técnica solicitada. Podemos alinhar os detalhes?`,
  relacionamento: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem? Estou passando para saber como estão as coisas!`,
  checklist_loja: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem? Estou entrando em contato sobre o checklist da loja.`,
  whatsapp: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem?`,
  proposta_enviada: (clientName, _date) => 
    `Olá ${clientName}! Enviei uma proposta, conseguiu analisar? Fico à disposição!`,
  outro_crm: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem?`,
  outros: (clientName, _date) => 
    `Olá ${clientName}! Tudo bem?`,
};

export function generateWhatsAppMessage(activity: Activity, client: ClientInfo): string {
  const clientName = client.name || client.company;
  let formattedDate: string | undefined;
  
  if (activity.due_date) {
    const date = new Date(activity.due_date);
    formattedDate = format(date, "dd 'de' MMMM", { locale: ptBR });
    if (activity.due_time) {
      formattedDate += ` às ${activity.due_time.slice(0, 5)}`;
    }
  }
  
  return messageTemplates[activity.type](clientName, formattedDate);
}

export function openWhatsAppForActivity(activity: Activity, client: ClientInfo): void {
  if (!client.phone) {
    console.error('Cliente sem telefone cadastrado');
    return;
  }
  
  // Remove non-numeric characters
  const phone = client.phone.replace(/\D/g, '');
  
  // Add Brazil code if not present
  const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
  
  const message = generateWhatsAppMessage(activity, client);
  const encodedMessage = encodeURIComponent(message);
  
  window.open(`https://wa.me/${fullPhone}?text=${encodedMessage}`, '_blank');
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
