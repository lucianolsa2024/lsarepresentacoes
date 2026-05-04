// src/pages/ClientPortalPage.tsx
// Portal do cliente — somente leitura, reusa <PriceConsultation/> com filtro
// pelos produtos liberados (client_portal_products) e exibe condições comerciais.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { PriceConsultation } from "@/components/PriceConsultation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Lock, FileText, Package, Download, ExternalLink, LogOut } from "lucide-react";
import { useClientFiles } from "@/hooks/useClientFiles";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ConfirmacoesTab() {
  const { files, loading, error } = useClientFiles();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando confirmações...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-destructive">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Nenhuma confirmação disponível.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="bg-primary/10 text-primary p-2 rounded-lg shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} •{" "}
                  {new Date(file.lastModified).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {file.downloadUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(file.downloadUrl!, "_blank")}
                    className="gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Abrir</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = file.downloadUrl!;
                      a.download = file.name;
                      a.click();
                    }}
                    className="gap-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Baixar</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface PortalState {
  loading: boolean;
  error: string | null;
  clientName: string | null;
  portalEnabled: boolean;
  commercialConditions: string | null;
  allowedProductIds: string[];
}

export default function ClientPortalPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useProducts();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const [state, setState] = useState<PortalState>({
    loading: true,
    error: null,
    clientName: null,
    portalEnabled: false,
    commercialConditions: null,
    allowedProductIds: [],
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        // PASSO 1: busca client_id vinculado ao usuário em user_roles
        const { data: roleData, error: roleErr } = await supabase
          .from("user_roles")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("role", "client")
          .maybeSingle();

        if (roleErr) throw roleErr;

        if (!roleData?.client_id) {
          if (!cancelled) {
            setState((s) => ({
              ...s,
              loading: false,
              error: "Cliente não encontrado. Contate o representante LSA.",
            }));
          }
          return;
        }

        const clientId = roleData.client_id;

        // PASSO 2: busca dados do cliente + acesso + produtos em paralelo
        const [
          { data: client, error: clientErr },
          { data: access },
          { data: portalProducts },
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("id, company, trade_name")
            .eq("id", clientId)
            .maybeSingle(),
          supabase
            .from("client_portal_access")
            .select("portal_enabled, commercial_conditions")
            .eq("client_id", clientId)
            .maybeSingle(),
          supabase
            .from("client_portal_products")
            .select("product_id")
            .eq("client_id", clientId),
        ]);

        if (clientErr) throw clientErr;
        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          clientName: client?.trade_name || client?.company || null,
          portalEnabled: access?.portal_enabled ?? false,
          commercialConditions: access?.commercial_conditions ?? null,
          allowedProductIds: (portalProducts ?? []).map((p) => p.product_id),
        });
      } catch (err: any) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err.message ?? "Erro ao carregar portal.",
          }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const allowedSet = useMemo(
    () => new Set(state.allowedProductIds),
    [state.allowedProductIds]
  );

  const filteredProducts = useMemo(
    () => products.filter((p) => allowedSet.has(p.id)),
    [products, allowedSet]
  );

  // ─── Loading ─────────────────────────────────────────────
  if (state.loading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando portal...
        </div>
      </div>
    );
  }

  // ─── Erro ────────────────────────────────────────────────
  if (state.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Acesso indisponível</h2>
        <p className="text-muted-foreground max-w-md">{state.error}</p>
      </div>
    );
  }

  // ─── Portal desabilitado ─────────────────────────────────
  if (!state.portalEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Portal não habilitado</h2>
        <p className="text-muted-foreground max-w-md">
          Seu acesso ao portal ainda não foi configurado. Entre em contato com o representante LSA.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Cabeçalho cliente */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                      Portal de Consulta de Preços
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                      {state.clientName}
                    </h1>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-1 shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" /> Somente leitura 🔒
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} liberado
                    {filteredProducts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {state.commercialConditions && (
                <div className="bg-muted/50 border rounded-xl p-4 md:min-w-[300px] md:max-w-[420px]">
                  <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2">
                    Condições Comerciais
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {state.commercialConditions}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Produtos / Confirmações */}
        <Tabs defaultValue="produtos" className="w-full">
          <TabsList>
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="w-4 h-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="confirmacoes" className="gap-2">
              <FileText className="w-4 h-4" /> Confirmações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Nenhum produto liberado para visualização.
                </CardContent>
              </Card>
            ) : (
              <PriceConsultation products={filteredProducts} portalMode />
            )}
          </TabsContent>

          <TabsContent value="confirmacoes">
            <ConfirmacoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
