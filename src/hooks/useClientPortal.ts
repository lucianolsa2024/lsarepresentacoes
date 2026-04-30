// src/hooks/useClientPortal.ts
// Hook corrigido — busca cliente via user_roles.client_id (não mais por email)

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    if (!user?.id) return;
    fetchPortalData();
  }, [user?.id]);

  async function fetchPortalData() {
    setLoading(true);
    setError(null);

    try {
      // PASSO 1: busca client_id vinculado a este usuário em user_roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("client_id")
        .eq("user_id", user!.id)
        .eq("role", "client")
        .single();

      if (roleError || !roleData?.client_id) {
        setError("Cliente não encontrado. Contate o representante LSA.");
        setLoading(false);
        return;
      }

      const clientId = roleData.client_id;

      // PASSO 2: busca dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, company, trade_name, email")
        .eq("id", clientId)
        .single();

      if (clientError || !clientData) {
        setError("Dados do cliente não encontrados. Contate o representante LSA.");
        setLoading(false);
        return;
      }

      setClient(clientData);

      // PASSO 3: busca acesso e condições comerciais
      const { data: accessData } = await supabase
        .from("client_portal_access")
        .select("portal_enabled, commercial_conditions")
        .eq("client_id", clientId)
        .single();

      setAccess(accessData ?? { portal_enabled: false, commercial_conditions: null });

      if (!accessData?.portal_enabled) {
        setLoading(false);
        return;
      }

      // PASSO 4: busca IDs dos produtos liberados
      const { data: productIds } = await supabase
        .from("client_portal_products")
        .select("product_id")
        .eq("client_id", clientId);

      if (!productIds?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const ids = productIds.map((r) => r.product_id);

      // PASSO 5: busca produtos com preço via view
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
