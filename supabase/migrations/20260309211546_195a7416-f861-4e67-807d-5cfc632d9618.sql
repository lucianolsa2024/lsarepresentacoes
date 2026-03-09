
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "quotes_select_own_or_admin" ON public.quotes;

-- Create new SELECT policy: admin OR own quotes OR lucianoabreu sees all
CREATE POLICY "quotes_select_own_or_admin" ON public.quotes
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.jwt() ->> 'email' = 'lucianoabreu@lsarepresentacoes.com.br')
  OR (owner_email = (auth.jwt() ->> 'email'::text))
  OR (owner_email IS NULL)
);
