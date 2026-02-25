
ALTER TABLE public.quotes 
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN parent_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX idx_quotes_parent_quote_id ON public.quotes(parent_quote_id);
