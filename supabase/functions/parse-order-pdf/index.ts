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
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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

    const systemPrompt = `Você é um especialista em extrair dados estruturados de orçamentos/pedidos de fábricas de móveis.

O PDF pode ser de dois tipos:
A) Um orçamento/pedido de uma fábrica para UM cliente (ex: PDF da Century/SoHome com cabeçalho do cliente)
B) Uma planilha/relatório exportado como PDF com VÁRIOS clientes em linhas diferentes

Para o tipo A, extraia os dados normalmente com um único cliente.
Para o tipo B, cada linha da tabela pode ter um cliente diferente — extraia o nome do cliente DE CADA LINHA.

Extraia os seguintes dados:

1. Dados gerais do pedido:
   - numeroPedido (número do orçamento/pedido, se houver)
   - dataEmissao (formato YYYY-MM-DD)
   - representante (nome do representante)
   - condicaoPagamento
   - previsaoFaturamento (formato YYYY-MM-DD)
   - fornecedor (nome da fábrica)

2. Lista de itens — EXTRAIA TODOS os itens/linhas, sem exceção. Cada item deve conter:
   - clienteNome (nome do cliente DESTE item específico — campo OBRIGATÓRIO)
   - clienteCnpj (CNPJ do cliente, se disponível)
   - clienteTelefone
   - clienteEmail
   - clienteCidade
   - clienteEstado
   - numeroPedidoItem (número do pedido deste item, se diferente do geral)
   - produto (nome do modelo)
   - descricaoCompleta (descrição completa)
   - dimensoes
   - tecido (faixa e código do tecido)
   - tecidoFornecido ("SIM" ou "NAO")
   - quantidade (número inteiro)
   - precoUnitario (número decimal)
   - precoTotal (número decimal)

IMPORTANTE: 
- Extraia TODAS as linhas. Se houver 50 itens, retorne 50.
- O campo clienteNome é OBRIGATÓRIO em cada item. Use o nome que aparece na linha/coluna de cliente.
- Se o PDF é tipo A (um único cliente), repita o nome em todos os itens.
- Valores monetários em formato brasileiro devem virar número em reais:
  - "2.092" significa 2092.00 (não 2.092)
  - "2.092,00" significa 2092.00
  - "159,90" significa 159.90

Retorne APENAS JSON válido.`;

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
              content: `Extraia os dados do seguinte texto de PDF de orçamento/planilha:\n\n${pdfText}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_order_data",
                description: "Extrai dados estruturados de um orçamento/pedido PDF ou planilha PDF",
                parameters: {
                  type: "object",
                  properties: {
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
                    },
                    itens: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          clienteNome: { type: "string", description: "Nome do cliente desta linha" },
                          clienteCnpj: { type: "string" },
                          clienteTelefone: { type: "string" },
                          clienteEmail: { type: "string" },
                          clienteCidade: { type: "string" },
                          clienteEstado: { type: "string" },
                          numeroPedidoItem: { type: "string" },
                          produto: { type: "string" },
                          descricaoCompleta: { type: "string" },
                          dimensoes: { type: "string" },
                          tecido: { type: "string" },
                          tecidoFornecido: { type: "string" },
                          quantidade: { type: "number" },
                          precoUnitario: { type: "number" },
                          precoTotal: { type: "number" },
                        },
                        required: ["clienteNome", "produto", "quantidade", "precoUnitario"],
                      },
                    },
                  },
                  required: ["pedido", "itens"],
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
