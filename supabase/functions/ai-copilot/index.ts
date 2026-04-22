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

    const { messages, context } = body as { messages: InMessage[]; context?: string };

    // context é uma string longa já formatada pelo frontend (AICopilot.tsx)
    // contendo métricas, atividades, clientes, etc. Incluída diretamente no prompt.
    const systemPrompt =
      `Você é o AI Copilot da LSA Representações, assistente especializado em gestão comercial de móveis de alto padrão B2B. ` +
      `Contexto atual: ${context ?? "não informado"}. Seja direto e prático em português brasileiro.`;

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
