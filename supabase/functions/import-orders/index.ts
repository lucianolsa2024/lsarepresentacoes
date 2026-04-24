import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orders, mode } = await req.json();

    if (!orders || !Array.isArray(orders)) {
      return new Response(JSON.stringify({ error: "orders array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se mode = "replace_month", apaga os registros do mês antes de inserir
    if (mode === "replace_month" && orders.length > 0) {
      const issueDate = orders[0].issue_date;
      const yearMonth = issueDate.substring(0, 7); // ex: "2026-04"

      await supabase
        .from("orders")
        .delete()
        .gte("issue_date", `${yearMonth}-01`)
        .lte("issue_date", `${yearMonth}-31`);
    }

    // Upsert por order_number
    const { data, error } = await supabase
      .from("orders")
      .upsert(orders, {
        onConflict: "order_number",
        ignoreDuplicates: false,
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, inserted: orders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
