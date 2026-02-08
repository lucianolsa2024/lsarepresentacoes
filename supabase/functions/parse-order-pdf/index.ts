import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdfText } = await req.json();
    if (!pdfText || typeof pdfText !== "string") {
      return new Response(JSON.stringify({ error: "pdfText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em extrair dados estruturados de orçamentos/pedidos de fábricas de móveis (como Century, SoHome).

Dado o texto extraído de um PDF de orçamento, extraia os seguintes dados:

1. Dados do cliente:
   - nomeFantasia (nome fantasia do cliente)
   - cnpj
   - telefone
   - email
   - endereco (rua completa com número)
   - cidade
   - estado
   - cep

2. Dados do pedido:
   - numeroPedido (número do orçamento/pedido)
   - dataEmissao (formato YYYY-MM-DD)
   - representante (nome do representante)
   - condicaoPagamento (ex: "30/60/90/120/150/180 DIAS")
   - previsaoFaturamento (formato YYYY-MM-DD)
   - fornecedor (nome da fábrica, ex: "CENTURY")

3. Lista de itens, cada um com:
   - produto (nome do modelo, ex: "DESIREE", "ANNE")
   - descricaoCompleta (descrição completa do item)
   - dimensoes (ex: "COMP:0.66M PROF:0.62M ALT:0.81M")
   - tecido (faixa e código do tecido, ex: "FX D D4264")
   - tecidoFornecido ("SIM" ou "NAO")
   - quantidade (número inteiro)
   - precoUnitario (número decimal, preço líquido unitário)
   - precoTotal (número decimal, preço total do item)

Retorne APENAS um JSON válido, sem markdown.`;

    console.log("Sending PDF text to AI for extraction, text length:", pdfText.length);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extraia os dados do seguinte texto de PDF de orçamento:\n\n${pdfText}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_order_data",
                description: "Extrai dados estruturados de um orçamento/pedido PDF",
                parameters: {
                  type: "object",
                  properties: {
                    cliente: {
                      type: "object",
                      properties: {
                        nomeFantasia: { type: "string" },
                        cnpj: { type: "string" },
                        telefone: { type: "string" },
                        email: { type: "string" },
                        endereco: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        cep: { type: "string" },
                      },
                      required: ["nomeFantasia"],
                    },
                    pedido: {
                      type: "object",
                      properties: {
                        numeroPedido: { type: "string" },
                        dataEmissao: { type: "string" },
                        representante: { type: "string" },
                        condicaoPagamento: { type: "string" },
                        previsaoFaturamento: { type: "string" },
                        fornecedor: { type: "string" },
                      },
                      required: ["numeroPedido", "dataEmissao"],
                    },
                    itens: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          produto: { type: "string" },
                          descricaoCompleta: { type: "string" },
                          dimensoes: { type: "string" },
                          tecido: { type: "string" },
                          tecidoFornecido: { type: "string" },
                          quantidade: { type: "number" },
                          precoUnitario: { type: "number" },
                          precoTotal: { type: "number" },
                        },
                        required: ["produto", "quantidade", "precoUnitario"],
                      },
                    },
                  },
                  required: ["cliente", "pedido", "itens"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_order_data" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar o PDF com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("AI response received successfully");

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "IA não retornou dados estruturados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", JSON.stringify(extractedData).substring(0, 500));

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-order-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
