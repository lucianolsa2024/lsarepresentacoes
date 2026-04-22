import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bot, Send, Sparkles, Loader2, User, Trash2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Msg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

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
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: getContext(),
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
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
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
            <Badge variant="outline" className="text-[8px]">
              {messages.filter((m) => m.role === "user").length} msgs
            </Badge>
          </div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef as any}>
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
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
          </ScrollArea>

          {/* Input */}
          <div className="border-t px-3 py-2">
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
