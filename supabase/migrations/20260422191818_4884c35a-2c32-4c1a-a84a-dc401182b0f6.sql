-- Centros de Custo
CREATE TABLE public.finance_cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select cost centers" ON public.finance_cost_centers FOR SELECT USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert cost centers" ON public.finance_cost_centers FOR INSERT WITH CHECK (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: update cost centers" ON public.finance_cost_centers FOR UPDATE USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: delete cost centers" ON public.finance_cost_centers FOR DELETE USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_cost_centers_updated_at BEFORE UPDATE ON public.finance_cost_centers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoria
CREATE TABLE public.finance_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- create | update | delete | other
  payload JSONB,
  user_email TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_audit_log_created ON public.finance_audit_log (created_at DESC);
CREATE INDEX idx_finance_audit_log_table ON public.finance_audit_log (table_name);

ALTER TABLE public.finance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select audit log" ON public.finance_audit_log FOR SELECT USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert audit log" ON public.finance_audit_log FOR INSERT WITH CHECK (public.is_finance_lsa_user());

-- Preferências do usuário (financeiro)
CREATE TABLE public.finance_user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  currency TEXT NOT NULL DEFAULT 'BRL',
  dre_email_recipients TEXT[] NOT NULL DEFAULT '{}',
  dre_email_frequency TEXT NOT NULL DEFAULT 'mensal', -- mensal | semanal | desativado
  due_alert_days INTEGER NOT NULL DEFAULT 3,
  due_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA finance: select prefs" ON public.finance_user_preferences FOR SELECT USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: insert prefs" ON public.finance_user_preferences FOR INSERT WITH CHECK (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: update prefs" ON public.finance_user_preferences FOR UPDATE USING (public.is_finance_lsa_user());
CREATE POLICY "LSA finance: delete prefs" ON public.finance_user_preferences FOR DELETE USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_user_prefs_updated_at BEFORE UPDATE ON public.finance_user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();