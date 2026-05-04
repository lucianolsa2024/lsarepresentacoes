// supabase/functions/asaas-webhook/index.ts
// Recebe webhooks do ASAAS e atualiza status de pagamento nas OS

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de eventos ASAAS → status interno
const EVENT_STATUS_MAP: Record<string, string> = {
  "PAYMENT_CONFIRMED":         "CONFIRMED",
  "PAYMENT_RECEIVED":          "RECEIVED",
  "PAYMENT_OVERDUE":           "OVERDUE",
  "PAYMENT_DELETED":           "CANCELLED",
  "PAYMENT_RESTORED":          "PENDING",
  "PAYMENT_REFUNDED":          "REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED": "CHARGEBACK",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    const { event, payment } = payload;

    // Loga o webhook recebido
    await supabaseAdmin.from("asaas_webhook_logs").insert({
      event,
      payment_id: payment?.id,
      payload,
    });

    if (!payment?.id || !event) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const newStatus = EVENT_STATUS_MAP[event];
    if (!newStatus) {
      // Evento não mapeado — só loga, não faz nada
      return new Response(JSON.stringify({ received: true, ignored: event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Atualiza status da OS pelo asaas_payment_id
    const { data: updated, error } = await supabaseAdmin
      .from("service_orders")
      .update({
        payment_status: newStatus,
        // Se confirmado, atualiza data de pagamento
        ...(["CONFIRMED", "RECEIVED"].includes(newStatus) && {
          boleto_info: `ASAAS:${payment.id}:PAID`,
        }),
      })
      .eq("asaas_payment_id", payment.id)
      .select("id, os_number");

    if (error) throw error;

    return new Response(JSON.stringify({
      received: true,
      event,
      status: newStatus,
      updated: updated?.length ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    // Sempre retorna 200 para o ASAAS não reenviar
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
