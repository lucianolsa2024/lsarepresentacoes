// src/hooks/useClientPortal.ts
// Hook para buscar dados do portal do cliente no Supabase

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth"; // hook existente no projeto

export interface PortalProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  factory: string;
  description: string | null;
  image_url: string | null;
  price_from: number | null;
}

export interface PortalAccess {
  portal_enabled: boolean;
  commercial_conditions: string | null;
}

export interface PortalClient {
  id: string;
  company: string;
  trade_name: string | null;
  email: string | null;
}

export function useClientPortal() {
  const { user } = useAuth();
  const [products, setProducts] = useState<PortalProduct[]>([]);
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetchPortalData();
  }, [user?.email]);

  async function fetchPortalData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Busca dados do cliente pelo email
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, company, trade_name, email")
        .eq("email", user!.email!)
        .single();

      if (clientError || !clientData) {
        setError("Cliente não encontrado. Contate o administrador.");
        setLoading(false);
        return;
      }
      setClient(clientData);

      // 2. Busca acesso e condições comerciais
      const { data: accessData } = await supabase
        .from("client_portal_access")
        .select("portal_enabled, commercial_conditions")
        .eq("client_id", clientData.id)
        .single();

      setAccess(accessData ?? { portal_enabled: false, commercial_conditions: null });

      if (!accessData?.portal_enabled) {
        setLoading(false);
        return;
      }

      // 3. Busca produtos liberados para esse cliente via view
      const { data: productIds, error: prodIdsError } = await supabase
        .from("client_portal_products")
        .select("product_id")
        .eq("client_id", clientData.id);

      if (prodIdsError || !productIds?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const ids = productIds.map((r) => r.product_id);

      // 4. Busca detalhes dos produtos com preço da view
      const { data: productsData, error: productsError } = await supabase
        .from("v_portal_products")
        .select("*")
        .in("id", ids)
        .order("category")
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar dados do portal.");
    } finally {
      setLoading(false);
    }
  }

  return { products, access, client, loading, error, refetch: fetchPortalData };
}
