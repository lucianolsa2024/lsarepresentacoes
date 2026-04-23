const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body. Expected { messages, context }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, context, analytics_data } = body as {
      messages: InMessage[];
      context?: string;
      analytics_data?: unknown;
    };

    // context é uma string longa já formatada pelo frontend (AICopilot.tsx)
    // analytics_data vem da edge function crm-analytics quando detectada intenção analítica
    const systemPrompt = `Você é o AI Copilot da LSA Representações, assistente especializado em gestão comercial de móveis e decoração de alto padrão B2B.

## SOBRE A LSA REPRESENTAÇÕES
Empresa de representação comercial com ~30 anos de mercado, atuando no segmento de móveis e decoração de alto padrão, com foco em sell-out no ponto de venda e relacionamento com redes de franquias.

## PORTFÓLIO DE MARCAS

### CENTURY
- Posicionamento: contemporâneo e clássico, alto padrão
- Público-alvo: lojistas premium, arquitetos, consumidor final exigente
- Diferenciais: qualidade de acabamento, variedade de modulações, tecidos premium (FX A a FX J, couro, 3D)
- Oportunidades: clientes com perfil A e B da carteira, lojas com showroom estruturado

### PONTO VÍRGULA
- Posicionamento: visual arrojado e futurista, médio-alto padrão
- Público-alvo: consumidor jovem, moderno, antenado em tendências
- Diferenciais: marca nova com identidade visual forte, diferenciação de mix
- Oportunidades: clientes que já compram Century e podem ampliar mix, lojas em regiões jovens/urbanas
- Estratégia: usar como produto de entrada ou complemento para diversificar o showroom do cliente

### TAPETES SÃO CARLOS
- Posicionamento: médio padrão, em processo de reposicionamento para médio-alto
- Produto: tapetes exclusivamente
- Público-alvo: lojistas com foco em decoração completa
- Oportunidades: venda complementar a qualquer cliente do portfólio — tapete fecha o ambiente
- Estratégia: oferecer sempre como complemento ao pedido de sofá/poltrona

## GRADE DE TECIDOS (CENTURY/SOHOME)
- SEM TEC: produto sem tecido (base/estrutura)
- FX A ao FX J: faixas de tecido em ordem crescente de valor
- FX 3D: tecido tridimensional, premium
- FX COURO: couro natural, topo de linha
- Regra de upsell: sempre oferecer uma faixa acima do que o cliente pede

## RITUAIS DE GESTÃO COMERCIAL

### ROTEIRO DE VISITA IDEAL
1. **Pré-visita**: revisar histórico de compras, última visita, produtos no showroom
2. **Abertura**: checar o showroom — o que está exposto, estado de conservação, posicionamento
3. **Diagnóstico**: entender o que está vendendo (sell-out), o que está parado, o que o cliente sente falta
4. **Apresentação**: mostrar novidades, lançamentos, produtos complementares ao mix atual
5. **Proposta**: montar orçamento na hora sempre que possível
6. **Fechamento**: definir próximo passo concreto (data, produto, valor)
7. **Pós-visita**: registrar atividade, agendar follow-up

### QUALIFICAÇÃO DE CLIENTES (CURVA ABC)
- **Curva A**: maior volume de compra, prioridade máxima de visita e relacionamento
- **Curva B**: potencial de crescimento, foco em aumentar mix e frequência
- **Curva C**: baixo volume, avaliar potencial real vs esforço

### SINAIS DE OPORTUNIDADE
- Cliente com sell-out alto mas sell-in baixo → showroom desabastecido, momento de reposição
- Cliente que compra só uma marca → oportunidade de introduzir Ponto Vírgula ou Tapetes SC
- Cliente sem compra há 60+ dias → risco de churn, visita urgente
- Cliente com ticket médio baixo → oportunidade de upsell em tecido ou produto
- Cliente novo na carteira → priorizar onboarding com visita em D+30

### FOLLOW-UP PADRÃO
- D+1 após orçamento: confirmar recebimento e tirar dúvidas
- D+5: follow-up ativo por WhatsApp ou ligação
- D+15: se sem retorno, nova abordagem com argumento diferente
- D+30: visita presencial se cliente for A ou B

### ARGUMENTOS DE VALOR
- Prazo de embarque médio: 60 dias corridos
- Qualidade de acabamento superior à concorrência
- Suporte técnico e assistência pós-venda
- Exclusividade de mix por região (quando aplicável)
- Tapete São Carlos como complemento que aumenta o ticket médio do ambiente

## COMO ANALISAR DADOS
Quando o usuário pedir análises, use os dados fornecidos no contexto para:
- Identificar padrões de compra por cliente
- Sugerir ações concretas e priorizadas
- Comparar períodos (MoM, YoY)
- Identificar clientes em risco
- Sugerir produtos com base no perfil do cliente (look-alike)

Sempre seja direto, prático e acionável. Responda em português brasileiro. Quando identificar uma oportunidade ou risco, sugira a ação específica a ser tomada.

## FORMATAÇÃO DE LISTAS DE PRODUTOS
Ao listar produtos sem venda / parados / inativos, use SEMPRE este formato enxuto, um por linha:
- NOME DO PRODUTO (Marca - Categoria)

Exemplo correto:
- MODELO MESA LIZZA (Century - Mesas de Centro)
- POLTRONA OSLO (Ponto Vírgula - Poltronas)

NÃO inclua data da última venda, quantidade de dias parados, valores ou colunas separadas por "|". Mantenha a lista limpa e direta.

Contexto atual do sistema:
${context}

=== DADOS ANALÍTICOS EM TEMPO REAL ===
${analytics_data ? JSON.stringify(analytics_data, null, 2) : "Nenhum dado analítico disponível"}`;

    // Anthropic Messages API expects only user/assistant in `messages`,
    // and the system prompt as a separate top-level field.
    const anthropicMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Anthropic error:", upstream.status, errText);
      const status = upstream.status === 429 ? 429 : upstream.status === 401 ? 401 : 500;
      return new Response(
        JSON.stringify({
          error: status === 429 ? "Rate limit exceeded, try again later." : "Anthropic API error",
          detail: errText,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Transform Anthropic SSE into OpenAI-style chunks:
    // data: {"choices":[{"delta":{"content":"..."}}]}\n\n
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let currentEvent = "";

        const emit = (text: string) => {
          const payload = JSON.stringify({
            choices: [{ delta: { content: text } }],
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nlIdx: number;
            while ((nlIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nlIdx);
              buffer = buffer.slice(nlIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);

              if (line.startsWith("event: ")) {
                currentEvent = line.slice(7).trim();
                continue;
              }
              if (!line.startsWith("data: ")) continue;

              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;

              try {
                const evt = JSON.parse(dataStr);
                // Anthropic streaming: content_block_delta carries text
                if (
                  (currentEvent === "content_block_delta" || evt.type === "content_block_delta") &&
                  evt.delta?.type === "text_delta" &&
                  typeof evt.delta.text === "string"
                ) {
                  emit(evt.delta.text);
                }
                if (evt.type === "message_stop" || currentEvent === "message_stop") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch (e) {
                // Partial JSON: put back and wait for more
                buffer = line + "\n" + buffer;
                break;
              }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("ai-copilot error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
