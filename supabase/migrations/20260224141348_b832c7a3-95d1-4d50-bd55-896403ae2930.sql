-- Campo de acompanhamento com múltiplos usuários para atividades/assistência
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS watcher_emails text[] NOT NULL DEFAULT '{}'::text[];