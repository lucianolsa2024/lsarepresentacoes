-- Add 'client' to the existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Add client_id column on user_roles to link external portal users to a client
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;