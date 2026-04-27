import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bot, Send, Sparkles, Loader2, User, Trash2, ArrowDown, History, ArrowLeft, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string; timestamp?: number };

type Session = {
  id: string;
  date: string; // ISO
  preview?: string;
  messages: Msg[];
};

const SESSION_KEY = "copilot_current_session";
const HISTORY_KEY = "copilot_history";
const MAX_HISTORY = 30;

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadHistory(): Session[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(sessions: Session[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_HISTORY)));
  } catch {
    // ignore storage errors
  }
}

function loadCurrentSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;
const ANALYTICS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-analytics`;

const BEARER = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTIONS = [
  "Quais clientes estão sem compra há mais de 60 dias?",
  "Quais oportunidades estão paradas no funil?",
  "Resuma as atividades pendentes desta semana",
  "Quais produtos da minha carteira ainda não foram expostos no showroom?",
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
  products?: any[];
  userEmail?: string;
}

export function AICopilot({ 
  activeTab, 
  clients = [], 
  activities = [], 
  quotes = [], 
  opportunities = [],
  orders = [],
  products = [],
  userEmail,
}: AICopilotProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(() => loadHistory());
  const [readOnly, setReadOnly] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => newSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Autosave: a cada mensagem nova, persiste a sessão atual em SESSION_KEY
  useEffect(() => {
    if (readOnly) return; // não sobrescreve enquanto lê histórico
    if (messages.length === 0) return;
    const session: Session = {
      id: currentSessionId,
      date: new Date().toISOString(),
      preview: messages.find((m) => m.role === "user")?.content?.slice(0, 60) || "",
      messages,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [messages, currentSessionId, readOnly]);

  // Função reutilizável para gerar sugestões proativas
  const loadProactiveSuggestions = useCallback(async (cancelledRef: { value: boolean }) => {
    setIsLoading(true);
    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      if (cancelledRef.value) return;
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [
          ...prev,
          { role: "assistant", content: assistantSoFar, timestamp: Date.now() },
        ];
      });
    };

    try {
      let analyticsData: any = null;
      try {
        const analyticsRes = await fetch(ANALYTICS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BEARER}`,
          },
          body: JSON.stringify({
            query_type: "inactive_curve_a",
            params: { days: 60, limit: 5 },
          }),
        });
        analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
      } catch (e) {
        console.error("[AICopilot] proativo - erro analytics:", e);
      }

      if (cancelledRef.value) return;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEARER}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Analise os clientes curva A inativos e sugira as 3 ações mais urgentes. Para cada um sugira criar uma atividade de visita ou ligação. Seja direto e use emojis.",
            },
          ],
          context: `${getContext()}\n\nUsuário acabou de abrir o Copilot — gerar análise proativa.`,
          analytics_data: analyticsData,
          user_email: user?.email,
        }),
      });

      if (!resp.ok || !resp.body) {
        upsertAssistant("Não consegui carregar sugestões agora. Pergunte algo abaixo.");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (cancelledRef.value) break;
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
          } catch {
            break;
          }
        }
      }
    } catch (e) {
      console.error("[AICopilot] Erro sugestões proativas:", e);
    } finally {
      if (!cancelledRef.value) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Ao abrir o Copilot: restaura sessão atual se existir, senão deixa tela inicial com sugestões
  useEffect(() => {
    if (!open) return;
    setShowHistory(false);
    setReadOnly(false);

    const saved = loadCurrentSession();
    if (saved && saved.messages.length > 0) {
      setMessages(saved.messages);
      setCurrentSessionId(saved.id);
      return;
    }

    // Sem sessão salva — apenas inicia novo chat (NÃO dispara proativo automático)
    setMessages([]);
    setCurrentSessionId(newSessionId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Disparar análise proativa SOB DEMANDA (clique do usuário)
  const triggerProactiveSuggestions = useCallback(() => {
    const cancelledRef = { value: false };
    loadProactiveSuggestions(cancelledRef);
  }, [loadProactiveSuggestions]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setReadOnly(false);
    setShowHistory(false);
    setCurrentSessionId(newSessionId());
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Lixeira: arquiva sessão atual em HISTORY_KEY e inicia novo chat
  const archiveAndClear = useCallback(() => {
    try {
      const current = loadCurrentSession();
      if (current && current.messages.length > 0) {
        const history = loadHistory();
        history.unshift(current);
        saveHistory(history);
        setSessions(loadHistory());
      }
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error("[AICopilot] erro ao arquivar sessão:", e);
    }
    setMessages([]);
    setReadOnly(false);
    setCurrentSessionId(newSessionId());
  }, []);

  const clearAllHistory = useCallback(() => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
    setSessions([]);
  }, []);

  const openSession = useCallback((session: Session) => {
    setMessages(session.messages);
    setReadOnly(true);
    setShowHistory(false);
  }, []);

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
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Atividades
    const pending = activities?.filter(a =>
      !['concluida', 'cancelada', 'realizada'].includes(a.status)
    ) || [];
    const overdue = pending.filter(a => new Date(a.due_date) < today);

    // Oportunidades
    const openOpps = opportunities?.filter(o =>
      !['ganho', 'perdido'].includes(o.stage)
    ) || [];
    const oppValue = openOpps.reduce((s, o) => s + (o.value || 0), 0);

    // Clientes
    const curveA = clients?.filter(c => c.curve === 'A') || [];
    const inactive60 = clients?.filter(c => {
      if (!c.last_purchase_date) return false;
      const diff = (today.getTime() - new Date(c.last_purchase_date).getTime()) / 86400000;
      return diff > 60;
    }) || [];
    const inactiveCurveA = inactive60.filter(c => c.curve === 'A');

    // Orçamentos
    const recentQuotes = quotes?.slice(0, 15).map(q =>
      `${q.client?.company || '—'} | ${fmt(q.total || 0)} | ${q.status} | ${new Date(q.createdAt).toLocaleDateString('pt-BR')}`
    ) || [];

    // Pedidos
    const recentOrders = orders?.slice(0, 15).map(o =>
      `${o.client_name} | ${o.product || '—'} | ${o.status} | ${fmt(o.price || 0)}`
    ) || [];

    // Produtos
    const productList = products?.slice(0, 30).map(p =>
      `${p.name} | ${p.factory || '—'} | ${p.category}`
    ) || [];

    // Oportunidades abertas detalhadas
    const oppDetail = openOpps.slice(0, 15).map(o =>
      `${o.title} | fase: ${o.stage} | ${fmt(o.value || 0)} | funil: ${o.funnel_type || '—'}`
    );

    // Atividades pendentes detalhadas
    const actDetail = pending.slice(0, 15).map(a =>
      `${a.title} | tipo: ${a.type} | vence: ${a.due_date} | cliente: ${a.client_name || '—'} | prioridade: ${a.priority || '—'}`
    );

    const tabContext: Record<string, string> = {
      dashboard: 'Dashboard principal com métricas e KPIs',
      comercial: 'Área comercial — orçamentos e clientes',
      activities: 'Gestão de atividades e follow-ups',
      funnels: 'Funil de vendas com pipeline Kanban',
      'service-orders': 'Ordens de serviço',
      operations: 'Operação — pedidos e logística',
      products: 'Catálogo de produtos',
      automations: 'Automações comerciais',
    };

    return `
Usuário logado: ${userEmail || '—'}
Aba atual: ${tabContext[activeTab] || activeTab}
Data: ${today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

=== MÉTRICAS GERAIS ===
- Total clientes: ${clients?.length || 0} (Curva A: ${curveA.length})
- Clientes inativos +60 dias: ${inactive60.length} (Curva A inativos: ${inactiveCurveA.length})
- Oportunidades abertas: ${openOpps.length} | Valor total: ${fmt(oppValue)}
- Atividades pendentes: ${pending.length} (${overdue.length} vencidas)

=== CLIENTES CURVA A INATIVOS +60 DIAS (PRIORITÁRIOS) ===
${inactiveCurveA.slice(0, 10).map(c =>
  `- ${c.company} | última compra: ${c.last_purchase_date || 'nunca'} | segmento: ${c.segment || '—'}`
).join('\n') || 'Nenhum'}

=== ATIVIDADES PENDENTES ===
${actDetail.join('\n') || 'Nenhuma'}

=== OPORTUNIDADES ABERTAS ===
${oppDetail.join('\n') || 'Nenhuma'}

=== ORÇAMENTOS RECENTES ===
${recentQuotes.join('\n') || 'Nenhum'}

=== PEDIDOS RECENTES ===
${recentOrders.join('\n') || 'Nenhum'}

=== CATÁLOGO DE PRODUTOS (amostra) ===
${productList.join('\n') || 'Nenhum'}
    `.trim();
  }, [activeTab, clients, activities, quotes, opportunities, orders, products, userEmail]);

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

    const userMsg: Msg = { role: "user", content: msg, timestamp: Date.now() };
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
        return [...prev, { role: "assistant", content: assistantSoFar, timestamp: Date.now() }];
      });
    };

    try {
      // 1. Extrair entidades via Claude (substitui regex)
      let analyticsData: any = null;
      let cliente: string | null = null;
      let produto: string | null = null;
      let ano: number | null = null;
      let query_type: string | null = null;
      let params: any = {};

      try {
        const historyContext = historySnapshot
          .slice(-6)
          .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
          .join("\n");

        const extractResp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BEARER}`,
          },
          body: JSON.stringify({
            extract_only: true,
            messages: [
              {
                role: "user",
                content: `Histórico recente:\n${historyContext}\n\nMensagem atual: "${msg}"\n\nExtraia em JSON puro (sem markdown, sem explicação): { "cliente": string|null, "produto": string|null, "ano": number|null, "intent": "client_top_product"|"client_history"|"client_showroom"|"product_in_showroom"|"brand_comparison"|"top_clients"|"products_no_sale"|"monthly_comparison"|"client_checklists"|"checklist_comparison"|"checklist_detail"|"read_document"|null }. O cliente pode vir de mensagens anteriores se não estiver na mensagem atual.\n\nRegras de intent:\n- "client_showroom": showroom/exposição/produtos expostos de um cliente NO SHOWROOM (ex.: "produtos da Bella Home no showroom", "o que a XYZ ainda não expôs no showroom").\n- "product_in_showroom": "exposto", "showroom", "quais lojas têm", "quais clientes têm o produto", "onde está exposto" + nome de PRODUTO (ex.: "quais lojas têm o sofá BELGA exposto", "onde o produto BARI está exposto", "quais clientes têm o BUFFET MILANO no showroom"). Extraia o nome do produto no campo "produto".\n- "client_checklists": "checklist", "visita comercial", "visita de loja", "produtos expostos na loja", "share de loja", "score da loja", "fluxo da loja", "humor do lojista" + cliente (ex.: "checklists da Loja XYZ", "qual o share da loja XYZ", "score da última visita ao cliente Y", "produtos expostos na loja Z").\n- "checklist_comparison": "comparar visitas", "comparar checklists", "evoluiu", "última vs anterior", "mudou o share", "como mudou desde a última visita" (ex.: "como evoluiu o cliente XYZ entre as últimas visitas", "o share mudou na última visita").\n- "checklist_detail": "resumir checklist", "o que tem no checklist", "detalhes da visita".\n- "read_document": "ler pedido", "analisar pdf", "resumir documento".\n- intent null para conversa geral sem pedido analítico.\n\nCliente e produto devem ser SEMPRE em MAIÚSCULAS.`,
              },
            ],
          }),
        });

        const extractText = await extractResp.text();
        console.log("[AICopilot] resposta extract_only raw:", extractText.slice(0, 300));
        const jsonMatch = extractText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const entities = JSON.parse(jsonMatch[0]);
          cliente = entities.cliente || null;
          produto = entities.produto || null;
          ano = entities.ano || null;
          query_type = entities.intent || null;
          console.log("[AICopilot] entidades extraídas pelo Claude:", entities);
        }
      } catch (e) {
        console.error("[AICopilot] Erro ao extrair entidades:", e);
      }

      // 2. Montar params conforme intent
      if (query_type === "client_top_product" || query_type === "client_history") {
        if (!cliente) {
          query_type = null; // sem cliente não há como consultar
        } else {
          params = { cliente, ano: ano || new Date().getFullYear() };
        }
      } else if (query_type === "client_showroom") {
        if (!cliente) {
          query_type = null;
        } else {
          params = { cliente };
        }
      } else if (query_type === "product_in_showroom") {
        if (!produto) {
          query_type = null;
        } else {
          params = { produto };
        }
      } else if (query_type === "brand_comparison") {
        params = { months: 6 };
      } else if (query_type === "top_clients") {
        params = { limit: 10 };
      } else if (query_type === "products_no_sale") {
        params = { days: 90 };
      } else if (query_type === "monthly_comparison") {
        params = { months: 6 };
      } else if (query_type === "client_checklists" || query_type === "checklist_comparison") {
        if (!cliente) {
          query_type = null;
        } else {
          params = { cliente, limit: 10 };
        }
      } else if (query_type === "checklist_detail") {
        // Sem activity_id explícito não dá pra consultar — degrada para listar
        if (cliente) {
          query_type = "client_checklists";
          params = { cliente, limit: 5 };
        } else {
          query_type = null;
        }
      } else if (query_type === "read_document") {
        // Tratado pela tool read_document no backend (Claude decide bucket/path).
        // Não chamar crm-analytics.
        query_type = null;
      }

      console.log("[AICopilot] query_type final:", query_type, "| params:", JSON.stringify(params));

      if (query_type) {
        try {
          const res = await fetch(ANALYTICS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${BEARER}`,
            },
            body: JSON.stringify({ query_type, params }),
          });
          console.log("[AICopilot] status crm-analytics:", res.status);
          const rawText = await res.text();
          console.log("[AICopilot] response raw:", rawText.slice(0, 500));
          analyticsData = res.ok ? JSON.parse(rawText) : null;
        } catch (e) {
          console.error("[AICopilot] Erro ao buscar analytics:", e);
        }
      }

      // 2. Enviar para Claude com analytics
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEARER}`,
        },
        body: JSON.stringify({
          messages: fullConversation,
          context: getContext(),
          analytics_data: analyticsData,
          user_email: user?.email,
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

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Seu navegador não suporta reconhecimento de voz');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
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
        <DialogContent className="sm:max-w-lg w-[calc(100%-1rem)] mx-2 h-[90vh] md:h-[80vh] max-h-[90vh] md:max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">AI Copilot LSA</DialogTitle>
          <DialogDescription className="sr-only">
            Assistente de inteligência artificial para análise comercial
          </DialogDescription>
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
              {sessions.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowHistory((v) => !v)}
                  title={showHistory ? "Voltar ao chat" : "Ver sessões salvas"}
                >
                  {showHistory ? (
                    <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
              )}
              {messages.length > 0 && !readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={archiveAndClear}
                  title="Salvar e iniciar novo chat"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {showHistory ? (
            /* Painel de sessões salvas */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Sessões salvas ({sessions.length})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={startNewChat}
                  >
                    <Sparkles className="h-3 w-3" />
                    Novo chat
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => setShowHistory(false)}
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    Nenhuma sessão salva.
                  </p>
                ) : (
                  sessions.map((s) => {
                    const dateLabel = new Date(s.date).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const firstUserMsg = s.messages.find((m) => m.role === "user");
                    const preview =
                      s.preview ||
                      (firstUserMsg
                        ? firstUserMsg.content.slice(0, 80) +
                          (firstUserMsg.content.length > 80 ? "…" : "")
                        : "(sem mensagens)");
                    return (
                      <button
                        key={s.id}
                        onClick={() => openSession(s)}
                        className="w-full text-left border border-border rounded-md p-2.5 bg-card hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {dateLabel}
                          </span>
                          <Badge variant="outline" className="text-[8px] h-4 px-1.5">
                            {s.messages.length} msgs
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground line-clamp-2">{preview}</p>
                      </button>
                    );
                  })
                )}
              </div>
              {sessions.length > 0 && (
                <div className="border-t px-3 py-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Apagar todo o histórico salvo? Esta ação não pode ser desfeita.")) {
                        clearAllHistory();
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Apagar histórico
                  </Button>
                </div>
              )}
            </div>
          ) : (
          <>
            {readOnly && (
              <div className="px-3 py-2 border-b bg-warning/15 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-warning-foreground">
                  📂 Histórico — somente leitura
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1"
                  onClick={startNewChat}
                >
                  <Sparkles className="h-3 w-3" />
                  Novo chat
                </Button>
              </div>
            )}
            {/* Mensagens */}
            <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={scrollRef as any}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto min-h-0 px-4"
            >
              <div className="py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-6 space-y-4">
                    <div>
                      <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground mb-3">Como posso ajudar?</p>
                    </div>

                    {/* Caixa clicável: análise proativa sob demanda */}
                    <button
                      onClick={triggerProactiveSuggestions}
                      disabled={isLoading}
                      className="mx-auto w-full max-w-sm flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2.5 text-left disabled:opacity-50"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          Gerar análise proativa
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                          Clientes curva A inativos, ações urgentes e sugestões de visita.
                        </p>
                      </div>
                    </button>

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
          {!readOnly && (
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
                <Button
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  className="h-9 w-9 shrink-0"
                  onClick={startListening}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
                <Button size="icon" className="h-9 w-9 shrink-0"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
