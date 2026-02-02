import { QuoteItem } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Trash2, Factory } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import { Badge } from '@/components/ui/badge';

interface QuoteCartProps {
  items: QuoteItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateObservations: (id: string, observations: string) => void;
  onRemoveItem: (id: string) => void;
}

export function QuoteCart({ items, onUpdateQuantity, onUpdateObservations, onRemoveItem }: QuoteCartProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Itens do Orçamento
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum item adicionado ao orçamento
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-muted/30 border rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-3 flex-1">
                    <ProductImage productName={item.productName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">
                          {index + 1}. {item.productName}
                        </h4>
                        {item.factory && (
                          <Badge variant="secondary" className="text-xs">
                            <Factory className="h-3 w-3 mr-1" />
                            {item.factory}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Modulação: {item.modulation}
                      </p>
                      {item.base && (
                        <p className="text-sm text-muted-foreground">
                          Base: {item.base}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Tecido: {item.fabricDescription} ({item.fabricTier})
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Observations field */}
                <div className="mb-3">
                  <Textarea
                    placeholder="Observações do item (opcional)..."
                    value={item.observations || ''}
                    onChange={(e) => onUpdateObservations(item.id, e.target.value)}
                    className="text-sm min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Qtd:</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                      }
                      className="w-20 h-8 text-center"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} x {item.quantity}
                    </div>
                    <div className="font-bold text-primary">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-primary text-primary-foreground p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">SUBTOTAL</span>
                <span className="text-2xl font-bold">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
