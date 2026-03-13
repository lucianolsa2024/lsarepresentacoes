
CREATE TABLE public.calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL UNIQUE,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token"
  ON public.calendar_tokens FOR SELECT
  TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own token"
  ON public.calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Anon can select by token for feed"
  ON public.calendar_tokens FOR SELECT
  TO anon
  USING (true);
