
ALTER TABLE public.store_trainings
  ADD COLUMN IF NOT EXISTS nps_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS nps_submitted BOOLEAN NOT NULL DEFAULT false;
