
-- Add client_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN client_type text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.clients.client_type IS 'Tipo de cliente: lojista_alto, lojista_medio, corporativo, escritorio_arquitetura';
