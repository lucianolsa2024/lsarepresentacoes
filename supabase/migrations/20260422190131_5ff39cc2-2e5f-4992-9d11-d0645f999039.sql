-- Tabela de documentos financeiros enviados
CREATE TABLE public.finance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  ocr_confidence TEXT,
  extracted_data JSONB,
  error_message TEXT,
  entry_id UUID REFERENCES public.finance_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_documents_status ON public.finance_documents(status);
CREATE INDEX idx_finance_documents_hash ON public.finance_documents(file_hash);
CREATE INDEX idx_finance_documents_created ON public.finance_documents(created_at DESC);

ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LSA admin can view finance documents"
  ON public.finance_documents FOR SELECT
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA admin can insert finance documents"
  ON public.finance_documents FOR INSERT
  WITH CHECK (public.is_finance_lsa_user());

CREATE POLICY "LSA admin can update finance documents"
  ON public.finance_documents FOR UPDATE
  USING (public.is_finance_lsa_user());

CREATE POLICY "LSA admin can delete finance documents"
  ON public.finance_documents FOR DELETE
  USING (public.is_finance_lsa_user());

CREATE TRIGGER trg_finance_documents_updated_at
  BEFORE UPDATE ON public.finance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado de armazenamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-documents', 'finance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage restritas ao usuário LSA
CREATE POLICY "LSA admin can read finance docs storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'finance-documents' AND public.is_finance_lsa_user());

CREATE POLICY "LSA admin can upload finance docs storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'finance-documents' AND public.is_finance_lsa_user());

CREATE POLICY "LSA admin can update finance docs storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'finance-documents' AND public.is_finance_lsa_user());

CREATE POLICY "LSA admin can delete finance docs storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'finance-documents' AND public.is_finance_lsa_user());