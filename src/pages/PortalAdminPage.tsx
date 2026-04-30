// src/pages/PortalAdminPage.tsx
// Painel do admin: gerencia quais produtos cada cliente vê e condições comerciais

import { useState } from "react";
import { usePortalAdmin } from "@/hooks/usePortalAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  Save,
  Package,
  CheckSquare,
  Square,
} from "lucide-react";
import type { ClientWithPortal } from "@/hooks/usePortalAdmin";

export default function PortalAdminPage() {
  const { clients, allProducts, loading, saveClientPortal } = usePortalAdmin();
  const [editingClient, setEditingClient] = useState<ClientWithPortal | null>(null);
  const [searchClient, setSearchClient] = useState("");

  // ─── Estado do editor ────────────────────────────────────
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [conditions, setConditions] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchProd, setSearchProd] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [saving, setSaving] = useState(false);

  function openEditor(c: ClientWithPortal) {
    setEditingClient(c);
    setPortalEnabled(c.portal_enabled);
    setConditions(c.commercial_conditions ?? "");
    setSelectedIds(new Set(c.allowed_product_ids));
    setSearchProd("");
    setFilterCat("Todos");
  }

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  async function handleSave() {
    if (!editingClient) return;
    setSaving(true);
    const ok = await saveClientPortal(editingClient.id, {
      portal_enabled: portalEnabled,
      commercial_conditions: conditions,
      product_ids: [...selectedIds],
    });
    setSaving(false);
    if (ok) setEditingClient(null);
  }

  // ─── Loading ─────────────────────────────────────────────
  if (loading && !editingClient) {
    return (
      <div className="p-6 space-y-3 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const categories = ["Todos", ...new Set(allProducts.map((p) => p.category))];

  const filteredProducts = allProducts.filter((p) => {
    const matchCat = filterCat === "Todos" || p.category === filterCat;
    const matchSearch =
      p.name.toLowerCase().includes(searchProd.toLowerCase()) ||
      p.code.toLowerCase().includes(searchProd.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredClients = clients.filter(
    (c) =>
      c.company.toLowerCase().includes(searchClient.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(searchClient.toLowerCase())
  );

  // ─── Editor de cliente ────────────────────────────────────
  if (editingClient) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setEditingClient(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {editingClient.trade_name || editingClient.company}
              </h2>
              <p className="text-sm text-muted-foreground">{editingClient.email}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Habilitar acesso */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <Label htmlFor="portal-enabled" className="text-base font-semibold">
                Acesso ao Portal
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {portalEnabled
                  ? "Cliente pode acessar o portal"
                  : "Cliente não tem acesso ao portal"}
              </p>
            </div>
            <Switch
              id="portal-enabled"
              checked={portalEnabled}
              onCheckedChange={setPortalEnabled}
            />
          </CardContent>
        </Card>

        {/* Condições comerciais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Condições Comerciais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={5}
              placeholder={`Ex:\nPrazo: 30/60/90 dias\nFrete CIF acima de R$ 15k\nDesconto 5% acima de R$ 20k\nEntrega: 45 dias úteis`}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este texto é exibido ao cliente no portal, em destaque.
            </p>
          </CardContent>
        </Card>

        {/* Seleção de produtos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Produtos visíveis —{" "}
                <span className="text-amber-600">{selectedIds.size}</span>
                <span className="text-muted-foreground font-normal">
                  {" "}de {allProducts.length}
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs gap-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll} className="text-xs gap-1">
                  <Square className="w-3.5 h-3.5" /> Nenhum
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Buscar produto..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={filterCat === cat ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs rounded-full"
                    onClick={() => setFilterCat(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Lista de produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-amber-300 bg-amber-50"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleProduct(p.id)}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code} · {p.category}</p>
                    </div>
                  </label>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Lista de clientes ────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Portal — Gestão de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais produtos e condições cada cliente visualiza no portal.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {clients.filter((c) => c.portal_enabled).length} ativos
        </Badge>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar cliente..."
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
        />
      </div>

      {/* Tabela de clientes */}
      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
            <span>Cliente</span>
            <span>E-mail</span>
            <span>Produtos</span>
            <span>Status</span>
            <span></span>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum cliente com e-mail cadastrado
            </div>
          )}

          {filteredClients.map((c, i) => (
            <div
              key={c.id}
              className={`grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-4 items-center cursor-pointer hover:bg-muted/30 transition-colors ${
                i !== filteredClients.length - 1 ? "border-b" : ""
              }`}
              onClick={() => openEditor(c)}
            >
              <div>
                <p className="font-semibold text-sm">{c.trade_name || c.company}</p>
                <p className="text-xs text-muted-foreground">{c.company}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">{c.email ?? "—"}</p>
              <div className="flex items-center gap-1 text-sm">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{c.allowed_product_ids.length}</span>
              </div>
              <Badge
                variant={c.portal_enabled ? "default" : "secondary"}
                className="text-xs justify-self-center"
              >
                {c.portal_enabled ? "Ativo" : "Inativo"}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
