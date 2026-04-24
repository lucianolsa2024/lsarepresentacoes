-- Add supplier column to rep_goals (NULL = total goal for the rep)
ALTER TABLE public.rep_goals
  ADD COLUMN IF NOT EXISTS supplier text;

-- Drop old unique constraint if exists, replace with composite including supplier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rep_goals_owner_email_month_start_key'
  ) THEN
    ALTER TABLE public.rep_goals DROP CONSTRAINT rep_goals_owner_email_month_start_key;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rep_goals_pkey'
      AND conrelid = 'public.rep_goals'::regclass
  ) THEN
    -- keep pkey
    NULL;
  END IF;
END $$;

-- Unique index on (owner_email, month_start, supplier) treating NULL as "total"
CREATE UNIQUE INDEX IF NOT EXISTS rep_goals_owner_month_supplier_uidx
  ON public.rep_goals (owner_email, month_start, COALESCE(supplier, ''));
