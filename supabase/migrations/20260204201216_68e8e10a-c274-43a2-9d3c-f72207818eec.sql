-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Política de acesso: Imagens são públicas para leitura
CREATE POLICY "Imagens de produtos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Política de acesso: Usuários autenticados podem fazer upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Política de acesso: Usuários autenticados podem atualizar suas imagens
CREATE POLICY "Usuários autenticados podem atualizar imagens"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Política de acesso: Admins podem deletar imagens
CREATE POLICY "Admins podem deletar imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna image_url na tabela products
ALTER TABLE products
ADD COLUMN image_url TEXT;