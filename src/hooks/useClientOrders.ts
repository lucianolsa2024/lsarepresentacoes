// src/hooks/useClientOrders.ts
// Busca os pedidos do cliente logado via client_id em user_roles

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ClientOrder {
  id: string;
  order_number: string | null;
  oc: string | null;
  product: string | null;
  status: string;
  delivery_date: string | null;
  reschedule_date: string | null;
  pdf_url: string | null;
  nf_number: string | null;
  nf_pdf_url: string | null;
  issue_date: string;
  supplier: string | null;
}

const STATUS_ORDER: Record<string, number> = {
  "em produção": 0,
  "aguardando tecido": 1,
  "pronto": 2,
  "entregue": 3,
  "cancelado": 4,
};

export function useClientOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchOrders();
  }, [user?.id]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);

    try {
      // 1. Busca client_id vinculado ao usuário
      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("client_id")
        .eq("user_id", user!.id)
        .eq("role", "client")
        .maybeSingle();

      if (roleErr) throw roleErr;
      if (!roleData?.client_id) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setClientId(roleData.client_id);

      // 2. Busca pedidos do cliente, excluindo cancelados por padrão
      const { data, error: ordersErr } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          oc,
          product,
          status,
          delivery_date,
          reschedule_date,
          pdf_url,
          nf_number,
          nf_pdf_url,
          issue_date,
          supplier
        `)
        .eq("client_id", roleData.client_id)
        .order("issue_date", { ascending: false });

      if (ordersErr) throw ordersErr;

      // Ordena: ativos primeiro (em produção, aguardando, pronto), depois entregues, cancelados por último
      const sorted = (data ?? []).sort((a, b) => {
        const aOrder = STATUS_ORDER[a.status?.toLowerCase()] ?? 99;
        const bOrder = STATUS_ORDER[b.status?.toLowerCase()] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // Dentro do mesmo status, mais recente primeiro
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
      });

      setOrders(sorted);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  // Agrupa por status para facilitar exibição
  const activeOrders = orders.filter(o =>
    !["entregue", "cancelado"].includes(o.status?.toLowerCase())
  );
  const deliveredOrders = orders.filter(o =>
    o.status?.toLowerCase() === "entregue"
  );
  const cancelledOrders = orders.filter(o =>
    o.status?.toLowerCase() === "cancelado"
  );

  return {
    orders,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    clientId,
    loading,
    error,
    refetch: fetchOrders,
  };
}
