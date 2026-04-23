import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bot, Send, Sparkles, Loader2, User, Trash2, ArrowDown } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;
const ANALYTICS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-analytics`;

const BEARER = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchAnalytics(msg: string): Promise<any | null> {
  const lower = msg.toLowerCase();
  let query_type: string | null = null;
  let params: any = {};

  // Extrair ano (2020-2029)
  const anoMatch = msg.match(/\b(202[0-9])\b/);
  const ano = anoMatch ? parseInt(anoMatch[1]) : null;

  // Extrair nome do cliente — sequência de 2+ palavras maiúsculas
  const clienteMatch = msg.match(/\b([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]{2,})+)\b/);
  const cliente = clienteMatch ? clienteMatch[1] : null;

  if (
    cliente &&
    (lower.includes("produto") ||
      lower.includes("vendido") ||
      lower.includes("comprou") ||
      lower.includes("faixa") ||
      lower.includes("histórico") ||
      lower.includes("historico"))
  ) {
    query_type = ano ? "client_top_product" : "client_history";
    params = ano ? { cliente, ano } : { cliente };
  } else if (lower.match(/compar|marca|century|ponto v[ií]rgula|wood|brand/)) {
    query_type = "brand_comparison";
    params = { months: 6 };
  } else if (lower.match(/top|maior|ranking|melhor cliente/)) {
    query_type = "top_clients";
    params = { limit: 10 };
  } else if (lower.match(/sem venda|parado|inativo|sem compra/)) {
    query_type = "products_no_sale";
    params = { days: 90 };
  } else if (lower.match(/mês|mensal|comparativo|evolução|evolucao|período|periodo/)) {
    query_type = "monthly_comparison";
    params = { months: 6 };
  }

  if (!query_type) return null;

  try {
    const res = await fetch(ANALYTICS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEARER}` },
      body: JSON.stringify({ query_type, params }),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const SUGGESTIONS = [
  "Quais clientes estão sem compra há mais de 60 dias?",
  "Quais oportunidades estão paradas no funil?",
  "Resuma as atividades pendentes desta semana",
  "Rascunhe um email de follow-up para cliente inativo",
  "Quais produtos têm maior volume de orçamentos?",
];

const TAB_CONTEXTS: Record<string, string> = {
  dashboard: "Usuário está no dashboard com métricas de vendas e KPIs",
  comercial: "Usuário está na área comercial — orçamentos e clientes",
  activities: "Usuário está na gestão de atividades e follow-ups",
  funnels: "Usuário está no funil de vendas com pipeline Kanban",
  "service-orders": "Usuário está nas ordens de serviço",
  operations: "Usuário está na operação — pedidos e logística",
  products: "Usuário está no catálogo de produtos",
  automations: "Usuário está configurando automações comerciais",
};

interface AICopilotProps {
  activeTab: string;
  clients?: any[];
  activities?: any[];
  quotes?: any[];
  opportunities?: any[];
  orders?: any[];
}

export function AICopilot({ 
  activeTab, 
  clients = [], 
  activities = [], 
  quotes = [], 
  opportunities = [],
  orders = [],
}: AICopilotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const getViewport = useCallback((): HTMLElement | null => {
    const root = scrollRef.current;
    if (!root) return null;
    return (
      (root.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null) || root
    );
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = getViewport();
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    setUserScrolled(false);
  }, [getViewport]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    const el = target || (e.currentTarget as HTMLElement);
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolled(distanceFromBottom > 100);
  }, []);

  const getContext = useCallback(() => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 60);

  // Atividades pendentes
  const pendingActivities = activities
    .filter(a => a.status !== 'concluida' && a.status !== 'cancelada' && a.status !== 'realizada')
    .slice(0, 15)
    .map(a => `- ${a.title} | tipo: ${a.type} | vencimento: ${a.due_date} | cliente: ${a.client_name || '—'} | prioridade: ${a.priority || '—'}`);

  // Oportunidades abertas
  const openOpps = opportunities
    .filter(o => o.stage !== 'ganho' && o.stage !== 'perdido')
    .slice(0, 15)
    .map(o => `- ${o.title} | fase: ${o.stage} | valor: R$ ${(o.value || 0).toLocaleString('pt-BR')} | funil: ${o.funnel_type || '—'}`);

  // Clientes inativos +60 dias
  const inactiveClients = clients
    .filter(c => {
      if (!c.last_purchase_date) return false;
      return new Date(c.last_purchase_date) < sixtyDaysAgo;
    })
    .slice(0, 10)
    .map(c => `- ${c.company} | última compra: ${c.last_purchase_date} | curva: ${c.curve || '—'}`);

  // Orçamentos recentes
  const recentQuotes = quotes
    .slice(0, 10)
    .map(q => `- ${q.client?.company || '—'} | total: R$ ${(q.total || 0).toLocaleString('pt-BR')} | status: ${q.status} | data: ${new Date(q.createdAt).toLocaleDateString('pt-BR')}`);

  // Pedidos recentes
  const recentOrders = orders
    .slice(0, 10)
    .map(o => `- ${o.client_name} | produto: ${o.product || '—'} | status: ${o.status} | valor: R$ ${(o.price || 0).toLocaleString('pt-BR')}`);

  // Métricas gerais
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active' || !c.status).length;
  const openOppsCount = openOpps.length;
  const openOppsValue = opportunities
    .filter(o => o.stage !== 'ganho' && o.stage !== 'perdido')
    .reduce((sum, o) => sum + (o.value || 0), 0);
  const pendingActivitiesCount = pendingActivities.length;
  const overdueActivities = activities
    .filter(a => {
      if (a.status === 'concluida' || a.status === 'cancelada' || a.status === 'realizada') return false;
      return new Date(a.due_date) < today;
    }).length;

  const tabContext = {
    dashboard: 'Dashboard principal com métricas e KPIs',
    comercial: 'Área comercial — orçamentos e clientes',
    activities: 'Gestão de atividades e follow-ups',
    funnels: 'Funil de vendas com pipeline Kanban',
    'service-orders': 'Ordens de serviço',
    operations: 'Operação — pedidos e logística',
    products: 'Catálogo de produtos',
    automations: 'Automações comerciais',
    financeiro: 'Financeiro — comissões e resultados',
  }[activeTab] || activeTab;

  return `
Aba atual: ${tabContext}
Data de hoje: ${today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

=== MÉTRICAS GERAIS ===
- Total de clientes: ${totalClients}
- Clientes ativos: ${activeClients}
- Oportunidades abertas: ${openOppsCount} (valor total: R$ ${openOppsValue.toLocaleString('pt-BR')})
- Atividades pendentes: ${pendingActivitiesCount} (${overdueActivities} vencidas)
- Clientes inativos +60 dias: ${inactiveClients.length}

=== ATIVIDADES PENDENTES ===
${pendingActivities.length > 0 ? pendingActivities.join('\n') : 'Nenhuma atividade pendente'}

=== OPORTUNIDADES ABERTAS NO FUNIL ===
${openOpps.length > 0 ? openOpps.join('\n') : 'Nenhuma oportunidade aberta'}

=== CLIENTES INATIVOS +60 DIAS ===
${inactiveClients.length > 0 ? inactiveClients.join('\n') : 'Nenhum cliente inativo'}

=== ORÇAMENTOS RECENTES ===
${recentQuotes.length > 0 ? recentQuotes.join('\n') : 'Nenhum orçamento recente'}

=== PEDIDOS RECENTES ===
${recentOrders.length > 0 ? recentOrders.join('\n') : 'Nenhum pedido recente'}
  `.trim();
}, [activeTab, clients, activities, quotes, opportunities, orders]);

  // ⌘+J para abrir
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Auto-scroll inteligente:
  // - Última msg do usuário → sempre rola pro fim
  // - Streaming do assistente → só rola pro fim se userScrolled === false
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.role === "user") {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      return;
    }

    if (!userScrolled) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, userScrolled, getViewport]);


  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Msg = { role: "user", content: msg };
    // Snapshot do histórico ANTES de adicionar a nova mensagem do usuário
    const historySnapshot = messagesRef.current;
    const fullConversation = [...historySnapshot, userMsg];

    setMessages(fullConversation);
    setInput("");
    setIsLoading(true);
    setUserScrolled(false);
    requestAnimationFrame(() => {
      const viewport = getViewport();
      if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Sempre tenta chamar crm-analytics antes do Claude
      const analyticsData = await fetchAnalytics(msg);

      console.log("[AICopilot] Analytics data:", JSON.stringify(analyticsData));
      console.log("[AICopilot] Enviando para ai-copilot com analytics:", !!analyticsData);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: fullConversation,
          context: getContext(),
          analytics_data: analyticsData,
        }),
      });

      if (!resp.ok || !resp.body) {
        upsertAssistant("Erro ao processar. Tente novamente.");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { break; }
        }
      }
    } catch {
      upsertAssistant("Erro de conexão. Verifique sua internet.");
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Copilot LSA</h3>
                <p className="text-[9px] text-muted-foreground">⌘+J para abrir · Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mr-8">
              <Badge variant="outline" className="text-[8px]">
                {messages.filter((m) => m.role === "user").length} msgs
              </Badge>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMessages([])}
                  title="Limpar conversa"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={scrollRef as any}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto min-h-0 px-4"
            >
              <div className="py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-3">Como posso ajudar?</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => sendMessage(s)}
                          className="text-[10px] px-2.5 py-1.5 rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div data-msg-role={msg.role} className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 mt-0.5">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {userScrolled && (
              <Button
                size="sm"
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 h-7 rounded-full shadow-md text-[10px] gap-1 px-3"
              >
                <ArrowDown className="h-3 w-3" />
                Nova resposta
              </Button>
            )}
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre clientes, oportunidades, metas..."
                className="min-h-[36px] max-h-[80px] resize-none text-xs"
                rows={1}
              />
              <Button size="icon" className="h-9 w-9 shrink-0"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
