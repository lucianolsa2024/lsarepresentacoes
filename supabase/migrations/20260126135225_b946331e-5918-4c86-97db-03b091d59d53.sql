-- Limpar tabelas existentes
DROP TABLE IF EXISTS product_modulations CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Sofás',
  has_base BOOLEAN DEFAULT false,
  available_bases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de modulações (agrupamento)
CREATE TABLE public.product_modulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de tamanhos/dimensões com preços
CREATE TABLE public.modulation_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulation_id UUID NOT NULL REFERENCES public.product_modulations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  dimensions TEXT DEFAULT '',
  length TEXT DEFAULT '',
  depth TEXT DEFAULT '',
  height TEXT DEFAULT '',
  fabric_quantity NUMERIC(10,2) DEFAULT 0,
  price_sem_tec NUMERIC(10,2) DEFAULT 0,
  price_fx_b NUMERIC(10,2) DEFAULT 0,
  price_fx_c NUMERIC(10,2) DEFAULT 0,
  price_fx_d NUMERIC(10,2) DEFAULT 0,
  price_fx_e NUMERIC(10,2) DEFAULT 0,
  price_fx_f NUMERIC(10,2) DEFAULT 0,
  price_fx_g NUMERIC(10,2) DEFAULT 0,
  price_fx_h NUMERIC(10,2) DEFAULT 0,
  price_fx_i NUMERIC(10,2) DEFAULT 0,
  price_fx_j NUMERIC(10,2) DEFAULT 0,
  price_fx_3d NUMERIC(10,2) DEFAULT 0,
  price_fx_couro NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_modulations_product_id ON public.product_modulations(product_id);
CREATE INDEX idx_sizes_modulation_id ON public.modulation_sizes(modulation_id);

-- Trigger para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products" ON public.products FOR DELETE USING (true);

-- RLS para product_modulations
ALTER TABLE public.product_modulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modulations are viewable by everyone" ON public.product_modulations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert modulations" ON public.product_modulations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update modulations" ON public.product_modulations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete modulations" ON public.product_modulations FOR DELETE USING (true);

-- RLS para modulation_sizes
ALTER TABLE public.modulation_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sizes are viewable by everyone" ON public.modulation_sizes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sizes" ON public.modulation_sizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sizes" ON public.modulation_sizes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sizes" ON public.modulation_sizes FOR DELETE USING (true);