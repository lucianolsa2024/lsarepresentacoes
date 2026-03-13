import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeIcal(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcalDate(dateStr: string, timeStr?: string | null): string {
  const d = dateStr.replace(/-/g, '');
  if (timeStr) {
    const t = timeStr.replace(/:/g, '').slice(0, 6);
    return `${d}T${t}`;
  }
  return `${d}T090000`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Look up token
  const { data: tokenData, error: tokenError } = await supabase
    .from('calendar_tokens')
    .select('user_email')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) {
    return new Response('Invalid token', { status: 403 });
  }

  const userEmail = tokenData.user_email;

  // Fetch activities for this user (pending/agendada/em_andamento, last 30 days + future)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: activities, error: actError } = await supabase
    .from('activities')
    .select('*, clients(company, phone)')
    .or(`assigned_to_email.eq.${userEmail},and(assigned_to_email.is.null,client_id.is.null)`)
    .gte('due_date', cutoff)
    .in('status', ['pendente', 'agendada', 'em_andamento'])
    .order('due_date', { ascending: true })
    .limit(500);

  if (actError) {
    console.error('Error fetching activities:', actError);
    return new Response('Error fetching activities', { status: 500 });
  }

  // Also fetch activities via client ownership
  const { data: clientActivities } = await supabase
    .from('activities')
    .select('*, clients!inner(company, phone, owner_email)')
    .eq('clients.owner_email', userEmail)
    .gte('due_date', cutoff)
    .in('status', ['pendente', 'agendada', 'em_andamento'])
    .order('due_date', { ascending: true })
    .limit(500);

  // Merge and deduplicate
  const allActivities = [...(activities || [])];
  const existingIds = new Set(allActivities.map(a => a.id));
  for (const a of (clientActivities || [])) {
    if (!existingIds.has(a.id)) {
      allActivities.push(a);
      existingIds.add(a.id);
    }
  }

  const typeEmojis: Record<string, string> = {
    followup: '🔄', ligacao: '📞', email: '📧', visita: '📍',
    reuniao: '🤝', tarefa: '📋', treinamento: '🎓', assistencia: '🔧',
    relacionamento: '💝', checklist_loja: '✅', outros: '📌',
    whatsapp: '💬', proposta_enviada: '📄', outro_crm: '📌',
  };

  // Build iCal
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LSA Representacoes//Atividades//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LSA Atividades',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  for (const act of allActivities) {
    const emoji = typeEmojis[act.type] || '📌';
    const dtStart = formatIcalDate(act.due_date, act.due_time);
    
    // End = start + 1h
    const startDate = new Date(act.due_date);
    if (act.due_time) {
      const [h, m] = act.due_time.split(':').map(Number);
      startDate.setHours(h, m + 60, 0, 0);
    } else {
      startDate.setHours(10, 0, 0, 0);
    }
    const dtEnd = formatIcalDate(
      startDate.toISOString().split('T')[0],
      `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}:00`
    );

    const clientName = act.clients?.company || '';
    let description = act.description || '';
    if (clientName) description = `Cliente: ${clientName}\\n${description}`;
    if (act.clients?.phone) description += `\\nTel: ${act.clients.phone}`;

    ical.push(
      'BEGIN:VEVENT',
      `UID:${act.id}@lsa-atividades`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcal(`${emoji} ${act.title}`)}`,
      `DESCRIPTION:${escapeIcal(description)}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
    );
  }

  ical.push('END:VCALENDAR');

  return new Response(ical.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lsa-atividades.ics"',
      ...corsHeaders,
    },
  });
});
