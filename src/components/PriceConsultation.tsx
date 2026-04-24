import { useState, useMemo } from 'react';
import { Product, FabricTier, FABRIC_TIERS, TABLE_TIERS, isTableCategory, isWoodProduct, ModulationFinish, DISCOUNT_TIER_OPTIONS, DiscountTier } from '@/types/quote';
import { getFabricsByTier } from '@/data/fabrics';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, X, ChevronRight, Pencil, ArrowLeftRight } from 'lucide-react';
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

interface ConsultItem {
  id: string;
  product: Product;
  modulationId: string;
  sizeId: string;
  fabricTier: string;
  fabricCode: string;
  finishId: string;
  quantity: number;
  price: number;
  label: string;
  finishLabel: string;
}

interface GlobalConfig {
  discountTier: DiscountTier | '';
  prazo: string;
  markup: number;
}

export function PriceConsultation({ products }: PriceConsultationProps) {
  const [items, setItems] = useState<ConsultItem[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ discountTier: '', prazo: '30d', markup: 0 });
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fabricSearch, setFabricSearch] = useState('');
  const [draft, setDraft] = useState({
    product: null as Product | null,
    modulationId: '',
    sizeId: '',
    fabricTier: '' as FabricTier | '',
    fabricCode: '',
    finishId: '',
  });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isWood = draft.product ? isWoodProduct(draft.product.factory) : false;
  const isTable = draft.product ? isTableCategory(draft.product.category) : false;
  const isCarpet = draft.product?.category === 'Tapetes';

  const draftModulation = useMemo(() =>
    draft.product?.modulations.find(m => m.id === draft.modulationId),
    [draft.product, draft.modulationId]);

  const draftSize = useMemo(() =>
    draftModulation?.sizes.find(s => s.id === draft.sizeId),
    [draftModulation, draft.sizeId]);

  const draftFinishes: ModulationFinish[] = useMemo(() =>
    isWood && draftSize ? (draftSize.finishes || []) : [],
    [isWood, draftSize]);

  const draftFinish = useMemo(() =>
    draftFinishes.find(f => f.id === draft.finishId) || null,
    [draftFinishes, draft.finishId]);

  const hasBuiltInFinish = /\b(TAMPO|TOPO):/i.test(draftSize?.description ?? '');

  const availableTiers = useMemo(() => {
    if (!draftSize || isWood) return [];
    if (isTable) return TABLE_TIERS.filter(t => (draftSize.prices[t.key] || 0) > 0);
    return FABRIC_TIERS.filter(t => (draftSize.prices[t] || 0) > 0);
  }, [draftSize, isTable, isWood]);

  const hasOnlySemTec = useMemo(() => {
    if (!draftSize || isWood || isCarpet) return false;
    const keys = isTable
      ? (availableTiers as Array<{ key: FabricTier }>).map(t => t.key)
      : availableTiers as FabricTier[];
    return keys.length === 1 && keys[0] === 'SEM TEC';
  }, [availableTiers, isWood, isCarpet, isTable, draftSize]);

  const effectiveTier = hasOnlySemTec ? 'SEM TEC' : draft.fabricTier;

  const getFirstPrice = (prices: Record<FabricTier, number>) => {
    const k = FABRIC_TIERS.find(k => (prices[k] || 0) > 0);
    return k ? prices[k] : 0;
  };

  const getDraftPrice = (): number => {
    if (!draftSize) return 0;
    if (isWood) return draftFinish?.price || 0;
    if (isCarpet || hasBuiltInFinish || hasOnlySemTec) return draftSize.prices['SEM TEC'] || getFirstPrice(draftSize.prices);
    if (!effectiveTier) return 0;
    return draftSize.prices[effectiveTier as FabricTier] || 0;
  };

  const needsFabricCode = !isWood && !isTable && !isCarpet && !hasBuiltInFinish && effectiveTier && effectiveTier !== 'SEM TEC';

  const isDraftReady = Boolean(
    draft.sizeId && getDraftPrice() > 0 && (
      isWood ? draft.finishId :
      isCarpet || hasBuiltInFinish || hasOnlySemTec ? true :
      isTable ? effectiveTier :
      (effectiveTier && (effectiveTier === 'SEM TEC' || draft.fabricCode))
    )
  );

  const buildFinishLabel = (): string => {
    if (isWood && draftFinish) return draftFinish.finishName;
    if (hasBuiltInFinish) {
      const m = draftSize?.description.match(/\b(TAMPO|TOPO):\s*([^,\n]+)/i);
      return m ? `${m[1].toUpperCase()}: ${m[2].trim()}` : '';
    }
    if (isCarpet || hasOnlySemTec) return 'Sem tecido';
    if (isTable) {
      const t = TABLE_TIERS.find(t => t.key === effectiveTier);
      return t?.label || effectiveTier;
    }
    return draft.fabricCode ? `${effectiveTier} · ${draft.fabricCode}` : effectiveTier;
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

  const availableFabrics = useMemo(() => {
    if (!effectiveTier || effectiveTier === 'SEM TEC') return [];
    const all = getFabricsByTier(effectiveTier as FabricTier);
    if (!fabricSearch.trim()) return all;
    const s = fabricSearch.toLowerCase();
    return all.filter(f => f.code.toLowerCase().includes(s) || (f.notes?.toLowerCase().includes(s)));
  }, [effectiveTier, fabricSearch]);

  const resetDraft = () => {
    setDraft({ product: null, modulationId: '', sizeId: '', fabricTier: '', fabricCode: '', finishId: '' });
    setSearchTerm('');
    setFabricSearch('');
    setEditingSlot(null);
  };

  const confirmItem = () => {
    const price = getDraftPrice();
    if (!draft.product || !draft.sizeId || price === 0) return;
    const mod = draft.product.modulations.find(m => m.id === draft.modulationId);
    const size = mod?.sizes.find(s => s.id === draft.sizeId);

    const newItem: ConsultItem = {
      id: crypto.randomUUID(),
      product: draft.product,
      modulationId: draft.modulationId,
      sizeId: draft.sizeId,
      fabricTier: effectiveTier,
      fabricCode: draft.fabricCode,
      finishId: draft.finishId,
      quantity: 1,
      price,
      label: [mod?.name, size?.dimensions || size?.description].filter(Boolean).join(' · '),
      finishLabel: buildFinishLabel(),
    };

    if (editingSlot !== null && editingSlot >= 0 && editingSlot < items.length) {
      const updated = [...items];
      updated[editingSlot] = { ...newItem, quantity: items[editingSlot].quantity };
      setItems(updated);
    } else {
      setItems(prev => [...prev, newItem]);
    }
    resetDraft();
  };

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const discountRate = globalConfig.discountTier ? DISCOUNT_RATES[globalConfig.discountTier] : 0;
  const discountValue = subtotal * discountRate;
  const afterDiscount = subtotal - discountValue;
  const markupValue = afterDiscount * (globalConfig.markup / 100);
  const liquidPrice = afterDiscount + markupValue;

  const canAdd = items.length < 3;
  const isSelecting = editingSlot !== null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header escuro */}
      <div className="bg-foreground text-background rounded-t-2xl px-5 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Composição</h2>
        {items.length > 0 && (
          <button
            onClick={() => { setItems([]); setGlobalConfig({ discountTier: '', prazo: '30d', markup: 0 }); }}
            className="text-sm text-background/70 hover:text-background transition"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="bg-card rounded-b-2xl shadow-lg p-5 space-y-4">
        {/* Cards dos itens */}
        {items.map((item, idx) => (
          <div key={item.id} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ProductImage productName={item.product.name} imageUrl={item.product.imageUrl} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate">{item.product.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setDraft({ product: item.product, modulationId: item.modulationId, sizeId: item.sizeId, fabricTier: item.fabricTier as FabricTier, fabricCode: item.fabricCode, finishId: item.finishId });
                        setEditingSlot(idx);
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-muted rounded-lg transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.label}{item.finishLabel ? ` · ${item.finishLabel}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.product.factory}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                  className="w-9 h-9 rounded-xl border-2 flex items-center justify-center font-bold text-lg hover:bg-muted transition"
                >−</button>
                <span className="w-10 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))}
                  className="w-9 h-9 rounded-xl border-2 flex items-center justify-center font-bold text-lg hover:bg-muted transition"
                >+</button>
              </div>
              <span className="font-bold text-lg">{fmt(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}

        {/* Botão adicionar */}
        {canAdd && !isSelecting && (
          <button
            onClick={() => setEditingSlot(-1)}
            className="w-full border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">
              {items.length === 0 ? 'Adicionar produto' : items.length === 1 ? 'Comparar com outro produto' : 'Adicionar terceiro produto'}
            </span>
          </button>
        )}

        {/* Painel de seleção */}
        {isSelecting && (
          <div className="border-2 border-primary rounded-xl p-4 space-y-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {editingSlot === -1 ? 'Selecionar produto' : 'Editar produto'}
              </h3>
              <button onClick={resetDraft} className="p-1.5 hover:bg-muted rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!draft.product ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" autoFocus />
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {Object.entries(groupedProducts).map(([cat, prods]) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 px-1">{cat}</p>
                        {prods.map(p => (
                          <button key={p.id} onClick={() => setDraft(d => ({ ...d, product: p }))}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition text-left group">
                            <ProductImage productName={p.name} imageUrl={p.imageUrl} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.factory}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </button>
                        ))}
                      </div>
                    ))}
                    {Object.keys(groupedProducts).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto encontrado</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-card rounded-lg border">
                    <ProductImage productName={draft.product.name} imageUrl={draft.product.imageUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{draft.product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{draft.product.factory}</p>
                    </div>
                    <button onClick={() => setDraft(d => ({ ...d, product: null, modulationId: '', sizeId: '', fabricTier: '', fabricCode: '', finishId: '' }))}
                      className="text-xs text-muted-foreground hover:text-foreground transition">Trocar</button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Modulação *</Label>
                    <Select value={draft.modulationId} onValueChange={v => setDraft(d => ({ ...d, modulationId: v, sizeId: '', fabricTier: '', fabricCode: '', finishId: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {draft.product.modulations.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {draftModulation && (
                    <div className="space-y-1.5">
                      <Label>Tamanho *</Label>
                      <Select value={draft.sizeId} onValueChange={v => setDraft(d => ({ ...d, sizeId: v, fabricTier: '', fabricCode: '', finishId: '' }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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

                  {isWood && draftSize && draftFinishes.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Acabamento *</Label>
                      <Select value={draft.finishId} onValueChange={v => setDraft(d => ({ ...d, finishId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {draftFinishes.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.finishName} — {fmt(f.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!isWood && draftSize && !hasBuiltInFinish && !isCarpet && !hasOnlySemTec && (
                    <div className="space-y-1.5">
                      <Label>{isTable ? 'Acabamento *' : 'Faixa de Tecido *'}</Label>
                      <Select value={draft.fabricTier} onValueChange={v => setDraft(d => ({ ...d, fabricTier: v as FabricTier, fabricCode: '' }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {isTable
                            ? (availableTiers as Array<{ key: FabricTier; label: string }>).map(t => (
                              <SelectItem key={t.key} value={t.key}>
                                {t.label} — {fmt(draftSize.prices[t.key] || 0)}
                              </SelectItem>
                            ))
                            : (availableTiers as FabricTier[]).map(t => (
                              <SelectItem key={t} value={t}>{t} — {fmt(draftSize.prices[t] || 0)}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {needsFabricCode && (
                    <div className="space-y-1.5">
                      <Label>Tecido *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar tecido..." value={fabricSearch} onChange={e => setFabricSearch(e.target.value)} className="pl-10 h-10" />
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {availableFabrics.map(f => (
                          <button key={f.code} onClick={() => setDraft(d => ({ ...d, fabricCode: f.code }))}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition ${draft.fabricCode === f.code ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                            {f.code} {f.notes && <span className="text-xs text-muted-foreground">({f.notes})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {getDraftPrice() > 0 && (
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                      <span className="text-sm font-medium">Preço unitário</span>
                      <span className="font-bold text-lg">{fmt(getDraftPrice())}</span>
                    </div>
                  )}

                  <Button onClick={confirmItem} disabled={!isDraftReady} className="w-full h-11">
                    {editingSlot === -1 ? 'Adicionar' : 'Salvar alterações'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configurações + breakdown */}
        {items.length > 0 && !isSelecting && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nível</Label>
                <Select value={globalConfig.discountTier || 'none'} onValueChange={v => setGlobalConfig(g => ({ ...g, discountTier: v === 'none' ? '' : v as DiscountTier }))}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem desconto</SelectItem>
                    {DISCOUNT_TIER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo Médio</Label>
                <Select value={globalConfig.prazo} onValueChange={v => setGlobalConfig(g => ({ ...g, prazo: v }))}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRAZO_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Markup da Loja (%)</Label>
              <Input
                type="number"
                min={0}
                value={globalConfig.markup}
                onChange={e => setGlobalConfig(g => ({ ...g, markup: parseFloat(e.target.value) || 0 }))}
                className="h-12 font-semibold text-base"
              />
            </div>

            {/* Breakdown de preço */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Preço Tabela</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Desconto</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        -{(discountRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="font-medium text-primary">-{fmt(discountValue)}</span>
                  </div>
                )}
                {markupValue > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Markup Loja</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">+{globalConfig.markup}%</span>
                    </div>
                    <span className="font-medium">+{fmt(markupValue)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Preço Líquido</span>
                <span className="font-bold text-xl text-primary">{fmt(liquidPrice)}</span>
              </div>
            </div>

            {/* Comparação entre produtos */}
            {items.length >= 2 && (
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeftRight className="h-4 w-4" />
                  Comparação por produto
                </div>
                {items.map((item) => {
                  const unitFinal = item.price * (1 - discountRate) * (1 + globalConfig.markup / 100);
                  const totalFinal = unitFinal * item.quantity;
                  const allFinals = items.map(i => i.price * (1 - discountRate) * (1 + globalConfig.markup / 100));
                  const isCheapest = unitFinal === Math.min(...allFinals);

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 pb-2 border-b last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <ProductImage productName={item.product.name} imageUrl={item.product.imageUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{fmt(totalFinal)}</p>
                        <p className="text-xs text-muted-foreground">{fmt(unitFinal)}/un</p>
                        {isCheapest && <p className="text-xs text-primary font-semibold">✓ Menor preço</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Estado vazio */}
        {items.length === 0 && !isSelecting && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Consulta de Preços</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Compare até 3 produtos com descontos comerciais e markup da loja
              </p>
            </div>
            <Button onClick={() => setEditingSlot(-1)} className="gap-2 h-11 px-6">
              <Plus className="h-4 w-4" />
              Adicionar produto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
