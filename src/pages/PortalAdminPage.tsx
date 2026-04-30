// src/pages/PortalAdminPage.tsx
// Painel do admin: gerencia quais produtos cada cliente vê e condições comerciais

import { useMemo, useState } from "react";
import { usePortalAdmin } from "@/hooks/usePortalAdmin";
import { usePortalUsers, type PortalUser } from "@/hooks/usePortalUsers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PortalUsersTab from "@/components/portal/PortalUsersTab";
import {
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  Save,
  Package,
  CheckSquare,
  Square,
  UserCog,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react";
import type { ClientWithPortal } from "@/hooks/usePortalAdmin";

export default function PortalAdminPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <Tabs defaultValue="clientes" className="space-y-5">
        <TabsList>
          <TabsTrigger value="clientes" className="gap-2">
            <Package className="w-4 h-4" /> Clientes & Produtos
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <UserCog className="w-4 h-4" /> Usuários
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clientes">
          <ClientsProductsTab />
        </TabsContent>
        <TabsContent value="usuarios">
          <PortalUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientsProductsTab() {
  const { clients, allProducts, loading, saveClientPortal } = usePortalAdmin();
  const { users, createUser, updateEmail, updatePassword, toggleBan } = usePortalUsers();

  const [editingClient, setEditingClient] = useState<ClientWithPortal | null>(null);
  const [searchClient, setSearchClient] = useState("");

  // ─── Estado do editor ────────────────────────────────────
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [conditions, setConditions] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchProd, setSearchProd] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [saving, setSaving] = useState(false);

  // ─── Modais de acesso ───────────────────────────────────
  const [createAccessClient, setCreateAccessClient] = useState<ClientWithPortal | null>(null);
  const [editAccessClient, setEditAccessClient] = useState<ClientWithPortal | null>(null);
  const [banAccessUser, setBanAccessUser] = useState<PortalUser | null>(null);

  const [accEmail, setAccEmail] = useState("");
  const [accPass, setAccPass] = useState("");
  const [accPass2, setAccPass2] = useState("");
  const [accShowPass, setAccShowPass] = useState(false);
  const [accBusy, setAccBusy] = useState(false);

  // Mapa de cliente → usuário externo vinculado
  const userByClient = useMemo(() => {
    const m = new Map<string, PortalUser>();
    users.forEach((u) => {
      if (u.role === 'client' && u.client_id) {
        m.set(u.client_id, u);
      }
    });
    return m;
  }, [users]);

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

  function openCreateAccess(c: ClientWithPortal) {
    setCreateAccessClient(c);
    setAccEmail(c.email ?? "");
    setAccPass("");
    setAccPass2("");
    setAccShowPass(false);
  }

  function openEditAccess(c: ClientWithPortal) {
    setEditAccessClient(c);
    const u = userByClient.get(c.id);
    setAccEmail(u?.email ?? "");
    setAccPass("");
    setAccPass2("");
    setAccShowPass(false);
  }

  async function handleCreateAccess() {
    if (!createAccessClient || !accEmail || !accPass) return;
    if (accPass !== accPass2) return;
    setAccBusy(true);
    const ok = await createUser(accEmail.trim(), accPass, 'client', createAccessClient.id);
    setAccBusy(false);
    if (ok) setCreateAccessClient(null);
  }

  async function handleSaveAccessEdit() {
    if (!editAccessClient) return;
    const u = userByClient.get(editAccessClient.id);
    if (!u) return;
    setAccBusy(true);
    try {
      if (accEmail && accEmail !== u.email) {
        await updateEmail(u.id, accEmail.trim());
      }
      if (accPass) {
        if (accPass !== accPass2) return;
        await updatePassword(u.id, accPass);
      }
    } finally {
      setAccBusy(false);
      setEditAccessClient(null);
    }
  }

  async function handleConfirmBan() {
    if (!banAccessUser) return;
    const banned = !!banAccessUser.banned_until && new Date(banAccessUser.banned_until).getTime() > Date.now();
    setAccBusy(true);
    await toggleBan(banAccessUser.id, banned);
    setAccBusy(false);
    setBanAccessUser(null);
    setEditAccessClient(null);
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
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Portal — Gestão de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais produtos, condições e acessos cada cliente possui no portal.
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
          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum cliente com e-mail cadastrado
            </div>
          )}

          {filteredClients.map((c, i) => {
            const linkedUser = userByClient.get(c.id);
            return (
              <div
                key={c.id}
                className={`px-5 py-4 ${i !== filteredClients.length - 1 ? "border-b" : ""}`}
              >
                <div
                  className="grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center cursor-pointer hover:bg-muted/30 transition-colors -mx-5 px-5 py-1 rounded"
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

                {/* Linha de acesso */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {linkedUser ? (
                    <>
                      <span className="text-muted-foreground">acesso:</span>
                      <span className="font-medium">{linkedUser.email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); openEditAccess(c); }}
                      >
                        Editar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">sem usuário vinculado</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); openCreateAccess(c); }}
                      >
                        <UserPlus className="w-3 h-3" /> Criar acesso
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Modal: Criar acesso */}
      <Dialog open={!!createAccessClient} onOpenChange={(o) => !o && setCreateAccessClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar acesso ao portal</DialogTitle>
            <DialogDescription>
              {createAccessClient?.trade_name || createAccessClient?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="acc-email">E-mail</Label>
              <Input id="acc-email" type="email" value={accEmail}
                onChange={(e) => setAccEmail(e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <Label htmlFor="acc-pass">Senha</Label>
              <div className="relative">
                <Input id="acc-pass" type={accShowPass ? "text" : "password"} value={accPass}
                  onChange={(e) => setAccPass(e.target.value)} />
                <button type="button" onClick={() => setAccShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {accShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="acc-pass2">Confirmar senha</Label>
              <Input id="acc-pass2" type={accShowPass ? "text" : "password"} value={accPass2}
                onChange={(e) => setAccPass2(e.target.value)} />
              {accPass2 && accPass !== accPass2 && (
                <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccessClient(null)}>Cancelar</Button>
            <Button onClick={handleCreateAccess}
              disabled={accBusy || !accEmail || !accPass || accPass !== accPass2}>
              {accBusy ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar acesso */}
      <Dialog open={!!editAccessClient} onOpenChange={(o) => !o && setEditAccessClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar acesso ao portal</DialogTitle>
            <DialogDescription>
              {editAccessClient?.trade_name || editAccessClient?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="acc-edit-email">E-mail de acesso</Label>
              <Input id="acc-edit-email" type="email" value={accEmail}
                onChange={(e) => setAccEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="acc-edit-pass">Nova senha (deixe vazio para manter)</Label>
              <div className="relative">
                <Input id="acc-edit-pass" type={accShowPass ? "text" : "password"} value={accPass}
                  onChange={(e) => setAccPass(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setAccShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {accShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {accPass && (
              <div>
                <Label htmlFor="acc-edit-pass2">Confirmar senha</Label>
                <Input id="acc-edit-pass2" type={accShowPass ? "text" : "password"} value={accPass2}
                  onChange={(e) => setAccPass2(e.target.value)} />
                {accPass2 && accPass !== accPass2 && (
                  <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                )}
              </div>
            )}
            <div className="border-t pt-3">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 w-full"
                onClick={() => {
                  const u = editAccessClient ? userByClient.get(editAccessClient.id) : null;
                  if (u) setBanAccessUser(u);
                }}
              >
                <Ban className="w-4 h-4" />
                {(() => {
                  const u = editAccessClient ? userByClient.get(editAccessClient.id) : null;
                  const banned = !!u?.banned_until && new Date(u.banned_until).getTime() > Date.now();
                  return banned ? "Reativar acesso" : "Suspender acesso";
                })()}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccessClient(null)}>Cancelar</Button>
            <Button onClick={handleSaveAccessEdit}
              disabled={accBusy || (!!accPass && accPass !== accPass2)}>
              {accBusy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirma suspender/reativar */}
      <AlertDialog open={!!banAccessUser} onOpenChange={(o) => !o && setBanAccessUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banAccessUser && banAccessUser.banned_until && new Date(banAccessUser.banned_until).getTime() > Date.now()
                ? "Reativar acesso"
                : "Suspender acesso"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banAccessUser?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBan} disabled={accBusy}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
