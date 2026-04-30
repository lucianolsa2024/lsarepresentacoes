// src/pages/ClientPortalPage.tsx
// Portal do cliente — somente leitura, reusa <PriceConsultation/> com filtro
// pelos produtos liberados (client_portal_products) e exibe condições comerciais.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { PriceConsultation } from "@/components/PriceConsultation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Lock } from "lucide-react";

interface PortalState {
  loading: boolean;
  error: string | null;
  clientName: string | null;
  portalEnabled: boolean;
  commercialConditions: string | null;
  allowedProductIds: string[];
}

export default function ClientPortalPage() {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();

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
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                  Portal de Consulta de Preços
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {state.clientName}
                </h1>
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

        {/* Consulta de preços com modo portal ativado */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Nenhum produto liberado para visualização.
            </CardContent>
          </Card>
        ) : (
          <PriceConsultation products={filteredProducts} portalMode />
        )}
      </div>
    </div>
  );
}
