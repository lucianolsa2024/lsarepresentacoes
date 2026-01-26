import { useState } from 'react';
import { Product, ProductModulation } from '@/types/quote';
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
  price: string;
}

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
    description: '',
    category: 'Sofás' as Product['category'],
    hasBase: false,
    availableBases: [] as string[],
  });
  const [modulations, setModulations] = useState<NewModulation[]>([
    { name: '', price: '' },
  ]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Sofás',
      hasBase: false,
      availableBases: [],
    });
    setModulations([{ name: '', price: '' }]);
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
      description: product.description,
      category: product.category,
      hasBase: product.hasBase,
      availableBases: product.availableBases,
    });
    setModulations(
      product.modulations.map((m) => ({
        name: m.name,
        price: m.price.toString(),
      }))
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Informe o nome do produto');
      return;
    }

    const validModulations = modulations.filter((m) => m.name && m.price);
    if (validModulations.length === 0) {
      toast.error('Adicione pelo menos uma modulação com preço');
      return;
    }

    const productModulations: ProductModulation[] = validModulations.map((m) => ({
      name: m.name,
      price: parseFloat(m.price),
    }));

    const product: Product = {
      id: editingProduct?.id || crypto.randomUUID(),
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
    setModulations([...modulations, { name: '', price: '' }]);
  };

  const updateModulation = (
    index: number,
    field: 'name' | 'price',
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
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value as Product['category'],
                      })
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
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição do produto..."
                  rows={2}
                />
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
                {modulations.map((mod, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Ex: 2,50m ou 3 lugares"
                      value={mod.name}
                      onChange={(e) =>
                        updateModulation(index, 'name', e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Preço"
                      value={mod.price}
                      onChange={(e) =>
                        updateModulation(index, 'price', e.target.value)
                      }
                      className="w-32"
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
                      <div
                        key={base}
                        className="flex items-center space-x-2"
                      >
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
                      <CardTitle className="text-lg">{product.name}</CardTitle>
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
                      <p className="text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    <div>
                      <span className="font-medium">Modulações:</span>
                      <ul className="ml-4 mt-1 space-y-0.5">
                        {product.modulations.map((mod) => (
                          <li key={mod.name}>
                            {mod.name}: {formatCurrency(mod.price)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {product.hasBase && (
                      <div>
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
