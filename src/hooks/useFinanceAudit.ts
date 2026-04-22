import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 'create' | 'update' | 'delete' | 'other';

export async function logFinanceAudit(params: {
  table_name: string;
  action: AuditAction;
  record_id?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    await supabase.from('finance_audit_log').insert({
      table_name: params.table_name,
      action: params.action,
      record_id: params.record_id ?? null,
      payload: (params.payload as never) ?? null,
      user_email: user?.email ?? null,
      user_id: user?.id ?? null,
    });
  } catch (err) {
    // Não bloqueia o fluxo principal se a auditoria falhar
    console.warn('[finance-audit] failed to log', err);
  }
}
