import { useState, useMemo } from 'react';
import { Product, QuoteItem, FabricTier, FABRIC_TIERS, TABLE_TIERS, isTableCategory } from '@/types/quote';
import { FABRICS, getFabricsByTier } from '@/data/fabrics';
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
  const [fabricSearch, setFabricSearch] = useState('');
  const [config, setConfig] = useState({
    modulationId: '',
    sizeId: '',
    base: '',
    fabricTier: '' as FabricTier | '',
    fabricCode: '',
  });

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setConfig({ modulationId: '', sizeId: '', base: '', fabricTier: '', fabricCode: '' });
    setFabricSearch('');
  };

  // Get selected modulation
  const selectedModulation = useMemo(() => {
    if (!selectedProduct || !config.modulationId) return null;
    return selectedProduct.modulations.find((m) => m.id === config.modulationId);
  }, [selectedProduct, config.modulationId]);

  // Get available sizes for selected modulation
  // For CAIXA products, each row is unique (description includes CAIXA tier)
  const availableSizes = useMemo(() => {
    if (!selectedModulation) return [];
    
    let sizes = selectedModulation.sizes;
    
    if (config.base) {
      sizes = sizes.filter(s => s.base === config.base);
    }
    
    // Check if this is a CAIXA product (description contains "CAIXA:")
    const hasCaixa = sizes.some(s => s.description.toUpperCase().includes('CAIXA:'));

    // Check if this size already carries a built-in finish/top definition
    const hasBuiltInFinish = sizes.some(s => /\b(TAMPO|TOPO):/i.test(s.description));

    if (hasCaixa || hasBuiltInFinish) {
      // For CAIXA products or products with built-in finish info, each row is unique - don't deduplicate
      return sizes;
    }

    // For other products, deduplicate by full description to preserve unique variants
    // (e.g., "AP MARMORE", "GIRATÓRIA", different finishes with same dimensions)
    const uniqueSizes = new Map<string, typeof sizes[0]>();
    sizes.forEach(size => {
      const key = size.description;

      if (!uniqueSizes.has(key)) {
        uniqueSizes.set(key, size);
      }
    });

    return Array.from(uniqueSizes.values());
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

  // Check if the selected product is a table
  const isTable = useMemo(() => {
    return selectedProduct ? isTableCategory(selectedProduct.category) : false;
  }, [selectedProduct]);

  // Check if the selected product is a carpet (no fabric selection needed)
  const isCarpet = useMemo(() => {
    return selectedProduct?.category === 'Tapetes';
  }, [selectedProduct]);

  // Check if the selected size already includes finish info (TAMPO:/TOPO:) - skip fabric/finish step
  const hasBuiltInFinishInSize = useMemo(() => {
    return /\b(TAMPO|TOPO):/i.test(selectedSize?.description ?? '');
  }, [selectedSize]);

  const builtInFinishLabel = useMemo(() => {
    const match = selectedSize?.description.match(/\b(TAMPO|TOPO):\s*([^,\n]+)/i);
    if (!match) return '';
    return `${match[1].toUpperCase()}: ${match[2].trim()}`;
  }, [selectedSize]);

  // Get available fabric/finish tiers (only those with price > 0)
  const availableFabricTiers = useMemo(() => {
    if (!selectedSize) return [];

    // If the finish/top is already in the size description, no need for separate selection
    if (hasBuiltInFinishInSize) return [];

    if (isTable) {
      return TABLE_TIERS.filter(tier => {
        const price = selectedSize.prices[tier.key] || 0;
        return price > 0;
      });
    }

    return FABRIC_TIERS.filter(tier => {
      const price = selectedSize.prices[tier] || 0;
      return price > 0;
    });
  }, [selectedSize, isTable, hasBuiltInFinishInSize]);

  const hasOnlySemTecOption = useMemo(() => {
    if (!selectedSize || hasBuiltInFinishInSize || isCarpet) return false;

    const tiers = isTable
      ? (availableFabricTiers as Array<{ key: FabricTier; label: string }>).map(tier => tier.key)
      : (availableFabricTiers as FabricTier[]);

    return tiers.length === 1 && tiers[0] === 'SEM TEC';
  }, [availableFabricTiers, hasBuiltInFinishInSize, isCarpet, isTable, selectedSize]);

  const effectiveFabricTier = hasOnlySemTecOption ? 'SEM TEC' : config.fabricTier;

  const getFirstAvailablePrice = (prices: Record<FabricTier, number>) => {
    const priceEntry = [...FABRIC_TIERS].find(key => (prices[key] || 0) > 0);
    return priceEntry ? prices[priceEntry] : 0;
  };

  // Get fabrics for selected tier, filtered by search
  const availableFabrics = useMemo(() => {
    if (!effectiveFabricTier || effectiveFabricTier === 'SEM TEC') return [];
    const tierFabrics = getFabricsByTier(effectiveFabricTier as FabricTier);

    if (!fabricSearch.trim()) return tierFabrics;

    const search = fabricSearch.toLowerCase().trim();
    return tierFabrics.filter(f =>
      f.code.toLowerCase().includes(search) ||
      (f.notes && f.notes.toLowerCase().includes(search))
    );
  }, [effectiveFabricTier, fabricSearch]);

  const handleConfirm = () => {
    const needsFabricTier = !hasBuiltInFinishInSize && !isCarpet && !hasOnlySemTecOption;
    const isSemTec = effectiveFabricTier === 'SEM TEC';
    const needsFabricCode = !isTable && !hasBuiltInFinishInSize && !isCarpet && !isSemTec;

    if (!selectedProduct || !config.modulationId || !config.sizeId) return;
    if (needsFabricTier && !effectiveFabricTier) return;
    if (needsFabricCode && !config.fabricCode) return;

    const modulation = selectedProduct.modulations.find(m => m.id === config.modulationId);
    const size = modulation?.sizes.find(s => s.id === config.sizeId);
    if (!modulation || !size) return;

    let price: number;
    let fabricDescription: string;

    if (isCarpet) {
      price = size.prices['SEM TEC'] || 0;
      fabricDescription = 'Tapete - sem tecido';
    } else if (hasBuiltInFinishInSize) {
      price = getFirstAvailablePrice(size.prices);
      fabricDescription = builtInFinishLabel || 'Acabamento incluído';
    } else {
      price = size.prices[effectiveFabricTier as FabricTier] || 0;

      if (isSemTec) {
        fabricDescription = 'Sem tecido';
      } else if (isTable) {
        const tableTier = TABLE_TIERS.find(t => t.key === effectiveFabricTier);
        fabricDescription = tableTier?.label || effectiveFabricTier;
      } else {
        fabricDescription = config.fabricCode;
      }
    }

    const item: QuoteItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      factory: selectedProduct.factory || '',
      modulation: modulation.name,
      modulationId: config.modulationId,
      sizeId: config.sizeId,
      sizeDescription: size.description,
      base: size.base || config.base,
      fabricTier: (isCarpet ? 'SEM TEC' : hasBuiltInFinishInSize ? 'SEM TEC' : effectiveFabricTier) as FabricTier,
      fabricDescription,
      price,
      quantity: 1,
      observations: '',
      imageUrl: selectedProduct.imageUrl,
    };

    onAddItem(item);
    setSelectedProduct(null);
    setConfig({ modulationId: '', sizeId: '', base: '', fabricTier: '', fabricCode: '' });
    setFabricSearch('');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCurrentPrice = () => {
    if (!selectedSize) return 0;
    if (isCarpet) return selectedSize.prices['SEM TEC'] || 0;
    if (hasBuiltInFinishInSize) return getFirstAvailablePrice(selectedSize.prices);
    if (hasOnlySemTecOption) return selectedSize.prices['SEM TEC'] || 0;
    if (!effectiveFabricTier) return 0;
    return selectedSize.prices[effectiveFabricTier as FabricTier] || 0;
  };

  const shouldShowFabricTierStep = Boolean(config.sizeId) && !hasBuiltInFinishInSize && !isCarpet && !hasOnlySemTecOption;
  const shouldShowFabricCodeStep = Boolean(effectiveFabricTier) && !isTable && effectiveFabricTier !== 'SEM TEC';
  const shouldShowItemSummary = Boolean(
    (isCarpet && config.sizeId) ||
      hasBuiltInFinishInSize ||
      (isTable && effectiveFabricTier) ||
      (!isTable && !isCarpet && (effectiveFabricTier === 'SEM TEC' || config.fabricCode))
  );
  const shouldShowPricePreview = Boolean(!shouldShowItemSummary && !isTable && effectiveFabricTier && !config.fabricCode);
  const isConfirmDisabled =
    !config.modulationId ||
    !config.sizeId ||
    (shouldShowFabricTierStep && !effectiveFabricTier) ||
    (shouldShowFabricCodeStep && !config.fabricCode);

  // Filter products by search term (no factory filter - show all)
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

  const handleModulationChange = (value: string) => {
    setConfig({ ...config, modulationId: value, sizeId: '', base: '', fabricTier: '', fabricCode: '' });
    setFabricSearch('');
  };

  const handleBaseChange = (value: string) => {
    setConfig({ ...config, base: value, sizeId: '', fabricTier: '', fabricCode: '' });
    setFabricSearch('');
  };

  const handleSizeChange = (value: string) => {
    setConfig({ ...config, sizeId: value, fabricTier: '', fabricCode: '' });
    setFabricSearch('');
  };

  const handleFabricTierChange = (value: string) => {
    setConfig({ ...config, fabricTier: value as FabricTier, fabricCode: '' });
    setFabricSearch('');
  };

  const handleFabricSelect = (code: string) => {
    setConfig({ ...config, fabricCode: code });
  };

  const getStepNumber = (step: 'base' | 'size' | 'fabricTier' | 'fabricCode') => {
    const hasBase = availableBases.length > 0;
    switch (step) {
      case 'base': return 2;
      case 'size': return hasBase ? 3 : 2;
      case 'fabricTier': return hasBase ? 4 : 3;
      case 'fabricCode': return hasBase ? 5 : 4;
      default: return 0;
    }
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
        {/* Product Selection - Direct search without factory step */}
        {!selectedProduct ? (
          <div className="space-y-4">
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
                        className="w-full text-left bg-muted/50 p-3 rounded-lg hover:bg-muted transition flex justify-between items-center group"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold block">{product.name}</span>
                          {product.description && (
                            <span className="text-sm text-muted-foreground line-clamp-1">{product.description}</span>
                          )}
                        </div>
                        <ChevronRight className="text-primary group-hover:translate-x-1 transition flex-shrink-0 ml-2" />
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
                  <Label>{getStepNumber('base')}. Acabamento da Base *</Label>
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
                  <Label>{getStepNumber('size')}. {isCarpet ? 'Medida' : 'Tamanho'} *</Label>
                  <Select
                    value={config.sizeId}
                    onValueChange={handleSizeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.map((size) => {
                        // Check if this is a CAIXA product
                        const isCaixa = size.description.toUpperCase().includes('CAIXA:');
                        
                        let displayText: string;
                        
                        if (isCaixa) {
                          // For CAIXA products, extract the CAIXA tier from description
                          // Example: "SONA POL 1,05 m x 0,90 m x 0,71 m CAIXA: FX B"
                          const caixaMatch = size.description.match(/CAIXA:\s*(FX\s*\w+|COURO)/i);
                          const caixaTier = caixaMatch ? caixaMatch[1].toUpperCase() : '';
                          
                          // Build dimensions string
                          const dims = [
                            size.length && `${size.length}`,
                            size.depth && `${size.depth}`,
                            size.height && `${size.height}`,
                          ].filter(Boolean).join(' × ');
                          
                          displayText = dims 
                            ? `${dims} - CAIXA: ${caixaTier}`
                            : `${size.dimensions || ''} - CAIXA: ${caixaTier}`;
                        } else {
                          // For regular products, show dimensions
                          const dims = [
                            size.length && `L: ${size.length}`,
                            size.depth && `P: ${size.depth}`,
                            size.height && `A: ${size.height}`,
                          ].filter(Boolean).join(' × ');
                          
                          // Extract base variation to display (PE, BASE GIRATORIA)
                          const descUpper = size.description.toUpperCase();
                          let baseVariation = '';
                          if (descUpper.includes('BASE GIRATORIA') || descUpper.includes('GIRATÓRIA') || descUpper.includes('GIRATORIA')) {
                            baseVariation = 'BASE GIRATÓRIA';
                          } else if ((descUpper.includes(' PE') || descUpper.endsWith(' PE') || descUpper.includes('PÉ')) && !descUpper.includes('CAIXA')) {
                            baseVariation = 'PÉ';
                          }
                          
                          const baseDims = dims || size.dimensions || size.description;
                          displayText = baseVariation ? `${baseDims} - ${baseVariation}` : baseDims;
                        }
                        
                        return (
                          <SelectItem key={size.id} value={size.id}>
                            {size.description}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 4: Finish/Fabric Tier */}
              {shouldShowFabricTierStep && (
                <div className="space-y-2">
                  <Label>{getStepNumber('fabricTier')}. {isTable ? 'Acabamento' : 'Faixa de Tecido'} *</Label>
                  <Select
                    value={config.fabricTier}
                    onValueChange={handleFabricTierChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isTable ? 'Selecione o acabamento...' : 'Selecione a faixa...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isTable ? (
                        (availableFabricTiers as Array<{ key: FabricTier; label: string }>).map((tier) => {
                          const price = selectedSize?.prices[tier.key] || 0;
                          return (
                            <SelectItem key={tier.key} value={tier.key}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{formatCurrency(price)}</span>
                                <span className="text-xs text-muted-foreground">{tier.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })
                      ) : (
                        (availableFabricTiers as FabricTier[]).map((tier) => {
                          const price = selectedSize?.prices[tier] || 0;
                          const fabricCount = getFabricsByTier(tier).length;
                          return (
                            <SelectItem key={tier} value={tier}>
                              {tier} - {formatCurrency(price)} ({fabricCount} tecidos)
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 5: Fabric Selection */}
              {shouldShowFabricCodeStep && (
                <div className="space-y-2">
                  <Label>{getStepNumber('fabricCode')}. Tecido *</Label>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tecido..."
                      value={fabricSearch}
                      onChange={(e) => setFabricSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {availableFabrics.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        Nenhum tecido encontrado
                      </div>
                    ) : (
                      <div className="divide-y">
                        {availableFabrics.map((fabric) => (
                          <button
                            key={fabric.code}
                            type="button"
                            onClick={() => handleFabricSelect(fabric.code)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition ${
                              config.fabricCode === fabric.code ? 'bg-primary/10 text-primary font-medium' : ''
                            }`}
                          >
                            <span>{fabric.code}</span>
                            {fabric.notes && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({fabric.notes})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {config.fabricCode && (
                    <div className="text-sm text-primary font-medium">
                      Selecionado: {config.fabricCode}
                    </div>
                  )}
                </div>
              )}

              {/* Item Summary */}
              {shouldShowItemSummary && (() => {
                const isCaixaProduct = selectedSize?.description.toUpperCase().includes('CAIXA:');
                const caixaMatch = selectedSize?.description.match(/CAIXA:\s*(FX\s*\w+|COURO)/i);
                const caixaTier = caixaMatch ? caixaMatch[1].toUpperCase().replace(/\s+/g, ' ') : '';
                const cleanDimensions = selectedSize?.dimensions ||
                  [selectedSize?.length, selectedSize?.depth, selectedSize?.height]
                    .filter(Boolean)
                    .join(' × ');
                const tableTierLabel = isTable
                  ? TABLE_TIERS.find(t => t.key === effectiveFabricTier)?.label
                  : null;

                return (
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                    <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Resumo do Item
                    </h5>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Produto:</span>
                        <span className="font-medium">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modulação:</span>
                        <span className="font-medium">{selectedModulation?.name}</span>
                      </div>
                      {config.base && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base:</span>
                          <span className="font-medium">{config.base}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isCarpet ? 'Medida:' : 'Tamanho:'}</span>
                        <span className="font-medium">{isCarpet ? selectedSize?.description : cleanDimensions}</span>
                      </div>

                      {isTable && (tableTierLabel || builtInFinishLabel) && (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Acabamento
                          </div>
                          <div className="font-medium text-primary text-xs">
                            {builtInFinishLabel || tableTierLabel}
                          </div>
                        </div>
                      )}

                      {!isTable && !isCarpet && isCaixaProduct ? (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Tecidos
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Caixa (estrutura):</span>
                            <span className="font-medium text-accent-foreground">{caixaTier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Corpo (assento):</span>
                            <span className="font-medium text-primary">{effectiveFabricTier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Código do Tecido:</span>
                            <span className="font-medium">{config.fabricCode}</span>
                          </div>
                        </div>
                      ) : !isTable && !isCarpet && (
                        <>
                          {effectiveFabricTier === 'SEM TEC' ? (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tecido:</span>
                              <span className="font-medium">Sem tecido</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Faixa de Tecido:</span>
                                <span className="font-medium text-primary">{effectiveFabricTier}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tecido:</span>
                                <span className="font-medium">{config.fabricCode}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Preço unitário:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(getCurrentPrice())}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Simple price preview */}
              {shouldShowPricePreview && (
                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <span className="text-sm text-muted-foreground">
                    {effectiveFabricTier === 'SEM TEC' ? 'Preço do item sem tecido:' : `Preço da faixa ${effectiveFabricTier}:`}
                  </span>
                  <span className="text-xl font-bold text-primary ml-2">
                    {formatCurrency(getCurrentPrice())}
                  </span>
                </div>
              )}

              <Button
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
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
