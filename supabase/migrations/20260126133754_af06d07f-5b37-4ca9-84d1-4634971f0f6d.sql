-- Tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Sofás',
  has_base BOOLEAN DEFAULT false,
  available_bases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de modulações
CREATE TABLE public.product_modulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  price_fx_b NUMERIC(10,2) DEFAULT 0,
  price_fx_c NUMERIC(10,2) DEFAULT 0,
  price_fx_d NUMERIC(10,2) DEFAULT 0,
  price_fx_e NUMERIC(10,2) DEFAULT 0,
  price_fx_f NUMERIC(10,2) DEFAULT 0,
  price_fx_g NUMERIC(10,2) DEFAULT 0,
  price_fx_h NUMERIC(10,2) DEFAULT 0,
  price_fx_i NUMERIC(10,2) DEFAULT 0,
  price_fx_j NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_product_modulations_product_id ON public.product_modulations(product_id);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modulations ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (catálogo é público)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Product modulations are viewable by everyone" 
ON public.product_modulations 
FOR SELECT 
USING (true);

-- Políticas para inserção/atualização/deleção (público para MVP interno)
CREATE POLICY "Anyone can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete products" 
ON public.products 
FOR DELETE 
USING (true);

CREATE POLICY "Anyone can insert modulations" 
ON public.product_modulations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update modulations" 
ON public.product_modulations 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete modulations" 
ON public.product_modulations 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();