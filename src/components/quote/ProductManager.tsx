import { useState, useMemo } from 'react';
import { Product, ProductModulation, ModulationSize, FabricTier, FABRIC_TIERS } from '@/types/quote';
import { PRODUCT_CATEGORIES, BASE_OPTIONS } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, X, Package, Search, Factory, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { ExcelImporter } from './ExcelImporter';
import { BulkImporter } from './BulkImporter';
import { ProductImageUpload } from './ProductImageUpload';
import { ProductImage } from '@/components/ProductImage';

interface ProductManagerProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onUpdate: (id: string, product: Product) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

interface NewModulation {
  name: string;
  description: string;
}

interface NewSize {
  description: string;
  dimensions: string;
  prices: Record<FabricTier, string>;
}

// Helper to create empty prices
const createEmptyPrices = (): Record<FabricTier, string> => ({
  'SEM TEC': '',
  'FORNECIDO': '',
  'FX B': '',
  'FX C': '',
  'FX D': '',
  'FX E': '',
  'FX F': '',
  'FX G': '',
  'FX H': '',
  'FX I': '',
  'FX J': '',
  'FX 3D': '',
  'FX COURO': '',
});

// Helper to convert string prices to numbers
const convertPricesToNumbers = (prices: Record<FabricTier, string>): Record<FabricTier, number> => {
  const result: Record<FabricTier, number> = {} as Record<FabricTier, number>;
  for (const tier of FABRIC_TIERS) {
    result[tier] = prices[tier] ? parseFloat(prices[tier]) : 0;
  }
  return result;
};

export function ProductManager({
  products,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
}: ProductManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactory, setSelectedFactory] = useState<string>('');

  // Get available factories from products
  const availableFactories = useMemo(() => {
    const factories = new Set<string>();
    products.forEach(p => {
      if (p.factory) factories.add(p.factory);
    });
    return Array.from(factories).sort();
  }, [products]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Sofás' as string,
    hasBase: false,
    availableBases: [] as string[],
  });
  
  const [modulations, setModulations] = useState<{mod: NewModulation, sizes: NewSize[]}[]>([
    { mod: { name: '', description: '' }, sizes: [{ description: '', dimensions: '', prices: createEmptyPrices() }] }
  ]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: 'Sofás',
      hasBase: false,
      availableBases: [],
    });
    setModulations([{ mod: { name: '', description: '' }, sizes: [{ description: '', dimensions: '', prices: createEmptyPrices() }] }]);
    setEditingProduct(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      description: product.description,
      category: product.category,
      hasBase: product.hasBase,
      availableBases: product.availableBases,
    });
    
    // Convert product modulations to form format
    const formModulations = product.modulations.map((m) => ({
      mod: { name: m.name, description: m.description },
      sizes: m.sizes.map((s) => {
        const prices: Record<FabricTier, string> = {} as Record<FabricTier, string>;
        for (const tier of FABRIC_TIERS) {
          prices[tier] = s.prices[tier] ? s.prices[tier].toString() : '';
        }
        return {
          description: s.description,
          dimensions: s.dimensions,
          prices,
        };
      })
    }));
    
    setModulations(formModulations.length > 0 ? formModulations : [{ mod: { name: '', description: '' }, sizes: [{ description: '', dimensions: '', prices: createEmptyPrices() }] }]);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Informe o nome do produto');
      return;
    }

    const validModulations = modulations.filter((m) => m.mod.name);
    if (validModulations.length === 0) {
      toast.error('Adicione pelo menos uma modulação');
      return;
    }

    const productModulations: ProductModulation[] = validModulations.map((m) => ({
      id: crypto.randomUUID(),
      name: m.mod.name,
      description: m.mod.description || m.mod.name,
      sizes: m.sizes.filter(s => Object.values(s.prices).some(p => p !== '')).map((s) => ({
        id: crypto.randomUUID(),
        description: s.description || s.dimensions,
        dimensions: s.dimensions,
        length: '',
        depth: '',
        height: '',
        base: '',
        fabricQuantity: 0,
        prices: convertPricesToNumbers(s.prices),
      })),
    }));

    const product: Product = {
      id: editingProduct?.id || crypto.randomUUID(),
      code: formData.code || '',
      name: formData.name,
      description: formData.description,
      category: formData.category,
      factory: editingProduct?.factory || '',
      modulations: productModulations,
      hasBase: formData.hasBase,
      availableBases: formData.hasBase ? formData.availableBases : [],
    };

    if (editingProduct) {
      onUpdate(editingProduct.id, product);
      toast.success('Produto atualizado com sucesso');
    } else {
      onAdd(product);
      toast.success('Produto adicionado com sucesso');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      onDelete(id);
      toast.success('Produto excluído');
    }
  };

  const addModulation = () => {
    setModulations([...modulations, { mod: { name: '', description: '' }, sizes: [{ description: '', dimensions: '', prices: createEmptyPrices() }] }]);
  };

  const removeModulation = (index: number) => {
    if (modulations.length > 1) {
      setModulations(modulations.filter((_, i) => i !== index));
    }
  };

  const updateModulation = (index: number, field: keyof NewModulation, value: string) => {
    const updated = [...modulations];
    updated[index].mod[field] = value;
    setModulations(updated);
  };

  const addSize = (modIndex: number) => {
    const updated = [...modulations];
    updated[modIndex].sizes.push({ description: '', dimensions: '', prices: createEmptyPrices() });
    setModulations(updated);
  };

  const removeSize = (modIndex: number, sizeIndex: number) => {
    const updated = [...modulations];
    if (updated[modIndex].sizes.length > 1) {
      updated[modIndex].sizes = updated[modIndex].sizes.filter((_, i) => i !== sizeIndex);
      setModulations(updated);
    }
  };

  const updateSize = (modIndex: number, sizeIndex: number, field: 'description' | 'dimensions', value: string) => {
    const updated = [...modulations];
    updated[modIndex].sizes[sizeIndex][field] = value;
    setModulations(updated);
  };

  const updateSizePrice = (modIndex: number, sizeIndex: number, tier: FabricTier, value: string) => {
    const updated = [...modulations];
    updated[modIndex].sizes[sizeIndex].prices[tier] = value;
    setModulations(updated);
  };

  const toggleBase = (base: string) => {
    const current = formData.availableBases;
    if (current.includes(base)) {
      setFormData({
        ...formData,
        availableBases: current.filter((b) => b !== base),
      });
    } else {
      setFormData({
        ...formData,
        availableBases: [...current, base],
      });
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filter products by factory first, then by search query
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by factory
    if (selectedFactory) {
      filtered = filtered.filter(p => p.factory === selectedFactory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.modulations.some((mod) => 
          mod.name.toLowerCase().includes(query) ||
          mod.sizes.some((size) => size.description.toLowerCase().includes(query))
        )
      );
    }
    
    return filtered;
  }, [products, selectedFactory, searchQuery]);

  // Group filtered products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Get total sizes count for a product
  const getTotalSizes = (product: Product) => {
    return product.modulations.reduce((acc, mod) => acc + mod.sizes.length, 0);
  };

  // Get price range for a product
  const getPriceRange = (product: Product) => {
    let min = Infinity;
    let max = 0;
    product.modulations.forEach(mod => {
      mod.sizes.forEach(size => {
        const priceB = size.prices['FX B'] || 0;
        const priceJ = size.prices['FX J'] || 0;
        if (priceB > 0 && priceB < min) min = priceB;
        if (priceJ > max) max = priceJ;
      });
    });
    return { min: min === Infinity ? 0 : min, max };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Catálogo de Produtos</h2>
          <div className="flex gap-2 flex-wrap">
            <BulkImporter onImportComplete={onRefresh || (() => {})} />
            <ExcelImporter onImportComplete={onRefresh || (() => {})} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
        
        {/* Factory Filter */}
        {availableFactories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Factory className="h-4 w-4" />
              <span>Fábrica:</span>
            </div>
            <Button
              variant={selectedFactory === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFactory('')}
            >
              Todas
            </Button>
            {availableFactories.map((factory) => (
              <Button
                key={factory}
                variant={selectedFactory === factory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFactory(factory)}
              >
                {factory}
              </Button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos por nome, código, categoria ou modulação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
          {selectedFactory && ` em "${selectedFactory}"`}
          {searchQuery && ` para "${searchQuery}"`}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Sofá Retrátil"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="Ex: 20488"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descrição do produto..."
                  />
                </div>
              </div>

              {/* Modulations */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Modulações *</Label>
                  <Button variant="outline" size="sm" onClick={addModulation}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Modulação
                  </Button>
                </div>
                
                {modulations.map((modData, modIndex) => (
                  <div key={modIndex} className="border rounded-lg p-4 space-y-4">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Label>Nome da Modulação</Label>
                        <Input
                          placeholder="Ex: 1B + PUFF BI"
                          value={modData.mod.name}
                          onChange={(e) => updateModulation(modIndex, 'name', e.target.value)}
                        />
                      </div>
                      {modulations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeModulation(modIndex)}
                          className="text-destructive mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Sizes for this modulation */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Tamanhos e Preços</Label>
                        <Button variant="outline" size="sm" onClick={() => addSize(modIndex)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Tamanho
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Informe os preços para cada faixa de tecido. Deixe em branco as faixas que não se aplicam.
                      </p>
                      
                      {modData.sizes.map((size, sizeIndex) => (
                        <div key={sizeIndex} className="bg-muted/50 p-3 rounded space-y-3">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs">Dimensões</Label>
                              <Input
                                placeholder="Ex: 1,05m + 0,80m"
                                value={size.dimensions}
                                onChange={(e) => updateSize(modIndex, sizeIndex, 'dimensions', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Descrição</Label>
                              <Input
                                placeholder="Descrição adicional"
                                value={size.description}
                                onChange={(e) => updateSize(modIndex, sizeIndex, 'description', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            {modData.sizes.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSize(modIndex, sizeIndex)}
                                className="h-8 w-8 text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Price grid for all fabric tiers */}
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {FABRIC_TIERS.map((tier) => (
                              <div key={tier} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{tier}</Label>
                                <Input
                                  type="number"
                                  placeholder="R$"
                                  value={size.prices[tier]}
                                  onChange={(e) => updateSizePrice(modIndex, sizeIndex, tier, e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Base Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasBase"
                    checked={formData.hasBase}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasBase: !!checked })
                    }
                  />
                  <Label htmlFor="hasBase">
                    Produto possui opções de base/acabamento?
                  </Label>
                </div>

                {formData.hasBase && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                    {BASE_OPTIONS.map((base) => (
                      <div key={base} className="flex items-center space-x-2">
                        <Checkbox
                          id={base}
                          checked={formData.availableBases.includes(base)}
                          onCheckedChange={() => toggleBase(base)}
                        />
                        <Label htmlFor={base} className="text-sm">
                          {base}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto cadastrado</p>
            <p className="text-sm">Clique em "Novo Produto" para começar</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedProducts).map(([category, categoryProducts]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 text-muted-foreground">
              {category}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryProducts.map((product) => {
                const priceRange = getPriceRange(product);
                return (
                  <Card key={product.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          {/* Product thumbnail */}
                          <ProductImage
                            productName={product.name}
                            imageUrl={product.imageUrl}
                            size="md"
                            className="shrink-0"
                          />
                          <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            {product.code && (
                              <p className="text-xs text-muted-foreground">Cód: {product.code}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <ProductImageUpload
                            productId={product.id}
                            productName={product.name}
                            currentImageUrl={product.imageUrl || null}
                            onImageUpdated={onRefresh || (() => {})}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {product.description && (
                        <p className="text-muted-foreground">{product.description}</p>
                      )}
                      <div>
                        <span className="font-medium">Modulações:</span> {product.modulations.length}
                      </div>
                      <div>
                        <span className="font-medium">Tamanhos:</span> {getTotalSizes(product)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Preços: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
                      </div>
                      {product.hasBase && (
                        <div className="text-xs">
                          <span className="font-medium">Bases:</span>{' '}
                          <span className="text-muted-foreground">
                            {product.availableBases.join(', ')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
