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

    console.log("[ai-copilot] Body recebido (keys):", JSON.stringify(Object.keys(body)));
    console.log("[ai-copilot] analytics_data presente:", !!body.analytics_data);
    if (body.analytics_data) {
      console.log("[ai-copilot] analytics_data preview:", JSON.stringify(body.analytics_data).slice(0, 500));
    }

    // === MODO EXTRACT_ONLY: extração de entidades, sem streaming ===
    if (body.extract_only) {
      console.log("[ai-copilot] modo extract_only ativo");
      const extractMessages = body.messages
        .filter((m: InMessage) => m.role === "user" || m.role === "assistant")
        .map((m: InMessage) => ({ role: m.role, content: m.content }));

      const extractResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          system:
            "Você extrai entidades de mensagens comerciais. Responda APENAS com JSON puro, sem markdown, sem explicação.",
          messages: extractMessages,
        }),
      });

      if (!extractResp.ok) {
        const errText = await extractResp.text().catch(() => "");
        console.error("[ai-copilot] extract_only Anthropic error:", extractResp.status, errText);
        return new Response(JSON.stringify({ cliente: null, ano: null, intent: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extractJson = await extractResp.json();
      const text =
        extractJson.content?.[0]?.type === "text" ? extractJson.content[0].text : "{}";
      console.log("[ai-copilot] extract_only resultado:", text);
      return new Response(text, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context, analytics_data, user_email } = body as {
      messages: InMessage[];
      context?: string;
      analytics_data?: unknown;
      user_email?: string;
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

## CRIAÇÃO DE ATIVIDADES (TOOL USE)
Você tem acesso à tool **create_activity** para criar atividades CRM (visita, ligação, follow-up, reunião, email) no sistema.
- Use quando o usuário pedir explicitamente ("crie uma visita pra...", "agende ligação com...", "marca follow-up D+5...").
- Use proativamente quando identificar urgência clara (cliente curva A inativo, oportunidade parada) — mas explique na resposta o que está fazendo.
- Sempre forneça o campo client_name exatamente como aparece nos dados (Nome Fantasia preferencialmente).
- Datas no formato YYYY-MM-DD; se o usuário disser "amanhã" ou "D+5", calcule a partir da data de hoje informada no contexto.
- Após criar, continue a resposta normalmente — o sistema adiciona uma confirmação ✅ automaticamente.

Contexto atual do sistema:
${context}
${analytics_data
  ? `\n\n=== DADOS REAIS DO BANCO (use estes para responder, NÃO invente) ===\n${JSON.stringify(analytics_data, null, 2)}`
  : "\n\n=== DADOS ANALÍTICOS ===\nNenhum dado analítico disponível"}`;

    // Anthropic Messages API expects only user/assistant in `messages`,
    // and the system prompt as a separate top-level field.
    const anthropicMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const tools = [
      {
        name: "create_activity",
        description:
          "Cria uma atividade/tarefa CRM no sistema para um cliente. Use quando o usuário pedir explicitamente para criar uma visita, ligação, follow-up, reunião, email ou tarefa, OU quando você identificar proativamente que um cliente precisa de atenção e quiser agendar uma ação concreta. Sempre confirme com clareza o cliente, tipo e data antes de criar.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título da atividade (ex: 'Visita de retomada — Loja XYZ')" },
            type: {
              type: "string",
              enum: ["visita", "ligacao", "followup", "reuniao", "email"],
              description: "Tipo da atividade",
            },
            due_date: { type: "string", description: "Data no formato YYYY-MM-DD" },
            client_name: { type: "string", description: "Nome (Nome Fantasia ou empresa) do cliente" },
            description: { type: "string", description: "Descrição/observações da atividade" },
            priority: {
              type: "string",
              enum: ["alta", "media", "baixa"],
              description: "Prioridade (default: media)",
            },
          },
          required: ["title", "type", "due_date", "client_name"],
        },
      },
      {
        name: "read_document",
        description:
          "Lê e extrai o conteúdo de um PDF armazenado no sistema (pedidos, orçamentos, checklists). Use quando o usuário pedir para analisar, resumir ou consultar um documento específico. Após chamar, você receberá o conteúdo do documento para responder ao usuário.",
        input_schema: {
          type: "object",
          properties: {
            bucket: {
              type: "string",
              description: "Nome do bucket de storage. Valores válidos: 'pedidos', 'checklist-photos', 'service-order-files', 'finance-documents', 'assistance-attachments'.",
            },
            path: { type: "string", description: "Caminho/nome do arquivo dentro do bucket" },
          },
          required: ["bucket", "path"],
        },
      },
    ];

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
        tools,
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
        // Tool use accumulators (keyed by content block index)
        const toolBlocks = new Map<
          number,
          { name: string; id: string; jsonBuffer: string }
        >();

        const emit = (text: string) => {
          const payload = JSON.stringify({
            choices: [{ delta: { content: text } }],
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        const executeCreateActivity = async (input: any) => {
          try {
            const { createClient } = await import(
              "https://esm.sh/@supabase/supabase-js@2"
            );
            const supabase = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            );

            // Buscar client_id pelo nome (Nome Fantasia / company / trade_name)
            let clientId: string | null = null;
            let clientCompany: string | null = null;
            const name = String(input.client_name || "").trim();
            if (name) {
              const { data: byTrade } = await supabase
                .from("clients")
                .select("id, company, trade_name")
                .ilike("trade_name", `%${name}%`)
                .limit(1);
              if (byTrade && byTrade.length > 0) {
                clientId = byTrade[0].id;
                clientCompany = byTrade[0].trade_name || byTrade[0].company;
              } else {
                const { data: byCompany } = await supabase
                  .from("clients")
                  .select("id, company, trade_name")
                  .ilike("company", `%${name}%`)
                  .limit(1);
                if (byCompany && byCompany.length > 0) {
                  clientId = byCompany[0].id;
                  clientCompany = byCompany[0].trade_name || byCompany[0].company;
                }
              }
            }

            const { error: insertErr } = await supabase.from("activities").insert({
              title: input.title,
              type: input.type,
              due_date: input.due_date,
              description: input.description || "",
              priority: input.priority || "media",
              client_id: clientId,
              client_name: clientCompany || input.client_name,
              activity_category: "crm",
              status: "pendente",
              assigned_to_email: user_email || null,
            });

            if (insertErr) {
              console.error("[ai-copilot] erro insert activity:", insertErr);
              emit(
                `\n\n⚠️ Não consegui criar a atividade: ${insertErr.message}`,
              );
              return;
            }

            const clientLabel = clientCompany || input.client_name;
            const matchNote = clientId ? "" : " _(cliente não encontrado na base — atividade criada sem vínculo)_";
            emit(
              `\n\n✅ Atividade criada: **${input.title}** — ${clientLabel} em ${input.due_date}${matchNote}`,
            );
          } catch (e) {
            console.error("[ai-copilot] executeCreateActivity error:", e);
            emit(`\n\n⚠️ Erro ao criar atividade: ${e instanceof Error ? e.message : "desconhecido"}`);
          }
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

                // Início de bloco: pode ser text ou tool_use
                if (evt.type === "content_block_start" && evt.content_block) {
                  if (evt.content_block.type === "tool_use") {
                    toolBlocks.set(evt.index ?? 0, {
                      name: evt.content_block.name,
                      id: evt.content_block.id,
                      jsonBuffer: "",
                    });
                  }
                }

                // Delta de texto normal
                if (
                  (currentEvent === "content_block_delta" || evt.type === "content_block_delta") &&
                  evt.delta?.type === "text_delta" &&
                  typeof evt.delta.text === "string"
                ) {
                  emit(evt.delta.text);
                }

                // Delta de input JSON da tool
                if (
                  evt.type === "content_block_delta" &&
                  evt.delta?.type === "input_json_delta" &&
                  typeof evt.delta.partial_json === "string"
                ) {
                  const block = toolBlocks.get(evt.index ?? 0);
                  if (block) block.jsonBuffer += evt.delta.partial_json;
                }

                // Fim de bloco: se for tool_use completa, executa
                if (evt.type === "content_block_stop") {
                  const block = toolBlocks.get(evt.index ?? 0);
                  if (block) {
                    let parsedInput: any = {};
                    try {
                      parsedInput = block.jsonBuffer ? JSON.parse(block.jsonBuffer) : {};
                    } catch (e) {
                      console.error("[ai-copilot] tool input parse error:", e, block.jsonBuffer);
                    }
                    console.log("[ai-copilot] executando tool:", block.name, parsedInput);
                    if (block.name === "create_activity") {
                      await executeCreateActivity(parsedInput);
                    }
                    toolBlocks.delete(evt.index ?? 0);
                  }
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
