// Edge function: gera resumo executivo financeiro via Lovable AI Gateway.
// Recebe métricas calculadas no client e devolve texto + insights estruturados.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await req.json();

    const systemPrompt = `Você é um analista financeiro sênior brasileiro. Receba os dados consolidados de uma empresa e produza um RESUMO EXECUTIVO em português, claro e direto.

Responda EXCLUSIVAMENTE em JSON com este formato:
{
  "summary": "parágrafo curto (3-4 linhas) com a leitura geral do mês",
  "highlights": ["3 a 5 pontos curtos com as principais variações vs mês anterior e ano anterior"],
  "recommendations": ["3 a 5 recomendações práticas e específicas baseadas nos números"],
  "insights": ["2 a 4 padrões inteligentes detectados, ex.: melhor dia de recebimento, concentração em fornecedor, sazonalidade"]
}

Use valores em R$ formatados (R$ 12.345,00). Cite percentuais com 1 casa. Não invente dados que não estejam no payload.`;

    const userMessage = `Dados consolidados de ${payload.context?.monthLabel ?? "este mês"}:

KPIs:
- Faturamento: R$ ${payload.kpis?.faturamento?.current?.toFixed(2)} (mês anterior R$ ${payload.kpis?.faturamento?.previous?.toFixed(2)}, meta R$ ${payload.kpis?.faturamento?.target?.toFixed(2)})
- Margem líquida: ${(payload.kpis?.margem?.current * 100)?.toFixed(1)}% (anterior ${(payload.kpis?.margem?.previous * 100)?.toFixed(1)}%)
- Giro de caixa (recebido - pago): R$ ${payload.kpis?.giroCaixa?.current?.toFixed(2)} (anterior R$ ${payload.kpis?.giroCaixa?.previous?.toFixed(2)})
- Inadimplência: ${(payload.kpis?.inadimplencia?.current * 100)?.toFixed(1)}% (limite ${payload.kpis?.inadimplencia?.target ? (payload.kpis.inadimplencia.target * 100).toFixed(1) : '-'}%)

Year-over-year:
- Receitas vs ano anterior: ${(payload.yoy?.deltaReceitas * 100)?.toFixed(1)}%
- Despesas vs ano anterior: ${(payload.yoy?.deltaDespesas * 100)?.toFixed(1)}%

Top 5 categorias de despesa:
${(payload.topExpenseCategories ?? []).slice(0, 5).map((c: any) => `- ${c.name}: R$ ${c.total?.toFixed(2)} (${(c.pct * 100).toFixed(1)}%)`).join("\n")}

Melhor dia de recebimento: ${payload.bestReceivableDay?.dayLabel ?? "n/d"} (R$ ${payload.bestReceivableDay?.total?.toFixed(2) ?? 0})
Dia com maior pagamento: ${payload.worstPaymentDay?.dayLabel ?? "n/d"} (R$ ${payload.worstPaymentDay?.total?.toFixed(2) ?? 0})

Alertas ativos:
${(payload.alerts ?? []).map((a: any) => `- [${a.level}] ${a.title}: ${a.description}`).join("\n")}

Resultado por empresa (totais 12m):
${(payload.companyResults ?? []).map((c: any) => `- ${c.companyName}: R$ ${c.totalResultado?.toFixed(2)}`).join("\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `IA Gateway falhou: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = { summary: String(content), highlights: [], recommendations: [], insights: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
