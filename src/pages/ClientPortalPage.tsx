// src/pages/ClientPortalPage.tsx
// Página principal do portal do cliente - somente leitura

import { useState, useMemo } from "react";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Lock,
  LayoutGrid,
  List,
  Tag,
  AlertCircle,
  Package,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientPortalPage() {
  const { products, access, client, loading, error } = useClientPortal();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = useMemo(
    () => ["Todos", ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "Todos" || p.category === category;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.factory ?? "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Acesso não encontrado</h2>
        <p className="text-muted-foreground max-w-sm">{error}</p>
      </div>
    );
  }

  // ─── Portal desabilitado ───────────────────────────────────
  if (!access?.portal_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Portal não habilitado</h2>
        <p className="text-muted-foreground max-w-sm">
          Seu acesso ao portal ainda não foi configurado. Entre em contato com o representante LSA.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* ─── Cabeçalho do cliente + condições ─── */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-stone-50 to-amber-50">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                Portal de Consulta de Preços
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {client?.trade_name || client?.company}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                  <Lock className="w-3 h-3" /> Somente leitura
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {products.length} produto{products.length !== 1 ? "s" : ""} disponíveis
                </span>
              </div>
            </div>

            {/* Condições comerciais */}
            {access.commercial_conditions && (
              <div className="bg-white border border-amber-200 rounded-xl p-4 md:min-w-[300px] md:max-w-[380px]">
                <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-2">
                  Condições Comerciais
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {access.commercial_conditions}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Barra de filtros ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ─── Produtos ─── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Package className="w-10 h-10" />
          <p className="text-base">Nenhum produto encontrado</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Imagem ou placeholder */}
              <div className="h-40 bg-stone-100 flex items-center justify-center overflow-hidden border-b">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="w-12 h-12 text-stone-300" />
                )}
              </div>

              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" /> {p.code}
                </div>
                <p className="font-semibold text-sm leading-snug line-clamp-2">{p.name}</p>
                <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                {p.factory && (
                  <p className="text-xs text-muted-foreground">{p.factory}</p>
                )}
                <div className="pt-2 border-t flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    A partir de
                  </span>
                  <span className="font-bold text-base">
                    {p.price_from ? fmt(p.price_from) : "Consulte"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // ─── Lista ───
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
            <span></span>
            <span>Produto</span>
            <span>Categoria</span>
            <span>Fabricante</span>
            <span className="text-right">Preço</span>
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 bg-white border rounded-xl px-4 py-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                ) : (
                  <Package className="w-5 h-5 text-stone-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.code} · {p.factory}</p>
              </div>
              <Badge variant="secondary" className="hidden md:inline-flex text-xs shrink-0">
                {p.category}
              </Badge>
              <span className="hidden md:block text-xs text-muted-foreground shrink-0 w-28 truncate">
                {p.factory}
              </span>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="font-bold text-base">
                  {p.price_from ? fmt(p.price_from) : "Consulte"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
