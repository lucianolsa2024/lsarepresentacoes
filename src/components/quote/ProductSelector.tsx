import { useState, useMemo } from 'react';
import { Product, QuoteItem, FabricTier, FABRIC_TIERS, ModulationSize } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, X, Package, Search } from 'lucide-react';

interface ProductSelectorProps {
  products: Product[];
  onAddItem: (item: QuoteItem) => void;
}

export function ProductSelector({ products, onAddItem }: ProductSelectorProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [config, setConfig] = useState({
    modulationId: '',
    sizeId: '',
    base: '',
    fabricTier: 'FX E' as FabricTier,
    fabricDescription: '',
  });

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setConfig({ modulationId: '', sizeId: '', base: '', fabricTier: 'FX E', fabricDescription: '' });
  };

  // Get selected modulation
  const selectedModulation = useMemo(() => {
    if (!selectedProduct || !config.modulationId) return null;
    return selectedProduct.modulations.find((m) => m.id === config.modulationId);
  }, [selectedProduct, config.modulationId]);

  // Get available sizes for selected modulation
  const availableSizes = useMemo(() => {
    if (!selectedModulation) return [];
    
    // If base is selected, filter sizes by base
    if (config.base) {
      return selectedModulation.sizes.filter(s => s.base === config.base);
    }
    
    // If no base selected, show all sizes
    return selectedModulation.sizes;
  }, [selectedModulation, config.base]);

  // Get selected size
  const selectedSize = useMemo(() => {
    if (!selectedModulation || !config.sizeId) return null;
    return selectedModulation.sizes.find((s) => s.id === config.sizeId);
  }, [selectedModulation, config.sizeId]);

  // Get unique bases for selected modulation
  const availableBases = useMemo(() => {
    if (!selectedModulation) return [];
    const bases = new Set<string>();
    selectedModulation.sizes.forEach(s => {
      if (s.base) bases.add(s.base);
    });
    return Array.from(bases);
  }, [selectedModulation]);

  const handleConfirm = () => {
    if (!selectedProduct || !config.modulationId || !config.sizeId || !config.fabricDescription) return;

    const modulation = selectedProduct.modulations.find(m => m.id === config.modulationId);
    const size = modulation?.sizes.find(s => s.id === config.sizeId);
    if (!modulation || !size) return;

    const price = size.prices[config.fabricTier] || 0;

    const item: QuoteItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      modulation: modulation.name,
      modulationId: config.modulationId,
      sizeId: config.sizeId,
      sizeDescription: size.description,
      base: size.base || config.base,
      fabricTier: config.fabricTier,
      fabricDescription: config.fabricDescription,
      price,
      quantity: 1,
    };

    onAddItem(item);
    setSelectedProduct(null);
    setConfig({ modulationId: '', sizeId: '', base: '', fabricTier: 'FX E', fabricDescription: '' });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Get current price based on selected size and tier
  const getCurrentPrice = () => {
    if (!selectedSize) return 0;
    return selectedSize.prices[config.fabricTier] || 0;
  };

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Reset size when modulation or base changes
  const handleModulationChange = (value: string) => {
    setConfig({ ...config, modulationId: value, sizeId: '', base: '' });
  };

  const handleBaseChange = (value: string) => {
    setConfig({ ...config, base: value, sizeId: '' });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Adicionar Produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedProduct ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto por nome, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-4">
              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left bg-muted/50 p-4 rounded-lg hover:bg-muted transition flex justify-between items-center group"
                      >
                        <div>
                          <span className="font-semibold">{product.name}</span>
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        </div>
                        <ChevronRight className="text-primary group-hover:translate-x-1 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(groupedProducts).length === 0 && searchTerm && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum produto encontrado para "{searchTerm}"
                </p>
              )}
              {products.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum produto cadastrado. Cadastre produtos na aba "Produtos".
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg">{selectedProduct.name}</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProduct(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Step 1: Modulation */}
              <div className="space-y-2">
                <Label>1. Modulação *</Label>
                <Select
                  value={config.modulationId}
                  onValueChange={handleModulationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modulação..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.modulations.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Base (if available) */}
              {selectedModulation && availableBases.length > 0 && (
                <div className="space-y-2">
                  <Label>2. Acabamento da Base *</Label>
                  <Select
                    value={config.base}
                    onValueChange={handleBaseChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o acabamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBases.map((base) => (
                        <SelectItem key={base} value={base}>
                          {base}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 3: Size/Dimensions */}
              {selectedModulation && (availableBases.length === 0 || config.base) && (
                <div className="space-y-2">
                  <Label>{availableBases.length > 0 ? '3' : '2'}. Tamanho *</Label>
                  <Select
                    value={config.sizeId}
                    onValueChange={(value) => setConfig({ ...config, sizeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.dimensions || size.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 4: Fabric Tier */}
              {config.sizeId && (
                <div className="space-y-2">
                  <Label>{availableBases.length > 0 ? '4' : '3'}. Faixa de Tecido *</Label>
                  <Select
                    value={config.fabricTier}
                    onValueChange={(value) =>
                      setConfig({ ...config, fabricTier: value as FabricTier })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FABRIC_TIERS.filter(tier => {
                        // Only show tiers that have prices > 0
                        const price = selectedSize?.prices[tier] || 0;
                        return price > 0;
                      }).map((tier) => {
                        const price = selectedSize?.prices[tier] || 0;
                        return (
                          <SelectItem key={tier} value={tier}>
                            {tier} - {formatCurrency(price)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 5: Fabric Description */}
              {config.sizeId && (
                <div className="space-y-2">
                  <Label>
                    {availableBases.length > 0 ? '5' : '4'}. Descrição do Tecido *
                  </Label>
                  <Input
                    placeholder="Ex: Suede cinza, Veludo azul marinho..."
                    value={config.fabricDescription}
                    onChange={(e) =>
                      setConfig({ ...config, fabricDescription: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Price Preview */}
              {config.sizeId && (
                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <span className="text-sm text-muted-foreground">Preço:</span>
                  <span className="text-xl font-bold text-primary ml-2">
                    {formatCurrency(getCurrentPrice())}
                  </span>
                </div>
              )}

              <Button
                onClick={handleConfirm}
                disabled={!config.modulationId || !config.sizeId || !config.fabricDescription}
                className="w-full"
              >
                Confirmar Item
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
