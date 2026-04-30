// src/pages/ClientOrdersPage.tsx
// Página de pedidos do portal do cliente — somente leitura

import { useState } from "react";
import { useClientOrders, ClientOrder } from "@/hooks/useClientOrders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, Search, FileText,
  Package, Calendar, Hash, ExternalLink,
  ChevronDown, ChevronUp, Truck
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  "em produção":      { label: "Em Produção",       color: "bg-blue-100 text-blue-800 border-blue-200" },
  "aguardando tecido":{ label: "Aguardando Tecido",  color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  "pronto":           { label: "Pronto p/ Entrega",  color: "bg-green-100 text-green-800 border-green-200" },
  "entregue":         { label: "Entregue",           color: "bg-gray-100 text-gray-600 border-gray-200" },
  "cancelado":        { label: "Cancelado",          color: "bg-red-100 text-red-700 border-red-200" },
};

function getStatus(status: string) {
  const key = status?.toLowerCase();
  return STATUS_CONFIG[key] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
}

// ─── Card de pedido ───────────────────────────────────────
function OrderCard({ order }: { order: ClientOrder }) {
  const [expanded, setExpanded] = useState(false);
  const st = getStatus(order.status);
  const deliveryDate = order.reschedule_date || order.delivery_date;
  const wasRescheduled = Boolean(order.reschedule_date && order.delivery_date && order.reschedule_date !== order.delivery_date);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Linha principal */}
        <div
          className="flex items-center gap-4 p-4 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Ícone status */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {order.order_number ? `Pedido #${order.order_number}` : "Pedido s/ número"}
              </span>
              {order.oc && (
                <span className="text-xs text-muted-foreground">OC: {order.oc}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{order.product ?? "—"}</p>
          </div>

          {/* Status + data */}
          <div className="shrink-0 text-right space-y-1">
            <Badge className={`text-xs border ${st.color}`} variant="outline">
              {st.label}
            </Badge>
            {deliveryDate && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Truck className="w-3 h-3" />
                <span className={wasRescheduled ? "text-amber-600 font-medium" : ""}>
                  {fmtDate(deliveryDate)}
                </span>
                {wasRescheduled && (
                  <span className="text-amber-500 text-xs">↺</span>
                )}
              </div>
            )}
          </div>

          {/* Chevron */}
          <div className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="border-t bg-muted/20 p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Emissão
                </p>
                <p className="text-sm font-medium">{fmtDate(order.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Previsão Entrega
                </p>
                <p className={`text-sm font-medium ${wasRescheduled ? "text-amber-600" : ""}`}>
                  {fmtDate(deliveryDate)}
                  {wasRescheduled && (
                    <span className="ml-1 text-xs text-amber-500">(reagendado)</span>
                  )}
                </p>
              </div>
              {order.nf_number && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    NF
                  </p>
                  <p className="text-sm font-medium">{order.nf_number}</p>
                </div>
              )}
              {order.supplier && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Fornecedor
                  </p>
                  <p className="text-sm font-medium">{order.supplier}</p>
                </div>
              )}
            </div>

            {/* Links para PDFs */}
            <div className="flex flex-wrap gap-2">
              {order.pdf_url && (
                <a
                  href={order.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-white hover:bg-muted transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF do Pedido
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              )}
              {order.nf_pdf_url && (
                <a
                  href={order.nf_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-white hover:bg-muted transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF da NF
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              )}
              {!order.pdf_url && !order.nf_pdf_url && (
                <span className="text-xs text-muted-foreground">Nenhum documento disponível</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────
export default function ClientOrdersPage() {
  const { orders, activeOrders, deliveredOrders, loading, error } = useClientOrders();
  const [search, setSearch] = useState("");
  const [showDelivered, setShowDelivered] = useState(false);

  const filterOrders = (list: ClientOrder[]) => {
    if (!search.trim()) return list;
    const t = search.toLowerCase();
    return list.filter(o =>
      o.order_number?.toLowerCase().includes(t) ||
      o.oc?.toLowerCase().includes(t) ||
      o.product?.toLowerCase().includes(t) ||
      o.nf_number?.toLowerCase().includes(t)
    );
  };

  const filteredActive = filterOrders(activeOrders);
  const filteredDelivered = filterOrders(deliveredOrders);

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando pedidos...
        </div>
      </div>
    );
  }

  // ─── Erro ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center p-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Pedidos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeOrders.length} ativo{activeOrders.length !== 1 ? "s" : ""} ·{" "}
              {deliveredOrders.length} entregue{deliveredOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Buscar por pedido, OC, produto, NF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Pedidos ativos */}
        {filteredActive.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Em andamento
            </h2>
            {filteredActive.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        ) : (
          orders.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
                <Package className="w-10 h-10" />
                <p>Nenhum pedido encontrado.</p>
              </CardContent>
            </Card>
          ) : search ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhum resultado para "<strong>{search}</strong>"
              </CardContent>
            </Card>
          ) : null
        )}

        {/* Pedidos entregues — colapsável */}
        {deliveredOrders.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowDelivered(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 hover:text-foreground transition"
            >
              {showDelivered ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Entregues ({filteredDelivered.length})
            </button>
            {showDelivered && filteredDelivered.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}
