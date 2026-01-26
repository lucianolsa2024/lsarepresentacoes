import { useState, useEffect, useCallback } from 'react';
import { Product, ProductModulation, FabricTier } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to convert DB modulation to app format
const dbModulationToApp = (mod: {
  name: string;
  description: string | null;
  dimensions: string | null;
  price_fx_b: number | null;
  price_fx_c: number | null;
  price_fx_d: number | null;
  price_fx_e: number | null;
  price_fx_f: number | null;
  price_fx_g: number | null;
  price_fx_h: number | null;
  price_fx_i: number | null;
  price_fx_j: number | null;
}): ProductModulation => ({
  name: mod.name,
  description: mod.description || '',
  dimensions: mod.dimensions || '',
  prices: {
    'FX B': mod.price_fx_b || 0,
    'FX C': mod.price_fx_c || 0,
    'FX D': mod.price_fx_d || 0,
    'FX E': mod.price_fx_e || 0,
    'FX F': mod.price_fx_f || 0,
    'FX G': mod.price_fx_g || 0,
    'FX H': mod.price_fx_h || 0,
    'FX I': mod.price_fx_i || 0,
    'FX J': mod.price_fx_j || 0,
  },
});

// Helper to convert app modulation to DB format
const appModulationToDb = (mod: ProductModulation, productId: string) => ({
  product_id: productId,
  name: mod.name,
  description: mod.description,
  dimensions: mod.dimensions,
  price_fx_b: mod.prices['FX B'],
  price_fx_c: mod.prices['FX C'],
  price_fx_d: mod.prices['FX D'],
  price_fx_e: mod.prices['FX E'],
  price_fx_f: mod.prices['FX F'],
  price_fx_g: mod.prices['FX G'],
  price_fx_h: mod.prices['FX H'],
  price_fx_i: mod.prices['FX I'],
  price_fx_j: mod.prices['FX J'],
});

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch products with their modulations
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      
      const { data: modulationsData, error: modulationsError } = await supabase
        .from('product_modulations')
        .select('*');
      
      if (modulationsError) throw modulationsError;
      
      // Group modulations by product_id
      const modulationsByProduct: Record<string, typeof modulationsData> = {};
      modulationsData?.forEach(mod => {
        if (!modulationsByProduct[mod.product_id]) {
          modulationsByProduct[mod.product_id] = [];
        }
        modulationsByProduct[mod.product_id].push(mod);
      });
      
      // Map to app format
      const mappedProducts: Product[] = (productsData || []).map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description || '',
        category: p.category,
        hasBase: p.has_base || false,
        availableBases: p.available_bases || [],
        modulations: (modulationsByProduct[p.id] || []).map(dbModulationToApp),
      }));
      
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (product: Product) => {
    try {
      // Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          code: product.code,
          name: product.name,
          description: product.description,
          category: product.category,
          has_base: product.hasBase,
          available_bases: product.availableBases,
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Insert modulations
      if (product.modulations.length > 0) {
        const modulationsToInsert = product.modulations.map(mod => 
          appModulationToDb(mod, newProduct.id)
        );
        
        const { error: modulationsError } = await supabase
          .from('product_modulations')
          .insert(modulationsToInsert);
        
        if (modulationsError) throw modulationsError;
      }
      
      await fetchProducts();
      toast.success('Produto adicionado com sucesso');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const updateProduct = async (id: string, product: Product) => {
    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          code: product.code,
          name: product.name,
          description: product.description,
          category: product.category,
          has_base: product.hasBase,
          available_bases: product.availableBases,
        })
        .eq('id', id);
      
      if (productError) throw productError;
      
      // Delete existing modulations
      const { error: deleteError } = await supabase
        .from('product_modulations')
        .delete()
        .eq('product_id', id);
      
      if (deleteError) throw deleteError;
      
      // Insert new modulations
      if (product.modulations.length > 0) {
        const modulationsToInsert = product.modulations.map(mod => 
          appModulationToDb(mod, id)
        );
        
        const { error: modulationsError } = await supabase
          .from('product_modulations')
          .insert(modulationsToInsert);
        
        if (modulationsError) throw modulationsError;
      }
      
      await fetchProducts();
      toast.success('Produto atualizado com sucesso');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchProducts();
      toast.success('Produto excluído');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}
