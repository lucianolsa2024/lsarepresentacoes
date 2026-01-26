import { useState } from 'react';
import { Product, QuoteItem } from '@/types/quote';
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
import { ChevronRight, X, Package } from 'lucide-react';

interface ProductSelectorProps {
  products: Product[];
  onAddItem: (item: QuoteItem) => void;
}

export function ProductSelector({ products, onAddItem }: ProductSelectorProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [config, setConfig] = useState({
    modulation: '',
    base: '',
    fabric: '',
  });

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setConfig({ modulation: '', base: '', fabric: '' });
  };

  const handleConfirm = () => {
    if (!selectedProduct || !config.modulation || !config.fabric) return;

    const modulationData = selectedProduct.modulations.find(
      (m) => m.name === config.modulation
    );
    const price = modulationData?.price || 0;

    const item: QuoteItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      modulation: config.modulation,
      base: config.base,
      fabric: config.fabric,
      price,
      quantity: 1,
    };

    onAddItem(item);
    setSelectedProduct(null);
    setConfig({ modulation: '', base: '', fabric: '' });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

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
            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado. Cadastre produtos na aba "Produtos".
              </p>
            )}
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
              <div className="space-y-2">
                <Label>1. Modulação *</Label>
                <Select
                  value={config.modulation}
                  onValueChange={(value) =>
                    setConfig({ ...config, modulation: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modulação..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.modulations.map((mod) => (
                      <SelectItem key={mod.name} value={mod.name}>
                        {mod.name} - {formatCurrency(mod.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct.hasBase && (
                <div className="space-y-2">
                  <Label>2. Acabamento da Base</Label>
                  <Select
                    value={config.base}
                    onValueChange={(value) => setConfig({ ...config, base: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o acabamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.availableBases.map((base) => (
                        <SelectItem key={base} value={base}>
                          {base}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {selectedProduct.hasBase ? '3' : '2'}. Tecido / Revestimento *
                </Label>
                <Input
                  placeholder="Ex: Suede cinza, Veludo azul marinho..."
                  value={config.fabric}
                  onChange={(e) => setConfig({ ...config, fabric: e.target.value })}
                />
              </div>

              <Button
                onClick={handleConfirm}
                disabled={!config.modulation || !config.fabric}
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
