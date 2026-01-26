import { useState } from 'react';
import { Product, ProductModulation, FabricTier, FABRIC_TIERS } from '@/types/quote';
import { PRODUCT_CATEGORIES, BASE_OPTIONS } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Edit2, X, Package } from 'lucide-react';
import { toast } from 'sonner';

interface ProductManagerProps {
  products: Product[];
  onAdd: (product: Product) => void;
  onUpdate: (id: string, product: Product) => void;
  onDelete: (id: string) => void;
}

interface NewModulation {
  name: string;
  description: string;
  dimensions: string;
  priceB: string;
  priceE: string;
}

// Helper to create default prices from base prices
const createDefaultPrices = (priceB: number, priceE: number): Record<FabricTier, number> => {
  // Linear interpolation between B and E, then continue the pattern
  const step = (priceE - priceB) / 3;
  return {
    'FX B': priceB,
    'FX C': Math.round(priceB + step),
    'FX D': Math.round(priceB + step * 2),
    'FX E': priceE,
    'FX F': Math.round(priceE + step),
    'FX G': Math.round(priceE + step * 2),
    'FX H': Math.round(priceE + step * 3),
    'FX I': Math.round(priceE + step * 4),
    'FX J': Math.round(priceE + step * 6),
  };
};

export function ProductManager({
  products,
  onAdd,
  onUpdate,
  onDelete,
}: ProductManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Sofás' as string,
    hasBase: false,
    availableBases: [] as string[],
  });
  const [modulations, setModulations] = useState<NewModulation[]>([
    { name: '', description: '', dimensions: '', priceB: '', priceE: '' },
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
    setModulations([{ name: '', description: '', dimensions: '', priceB: '', priceE: '' }]);
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
    setModulations(
      product.modulations.map((m) => ({
        name: m.name,
        description: m.description,
        dimensions: m.dimensions,
        priceB: m.prices['FX B'].toString(),
        priceE: m.prices['FX E'].toString(),
      }))
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Informe o nome do produto');
      return;
    }

    const validModulations = modulations.filter((m) => m.name && m.priceB && m.priceE);
    if (validModulations.length === 0) {
      toast.error('Adicione pelo menos uma modulação com preços');
      return;
    }

    const productModulations: ProductModulation[] = validModulations.map((m) => ({
      name: m.name,
      description: m.description || m.name,
      dimensions: m.dimensions,
      prices: createDefaultPrices(parseFloat(m.priceB), parseFloat(m.priceE)),
    }));

    const product: Product = {
      id: editingProduct?.id || crypto.randomUUID(),
      code: formData.code || '',
      name: formData.name,
      description: formData.description,
      category: formData.category,
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
    setModulations([...modulations, { name: '', description: '', dimensions: '', priceB: '', priceE: '' }]);
  };

  const updateModulation = (
    index: number,
    field: keyof NewModulation,
    value: string
  ) => {
    const updated = [...modulations];
    updated[index][field] = value;
    setModulations(updated);
  };

  const removeModulation = (index: number) => {
    if (modulations.length > 1) {
      setModulations(modulations.filter((_, i) => i !== index));
    }
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

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Produtos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Modulações e Preços *</Label>
                  <Button variant="outline" size="sm" onClick={addModulation}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Informe o preço da FX B e FX E. Os demais serão calculados automaticamente.
                </p>
                {modulations.map((mod, index) => (
                  <div key={index} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome (ex: 2,50m)"
                        value={mod.name}
                        onChange={(e) => updateModulation(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Dimensões"
                        value={mod.dimensions}
                        onChange={(e) => updateModulation(index, 'dimensions', e.target.value)}
                        className="flex-1"
                      />
                      {modulations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeModulation(index)}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Preço FX B</Label>
                        <Input
                          type="number"
                          placeholder="R$"
                          value={mod.priceB}
                          onChange={(e) => updateModulation(index, 'priceB', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Preço FX E</Label>
                        <Input
                          type="number"
                          placeholder="R$"
                          value={mod.priceE}
                          onChange={(e) => updateModulation(index, 'priceE', e.target.value)}
                        />
                      </div>
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
      </div>

      {/* Product List */}
      {products.length === 0 ? (
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
              {categoryProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.code && (
                          <p className="text-xs text-muted-foreground">Cód: {product.code}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
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
                    <div className="text-xs text-muted-foreground">
                      Preços: {formatCurrency(product.modulations[0]?.prices['FX B'] || 0)} - {formatCurrency(product.modulations[product.modulations.length - 1]?.prices['FX J'] || 0)}
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
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
