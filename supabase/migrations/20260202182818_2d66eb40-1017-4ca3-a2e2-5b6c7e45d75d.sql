-- Adicionar coluna factory na tabela products
ALTER TABLE products ADD COLUMN factory TEXT DEFAULT '';

-- Criar índice para filtro por fábrica
CREATE INDEX idx_products_factory ON products(factory);