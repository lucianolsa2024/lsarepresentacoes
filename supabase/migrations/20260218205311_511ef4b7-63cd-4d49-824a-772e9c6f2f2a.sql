
-- Add owner_email to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_email text;

-- Backfill owner_email from most recent order per client
UPDATE public.clients c
SET owner_email = sub.owner_email
FROM (
  SELECT DISTINCT ON (client_id) client_id, owner_email
  FROM public.orders
  WHERE client_id IS NOT NULL AND owner_email IS NOT NULL
  ORDER BY client_id, issue_date DESC
) sub
WHERE c.id = sub.client_id AND c.owner_email IS NULL;
