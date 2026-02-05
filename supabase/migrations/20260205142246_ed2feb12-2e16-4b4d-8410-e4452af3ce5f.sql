-- Tabela de atividades
CREATE TABLE activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('followup', 'ligacao', 'email', 'visita', 'reuniao', 'tarefa')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  due_time time,
  priority text DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  route_visit_id uuid REFERENCES route_visits(id) ON DELETE SET NULL,
  template_id uuid,
  completed_at timestamptz,
  completed_notes text,
  reminder_at timestamptz,
  reminder_sent boolean DEFAULT false,
  recurrence_rule jsonb,
  parent_activity_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Self-reference for parent activity
ALTER TABLE activities ADD CONSTRAINT activities_parent_fkey 
  FOREIGN KEY (parent_activity_id) REFERENCES activities(id) ON DELETE SET NULL;

-- Tabela de templates
CREATE TABLE activity_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('followup', 'ligacao', 'email', 'visita', 'reuniao', 'tarefa')),
  title_template text NOT NULL,
  description_template text,
  default_priority text DEFAULT 'media' CHECK (default_priority IN ('baixa', 'media', 'alta', 'urgente')),
  default_time time,
  days_offset integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add template reference
ALTER TABLE activities ADD CONSTRAINT activities_template_fkey 
  FOREIGN KEY (template_id) REFERENCES activity_templates(id) ON DELETE SET NULL;

-- Tabela de lembretes
CREATE TABLE activity_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  reminder_type text DEFAULT 'email' CHECK (reminder_type IN ('email', 'push', 'both')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indices para performance
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_quote_id ON activities(quote_id);
CREATE INDEX idx_activities_route_visit_id ON activities(route_visit_id);
CREATE INDEX idx_activity_reminders_scheduled ON activity_reminders(scheduled_at) WHERE status = 'pending';

-- Trigger updated_at para activities
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reminders ENABLE ROW LEVEL SECURITY;

-- Policies para activities
CREATE POLICY "Activities viewable by authenticated" ON activities 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Activities insertable by authenticated" ON activities 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Activities updatable by authenticated" ON activities 
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Activities deletable by admins" ON activities 
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Policies para templates
CREATE POLICY "Templates viewable by authenticated" ON activity_templates 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Templates insertable by admins" ON activity_templates 
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Templates updatable by admins" ON activity_templates 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Templates deletable by admins" ON activity_templates 
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Policies para reminders
CREATE POLICY "Reminders viewable by authenticated" ON activity_reminders 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Reminders insertable by authenticated" ON activity_reminders 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Reminders updatable by authenticated" ON activity_reminders 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default templates
INSERT INTO activity_templates (name, type, title_template, description_template, default_priority, days_offset) VALUES
  ('Followup de Orçamento', 'followup', 'Followup - {cliente}', 'Retornar para verificar interesse no orçamento enviado.', 'media', 3),
  ('Retorno Semanal', 'ligacao', 'Retorno semanal - {cliente}', 'Ligação de acompanhamento semanal.', 'baixa', 7),
  ('Visita Mensal', 'visita', 'Visita mensal - {cliente}', 'Visita de relacionamento e prospecção.', 'media', 30),
  ('Cobrança de Proposta', 'followup', 'Cobrança - {cliente}', 'Proposta sem resposta, entrar em contato.', 'alta', 5);