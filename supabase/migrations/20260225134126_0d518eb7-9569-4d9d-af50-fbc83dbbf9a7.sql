
ALTER TABLE public.clients ADD COLUMN parent_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX idx_clients_parent ON public.clients(parent_client_id) WHERE parent_client_id IS NOT NULL;
