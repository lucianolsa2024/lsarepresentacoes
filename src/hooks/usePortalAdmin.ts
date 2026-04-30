// src/hooks/usePortalAdmin.ts
// Hook para o admin gerenciar produtos e condições de cada cliente

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast"; // hook existente no projeto

export interface ClientWithPortal {
  id: string;
  company: string;
  trade_name: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
  portal_enabled: boolean;
  commercial_conditions: string | null;
  allowed_product_ids: string[];
}

export interface ProductOption {
  id: string;
  code: string;
  name: string;
  category: string;
  factory: string;
}

export function usePortalAdmin() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithPortal[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // Busca todos os clientes ativos
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, company, trade_name, email, segment, status")
        .not("email", "is", null)
        .order("company");

      // Busca acessos ao portal
      const { data: accessData } = await supabase
        .from("client_portal_access")
        .select("client_id, portal_enabled, commercial_conditions");

      // Busca mapeamento de produtos por cliente
      const { data: portalProducts } = await supabase
        .from("client_portal_products")
        .select("client_id, product_id");

      // Monta mapa de acesso
      const accessMap = new Map(
        (accessData ?? []).map((a) => [a.client_id, a])
      );

      // Monta mapa de produtos por cliente
      const prodMap = new Map<string, string[]>();
      (portalProducts ?? []).forEach((pp) => {
        const list = prodMap.get(pp.client_id) ?? [];
        list.push(pp.product_id);
        prodMap.set(pp.client_id, list);
      });

      const merged: ClientWithPortal[] = (clientsData ?? []).map((c) => ({
        ...c,
        portal_enabled: accessMap.get(c.id)?.portal_enabled ?? false,
        commercial_conditions: accessMap.get(c.id)?.commercial_conditions ?? "",
        allowed_product_ids: prodMap.get(c.id) ?? [],
      }));

      setClients(merged);

      // Busca todos os produtos
      const { data: productsData } = await supabase
        .from("products")
        .select("id, code, name, category, factory")
        .order("category")
        .order("name");

      setAllProducts(productsData ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function saveClientPortal(
    clientId: string,
    opts: {
      portal_enabled: boolean;
      commercial_conditions: string;
      product_ids: string[];
    }
  ) {
    try {
      // Upsert acesso
      const { error: accessError } = await supabase
        .from("client_portal_access")
        .upsert(
          {
            client_id: clientId,
            portal_enabled: opts.portal_enabled,
            commercial_conditions: opts.commercial_conditions,
          },
          { onConflict: "client_id" }
        );

      if (accessError) throw accessError;

      // Remove produtos antigos
      await supabase
        .from("client_portal_products")
        .delete()
        .eq("client_id", clientId);

      // Insere novos produtos
      if (opts.product_ids.length > 0) {
        const rows = opts.product_ids.map((product_id) => ({
          client_id: clientId,
          product_id,
        }));
        const { error: prodError } = await supabase
          .from("client_portal_products")
          .insert(rows);
        if (prodError) throw prodError;
      }

      toast({ title: "Portal atualizado", description: "Configurações salvas com sucesso." });
      await fetchAll();
      return true;
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }

  return { clients, allProducts, loading, saveClientPortal, refetch: fetchAll };
}
