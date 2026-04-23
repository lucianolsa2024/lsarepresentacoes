import { useState, useEffect, useCallback } from 'react';
import { Product, ProductModulation, ModulationSize, ModulationFinish, FabricTier } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const extractBaseFromDescription = (description: string): string => {
  const baseMatch = description.match(/BASE\/PE:\s*([A-Z\/]+)/i);
  return baseMatch ? baseMatch[1] : '';
};

const dbSizeToApp = (
  size: {
    id: string;
    description: string;
    dimensions: string | null;
    length: string | null;
    depth: string | null;
    height: string | null;
    fabric_quantity: number | null;
    price_sem_tec: number | null;
    price_fx_b: number | null;
    price_fx_c: number | null;
    price_fx_d: number | null;
    price_fx_e: number | null;
    price_fx_f: number | null;
    price_fx_g: number | null;
    price_fx_h: number | null;
    price_fx_i: number | null;
    price_fx_j: number | null;
    price_fx_3d: number | null;
    price_fx_couro: number | null;
  },
  finishes: ModulationFinish[] = []
): ModulationSize => ({
  id: size.id,
  description: size.description,
  dimensions: size.dimensions || '',
  length: size.length || '',
  depth: size.depth || '',
  height: size.height || '',
  base: extractBaseFromDescription(size.description),
  fabricQuantity: size.fabric_quantity || 0,
  prices: {
    'SEM TEC': size.price_sem_tec || 0,
    'FORNECIDO': size.price_fx_b || 0,
    'FX B': size.price_fx_b || 0,
    'FX C': size.price_fx_c || 0,
    'FX D': size.price_fx_d || 0,
    'FX E': size.price_fx_e || 0,
    'FX F': size.price_fx_f || 0,
    'FX G': size.price_fx_g || 0,
    'FX H': size.price_fx_h || 0,
    'FX I': size.price_fx_i || 0,
    'FX J': size.price_fx_j || 0,
    'FX 3D': size.price_fx_3d || 0,
    'FX COURO': size.price_fx_couro || 0,
  },
  finishes,
});

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (productsError) throw productsError;

      const batchSize = 1000;

      // Fetch modulations
      let allModulationsData: {
        id: string;
        product_id: string;
        name: string;
        description: string | null;
        created_at: string | null;
      }[] = [];
      {
        let offset = 0, hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('product_modulations')
            .select('*')
            .range(offset, offset + batchSize - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            allModulationsData = [...allModulationsData, ...data];
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      // Fetch sizes
      type SizeRow = {
        id: string;
        modulation_id: string;
        description: string;
        dimensions: string | null;
        length: string | null;
        depth: string | null;
        height: string | null;
        fabric_quantity: number | null;
        price_sem_tec: number | null;
        price_fx_b: number | null;
        price_fx_c: number | null;
        price_fx_d: number | null;
        price_fx_e: number | null;
        price_fx_f: number | null;
        price_fx_g: number | null;
        price_fx_h: number | null;
        price_fx_i: number | null;
        price_fx_j: number | null;
        price_fx_3d: number | null;
        price_fx_couro: number | null;
        created_at: string | null;
      };
      let allSizesData: SizeRow[] = [];
      {
        let offset = 0, hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('modulation_sizes')
            .select('*')
            .range(offset, offset + batchSize - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            allSizesData = [...allSizesData, ...data];
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      // Fetch finishes (modulation_finishes) — para produtos CENTURY WOOD / PV WOOD
      type FinishRow = {
        id: string;
        size_id: string;
        finish_name: string;
        price: number;
        created_at: string | null;
      };
      let allFinishesData: FinishRow[] = [];
      {
        let offset = 0, hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('modulation_finishes')
            .select('*')
            .range(offset, offset + batchSize - 1);
          if (error) {
            // Tabela pode não existir em ambientes antigos — ignorar erro
            console.warn('modulation_finishes not available:', error.message);
            hasMore = false;
          } else if (data && data.length > 0) {
            allFinishesData = [...allFinishesData, ...data];
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      // Agrupar finishes por size_id
      const finishesBySizeId: Record<string, ModulationFinish[]> = {};
      allFinishesData.forEach(f => {
        if (!finishesBySizeId[f.size_id]) finishesBySizeId[f.size_id] = [];
        finishesBySizeId[f.size_id].push({
          id: f.id,
          finishName: f.finish_name,
          price: f.price,
        });
      });

      // Agrupar sizes por modulation_id
      const sizesByModulation: Record<string, SizeRow[]> = {};
      allSizesData.forEach(size => {
        if (!sizesByModulation[size.modulation_id]) sizesByModulation[size.modulation_id] = [];
        sizesByModulation[size.modulation_id].push(size);
      });

      // Agrupar modulations por product_id
      const modulationsByProduct: Record<string, (typeof allModulationsData[0] & { sizes: ModulationSize[] })[]> = {};
      allModulationsData.forEach(mod => {
        if (!modulationsByProduct[mod.product_id]) modulationsByProduct[mod.product_id] = [];
        modulationsByProduct[mod.product_id].push({
          ...mod,
          sizes: (sizesByModulation[mod.id] || []).map(s =>
            dbSizeToApp(s, finishesBySizeId[s.id] || [])
          ),
        });
      });

      const getProductBases = (productId: string): string[] => {
        const bases = new Set<string>();
        (modulationsByProduct[productId] || []).forEach(mod => {
          mod.sizes.forEach(size => { if (size.base) bases.add(size.base); });
        });
        return Array.from(bases);
      };

      const mappedProducts: Product[] = (productsData || []).map(p => {
        const bases = getProductBases(p.id);
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description || '',
          category: p.category,
          factory: (p as { factory?: string }).factory || '',
          hasBase: bases.length > 0,
          availableBases: bases,
          imageUrl: (p as { image_url?: string | null }).image_url || null,
          modulations: (modulationsByProduct[p.id] || []).map(mod => ({
            id: mod.id,
            name: mod.name,
            description: mod.description || '',
            sizes: mod.sizes,
          })),
        };
      });

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

      for (const mod of product.modulations) {
        const { data: newMod, error: modError } = await supabase
          .from('product_modulations')
          .insert({ product_id: newProduct.id, name: mod.name, description: mod.description })
          .select()
          .single();
        if (modError) throw modError;

        if (mod.sizes && mod.sizes.length > 0) {
          const sizesToInsert = mod.sizes.map(size => ({
            modulation_id: newMod.id,
            description: size.description,
            dimensions: size.dimensions,
            length: size.length,
            depth: size.depth,
            height: size.height,
            fabric_quantity: size.fabricQuantity,
            price_sem_tec: size.prices['SEM TEC'],
            price_fx_b: size.prices['FX B'],
            price_fx_c: size.prices['FX C'],
            price_fx_d: size.prices['FX D'],
            price_fx_e: size.prices['FX E'],
            price_fx_f: size.prices['FX F'],
            price_fx_g: size.prices['FX G'],
            price_fx_h: size.prices['FX H'],
            price_fx_i: size.prices['FX I'],
            price_fx_j: size.prices['FX J'],
            price_fx_3d: size.prices['FX 3D'],
            price_fx_couro: size.prices['FX COURO'],
          }));
          const { error: sizesError } = await supabase.from('modulation_sizes').insert(sizesToInsert);
          if (sizesError) throw sizesError;
        }
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

      const { error: deleteModError } = await supabase
        .from('product_modulations')
        .delete()
        .eq('product_id', id);
      if (deleteModError) throw deleteModError;

      for (const mod of product.modulations) {
        const { data: newMod, error: modError } = await supabase
          .from('product_modulations')
          .insert({ product_id: id, name: mod.name, description: mod.description })
          .select()
          .single();
        if (modError) throw modError;

        if (mod.sizes && mod.sizes.length > 0) {
          const sizesToInsert = mod.sizes.map(size => ({
            modulation_id: newMod.id,
            description: size.description,
            dimensions: size.dimensions,
            length: size.length,
            depth: size.depth,
            height: size.height,
            fabric_quantity: size.fabricQuantity,
            price_sem_tec: size.prices['SEM TEC'],
            price_fx_b: size.prices['FX B'],
            price_fx_c: size.prices['FX C'],
            price_fx_d: size.prices['FX D'],
            price_fx_e: size.prices['FX E'],
            price_fx_f: size.prices['FX F'],
            price_fx_g: size.prices['FX G'],
            price_fx_h: size.prices['FX H'],
            price_fx_i: size.prices['FX I'],
            price_fx_j: size.prices['FX J'],
            price_fx_3d: size.prices['FX 3D'],
            price_fx_couro: size.prices['FX COURO'],
          }));
          const { error: sizesError } = await supabase.from('modulation_sizes').insert(sizesToInsert);
          if (sizesError) throw sizesError;
        }
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
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await fetchProducts();
      toast.success('Produto excluído');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  return { products, loading, addProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}
