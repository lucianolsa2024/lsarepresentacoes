import { useState, useMemo } from 'react';
import {
  Product, FabricTier, FABRIC_TIERS, TABLE_TIERS,
  isTableCategory, isWoodProduct, ModulationFinish,
  DISCOUNT_TIER_OPTIONS, DiscountTier
} from '@/types/quote';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, X, ChevronRight, Pencil, ArrowLeftRight, Package } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';

interface PriceConsultationProps {
  products: Product[];
}

const DISCOUNT_RATES: Record<DiscountTier, number> = {
  diamante: 0.15,
  ouro: 0.142,
  prata: 0.08,
  bronze: 0.05,
};

const PRAZO_OPTIONS = ['7d', '15d', '30d', '45d', '60d', '90d'];

interface Piece {
  id: string;
  modulationId: string;
  modulationName: string;
  sizeId: string;
  sizeLabel: string;
  tierKey: string;
  tierLabel: string;
  price: number;
  quantity: number;
}

interface ProductSet {
  id: string;
  product: Product;
  pieces: Piece[];
}

interface GlobalConfig {
  discountTier: DiscountTier | '';
  prazo: string;
  markup: number;
}

interface PieceDraft {
  modulationId: string;
  sizeId: string;
  tierKey: string;
}

const EMPTY_DRAFT: PieceDraft = { modulationId: '', sizeId: '', tierKey: '' };

export function PriceConsultation({ products }: PriceConsultationProps) {
  const [sets, setSets] = useState<ProductSet[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ discountTier: '', prazo: '30d', markup: 0 });
  const [mode, setMode] = useState<'selectProduct' | 'addPiece' | null>(null);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [editingPiece, setEditingPiece] = useState<{ setId: string; pieceId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pieceDraft, setPieceDraft] = useState<PieceDraft>(EMPTY_DRAFT);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const activeSet = sets.find(s => s.id === activeSetId) || null;
  const activeProduct = activeSet?.product || null;

  const isWood = activeProduct ? isWoodProduct(activeProduct.factory) : false;
  const isTable = activeProduct ? isTableCategory(activeProduct.category) : false;
  const isCarpet = activeProduct?.category === 'Tapetes';

  const draftModulation = useMemo(() =>
    activeProduct?.modulations.find(m => m.id === pieceDraft.modulationId),
  [activeProduct, pieceDraft.modulationId]);

  const draftSize = useMemo(() =>
    draftModulation?.sizes.find(s => s.id === pieceDraft.sizeId),
  [draftModulation, pieceDraft.sizeId]);

  const hasBuiltInFinish = /\b(TAMPO|TOPO):/i.test(draftSize?.description ?? '');

  const draftFinishes: ModulationFinish[] = useMemo(() =>
    isWood && draftSize ? (draftSize.finishes || []) : [],
  [isWood, draftSize]);

  const availableTiers = useMemo(() => {
    if (!draftSize) return [];
    if (isWood) return draftFinishes.map(f => ({ key: f.id, label: f.finishName, price: f.price }));
    if (hasBuiltInFinish) {
      const m = draftSize.description.match(/\b(TAMPO|TOPO):\s*([^,\n]+)/i);
      const label = m ? `${m[1].toUpperCase()}: ${m[2].trim()}` : 'Acabamento incluído';
      const price = draftSize.prices['SEM TEC'] || 0;
      return [{ key: 'BUILT_IN', label, price }];
    }
    if (isCarpet) return [{ key: 'SEM TEC', label: 'Sem tecido', price: draftSize.prices['SEM TEC'] || 0 }];
    if (isTable) {
      return TABLE_TIERS
        .filter(t => (draftSize.prices[t.key] || 0) > 0)
        .map(t => ({ key: t.key, label: t.label, price: draftSize.prices[t.key] }));
    }
    return FABRIC_TIERS
      .filter(t => (draftSize.prices[t] || 0) > 0)
      .map(t => ({ key: t, label: t, price: draftSize.prices[t] }));
  }, [draftSize, isWood, isTable, isCarpet, hasBuiltInFinish, draftFinishes]);

  const selectedTier = availableTiers.find(t => t.key === pieceDraft.tierKey);
  const draftPrice = selectedTier?.price || 0;
  const isPieceReady = Boolean(pieceDraft.modulationId && pieceDraft.sizeId && pieceDraft.tierKey && draftPrice > 0);

  const setTotal = (set: ProductSet) =>
    set.pieces.reduce((acc, p) => acc + p.price * p.quantity, 0);

  const applyFactors = (price: number) => {
    const rate = globalConfig.discountTier ? DISCOUNT_RATES[globalConfig.discountTier] : 0;
    return price * (1 - rate) * (1 + globalConfig.markup / 100);
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const t = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(t) ||
      p.code.toLowerCase().includes(t) ||
      p.category.toLowerCase().includes(t)
    );
  }, [products, searchTerm]);

  const groupedProducts = filteredProducts.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  const selectProduct = (product: Product) => {
    const newSet: ProductSet = { id: crypto.randomUUID(), product, pieces: [] };
    setSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
    setMode('addPiece');
    setPieceDraft(EMPTY_DRAFT);
    setSearchTerm('');
  };

  const confirmPiece = () => {
    if (!activeSetId || !isPieceReady || !draftModulation || !draftSize || !selectedTier) return;

    const piece: Piece = {
      id: crypto.randomUUID(),
      modulationId: pieceDraft.modulationId,
      modulationName: draftModulation.name,
      sizeId: pieceDraft.sizeId,
      sizeLabel: isWood ? (draftSize.dimensions || draftSize.description) : draftSize.description,
      tierKey: pieceDraft.tierKey,
      tierLabel: selectedTier.label,
      price: selectedTier.price,
      quantity: 1,
    };

    if (editingPiece && editingPiece.setId === activeSetId) {
      setSets(prev => prev.map(s =>
        s.id === activeSetId
          ? { ...s, pieces: s.pieces.map(p => p.id === editingPiece.pieceId ? { ...piece, id: p.id, quantity: p.quantity } : p) }
          : s
      ));
      setEditingPiece(null);
    } else {
      setSets(prev => prev.map(s =>
        s.id === activeSetId ? { ...s, pieces: [...s.pieces, piece] } : s
      ));
    }

    setPieceDraft(EMPTY_DRAFT);
    setMode(null);
    setActiveSetId(null);
  };

  const removePiece = (setId: string, pieceId: string) => {
    setSets(prev => prev.map(s =>
      s.id === setId ? { ...s, pieces: s.pieces.filter(p => p.id !== pieceId) } : s
    ));
  };

  const updateQuantity = (setId: string, pieceId: string, qty: number) => {
    setSets(prev => prev.map(s =>
      s.id === setId ? { ...s, pieces: s.pieces.map(p => p.id === pieceId ? { ...p, quantity: Math.max(1, qty) } : p) } : s
    ));
  };

  const removeSet = (setId: string) => {
    setSets(prev => prev.filter(s => s.id !== setId));
    if (activeSetId === setId) { setMode(null); setActiveSetId(null); }
  };

  const cancelMode = () => {
    if (mode === 'addPiece' && activeSetId) {
      const set = sets.find(s => s.id === activeSetId);
      if (set && set.pieces.length === 0) setSets(prev => prev.filter(s => s.id !== activeSetId));
    }
    setMode(null);
    setActiveSetId(null);
    setEditingPiece(null);
    setPieceDraft(EMPTY_DRAFT);
    setSearchTerm('');
  };

  const canAdd = sets.length < 3;
  const subtotalAll = sets.reduce((acc, s) => acc + setTotal(s), 0);
  const discountRate = globalConfig.discountTier ? DISCOUNT_RATES[globalConfig.discountTier] : 0;
  const discountValue = subtotalAll * discountRate;
  const afterDiscount = subtotalAll - discountValue;
  const markupValue = afterDiscount * (globalConfig.markup / 100);
  const liquidPrice = afterDiscount + markupValue;

  const setsWithPieces = sets.filter(s => s.pieces.length > 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary text-primary-foreground rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6" />
          <h1 className="text-lg md:text-xl font-semibold">Consulta de Preços</h1>
        </div>
        {sets.length > 0 && (
          <button
            onClick={() => { setSets([]); setMode(null); setActiveSetId(null); setGlobalConfig({ discountTier: '', prazo: '30d', markup: 0 }); }}
            className="text-sm text-background/70 hover:text-background transition">Limpar
          </button>
        )}
      </div>

      {/* Conjuntos de produtos */}
      {sets.map((set) => {
        const total = setTotal(set);

        return (
          <div key={set.id} className="border rounded-2xl overflow-hidden bg-card shadow-sm">
            {/* Header do conjunto */}
            <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
              <ProductImage
                productName={set.product.name}
                imageUrl={set.product.imageUrl}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{set.product.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{set.product.factory} · {set.product.category}</p>
              </div>
              <button onClick={() => removeSet(set.id)} className="p-1.5 hover:bg-muted rounded-lg transition shrink-0">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Peças */}
            <div className="divide-y">
              {set.pieces.map((piece) => (
                <div key={piece.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{piece.modulationName}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{piece.sizeLabel}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {piece.tierLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPiece({ setId: set.id, pieceId: piece.id });
                        setActiveSetId(set.id);
                        setPieceDraft({ modulationId: piece.modulationId, sizeId: piece.sizeId, tierKey: piece.tierKey });
                        setMode('addPiece');
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg transition"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => removePiece(set.id, piece.id)} className="p-1.5 hover:bg-muted rounded-lg transition">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(set.id, piece.id, piece.quantity - 1)}
                      className="w-8 h-8 rounded-xl border-2 flex items-center justify-center font-bold text-base hover:bg-muted transition">−
                    </button>
                    <span className="w-8 text-center font-semibold">{piece.quantity}</span>
                    <button
                      onClick={() => updateQuantity(set.id, piece.id, piece.quantity + 1)}
                      className="w-8 h-8 rounded-xl border-2 flex items-center justify-center font-bold text-base hover:bg-muted transition">+
                    </button>
                  </div>
                  <div className="w-28 text-right font-semibold">
                    {fmt(piece.price * piece.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Botão adicionar peça */}
            {(mode !== 'addPiece' || activeSetId !== set.id) && (
              <button
                onClick={() => { setActiveSetId(set.id); setPieceDraft(EMPTY_DRAFT); setMode('addPiece'); setEditingPiece(null); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition border-t"
              >
                <Plus className="w-4 h-4" />
                Adicionar peça
              </button>
            )}

            {/* Seletor de peça inline */}
            {mode === 'addPiece' && activeSetId === set.id && (
              <div className="p-4 border-t bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{editingPiece ? 'Editar peça' : 'Nova peça'}</h4>
                  <button onClick={cancelMode} className="text-sm text-muted-foreground hover:text-foreground">
                    Cancelar
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">Modulação *</Label>
                    <Select value={pieceDraft.modulationId} onValueChange={(v) => setPieceDraft({ modulationId: v, sizeId: '', tierKey: '' })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione a modulação" />
                      </SelectTrigger>
                      <SelectContent>
                        {set.product.modulations.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {draftModulation && (
                    <div>
                      <Label className="text-sm mb-1.5 block">Tamanho *</Label>
                      <Select value={pieceDraft.sizeId} onValueChange={(v) => setPieceDraft(d => ({ ...d, sizeId: v, tierKey: '' }))}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          {draftModulation.sizes.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {isWood ? (s.dimensions || s.description) : s.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {draftSize && availableTiers.length > 0 && (
                    <div>
                      <Label className="text-sm mb-1.5 block">
                        {isWood || isTable ? 'Acabamento *' : 'Faixa de Tecido *'}
                      </Label>
                      <Select value={pieceDraft.tierKey} onValueChange={(v) => setPieceDraft(d => ({ ...d, tierKey: v }))}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTiers.map(t => (
                            <SelectItem key={t.key} value={t.key}>
                              <span className="text-muted-foreground mr-2">{fmt(t.price)}</span>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {draftPrice > 0 && (
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Preço unitário</span>
                      <span className="font-semibold">{fmt(draftPrice)}</span>
                    </div>
                  )}

                  <Button onClick={confirmPiece} disabled={!isPieceReady} className="w-full h-11">
                    {editingPiece ? 'Salvar peça' : 'Adicionar peça'}
                  </Button>
                </div>
              </div>
            )}

            {/* Total do conjunto */}
            {set.pieces.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  Subtotal ({set.pieces.reduce((a, p) => a + p.quantity, 0)} peças)
                </span>
                <span className="font-semibold">{fmt(total)}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Seletor de novo produto */}
      {mode === 'selectProduct' && (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-medium">Selecionar produto</h3>
            <button onClick={cancelMode} className="text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" autoFocus />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {Object.entries(groupedProducts).map(([cat, prods]) => (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 py-2 sticky top-0 bg-card z-10">{cat}</h4>
                  {prods.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition text-left group">
                      <ProductImage
                        productName={p.name}
                        imageUrl={p.imageUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.factory}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                    </button>
                  ))}
                </div>
              ))}
              {Object.keys(groupedProducts).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão adicionar produto */}
      {canAdd && mode === null && (
        <button
          onClick={() => { setMode('selectProduct'); setSearchTerm(''); }}
          className="w-full border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">
            {sets.length === 0 ? 'Adicionar produto' : sets.length === 1 ? 'Comparar com outro produto' : 'Adicionar terceiro produto'}
          </span>
        </button>
      )}

      {/* Configurações + breakdown */}
      {setsWithPieces.length > 0 && mode === null && (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b bg-muted/30">
            <div>
              <Label className="text-sm mb-1.5 block">Nível</Label>
              <Select value={globalConfig.discountTier || 'none'} onValueChange={(v) => setGlobalConfig(g => ({ ...g, discountTier: v === 'none' ? '' : v as DiscountTier }))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sem desconto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem desconto</SelectItem>
                  {DISCOUNT_TIER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">Prazo Médio</Label>
              <Select value={globalConfig.prazo} onValueChange={(v) => setGlobalConfig(g => ({ ...g, prazo: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRAZO_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4">
            <Label className="text-sm mb-1.5 block">Markup da Loja (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={globalConfig.markup}
              onChange={(e) => setGlobalConfig(g => ({ ...g, markup: parseFloat(e.target.value) || 0 }))}
              className="h-12 font-semibold text-base" />
          </div>

          {/* Breakdown */}
          <div className="p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Preço Tabela</span>
              <span className="font-semibold">{fmt(subtotalAll)}</span>
            </div>

            {discountValue > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                    -{(discountRate * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="font-semibold text-destructive">-{fmt(discountValue)}</span>
              </div>
            )}
            {markupValue > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Markup Loja</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">+{globalConfig.markup}%</span>
                </div>
                <span className="font-semibold text-primary">+{fmt(markupValue)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-semibold">Preço Líquido</span>
              <span className="text-xl font-bold text-primary">{fmt(liquidPrice)}</span>
            </div>
          </div>

          {/* Comparação com % de diferença */}
          {setsWithPieces.length >= 2 && (
            <div className="p-4 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Comparação
              </h4>
              {setsWithPieces.map((set) => {
                const total = setTotal(set);
                const final = applyFactors(total);
                const allFinals = setsWithPieces.map(s => applyFactors(setTotal(s)));
                const minFinal = Math.min(...allFinals);
                const isCheapest = final === minFinal;
                const diffPct = !isCheapest && minFinal > 0
                  ? ((final - minFinal) / minFinal * 100).toFixed(1)
                  : null;

                return (
                  <div key={set.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{set.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {set.pieces.length} peça{set.pieces.length > 1 ? 's' : ''} · tabela {fmt(total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmt(final)}</p>
                      {isCheapest && (
                        <span className="text-xs text-primary font-medium">✓ Menor preço</span>
                      )}
                      {diffPct && (
                        <span className="text-xs text-muted-foreground">+{diffPct}% acima do menor</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {sets.length === 0 && mode === null && (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Consulta de Preços</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Monte composições com múltiplas peças e compare até 3 produtos com descontos comerciais
            </p>
            <Button onClick={() => setMode('selectProduct')} className="gap-2 h-11 px-6">
              <Plus className="w-4 h-4" />
              Adicionar produto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
