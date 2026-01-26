-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

DROP POLICY IF EXISTS "Modulations are viewable by everyone" ON public.product_modulations;
DROP POLICY IF EXISTS "Anyone can insert modulations" ON public.product_modulations;
DROP POLICY IF EXISTS "Anyone can update modulations" ON public.product_modulations;
DROP POLICY IF EXISTS "Anyone can delete modulations" ON public.product_modulations;

DROP POLICY IF EXISTS "Sizes are viewable by everyone" ON public.modulation_sizes;
DROP POLICY IF EXISTS "Anyone can insert sizes" ON public.modulation_sizes;
DROP POLICY IF EXISTS "Anyone can update sizes" ON public.modulation_sizes;
DROP POLICY IF EXISTS "Anyone can delete sizes" ON public.modulation_sizes;

-- Recreate as PERMISSIVE policies for products
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert products" 
ON public.products FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update products" 
ON public.products FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete products" 
ON public.products FOR DELETE 
USING (true);

-- Recreate as PERMISSIVE policies for product_modulations
CREATE POLICY "Modulations are viewable by everyone" 
ON public.product_modulations FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert modulations" 
ON public.product_modulations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update modulations" 
ON public.product_modulations FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete modulations" 
ON public.product_modulations FOR DELETE 
USING (true);

-- Recreate as PERMISSIVE policies for modulation_sizes
CREATE POLICY "Sizes are viewable by everyone" 
ON public.modulation_sizes FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert sizes" 
ON public.modulation_sizes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sizes" 
ON public.modulation_sizes FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete sizes" 
ON public.modulation_sizes FOR DELETE 
USING (true);