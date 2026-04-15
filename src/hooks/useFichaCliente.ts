import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClienteData {
  id: string;
  company: string;
  trade_name: string | null;
  document: string | null;
  segment: string | null;
  owner_email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  curve: string | null;
}

interface OrderRow {
  issue_date: string;
  product: string | null;
  supplier: string | null;
  quantity: number | null;
  price: number | null;
  order_type: string | null;
}

interface VisitaRow {
  data_visita: string;
  resultado: string | null;
  observacoes: string | null;
  proxima_visita_prevista: string | null;
  tipo: string | null;
  valor_pedido: number | null;
  mix_apresentado: string | null;
  oportunidade_mix: string | null;
}

interface ShowroomRow {
  produto_nome: string | null;
  produto_linha: string | null;
  data_entrada: string;
  data_saida: string | null;
  condicao: string | null;
}

interface SellOutRow {
  data_venda: string;
  produto_nome: string | null;
  quantidade: number;
  valor_venda: number | null;
  origem: string | null;
}

export interface FichaClienteData {
  cliente: ClienteData | null;
  segmentoAbc: string;
  representative: string;
  potencialEstimado: number;
  // KPIs
  sellIn12m: number;
  sellInMtd: number;
  walletSharePct: number;
  indiceMixPct: number;
  diasUltimaCompra: number;
  diasUltimaVisita: number | null;
  // History
  ordersByMonth: { mes: string; total: number }[];
  ordersDetail: OrderRow[];
  // Sell-out
  sellOutRows: SellOutRow[];
  // Showroom
  showroomAtual: ShowroomRow[];
  // Mix opportunities
  produtosNuncaComprados: { nome: string; categoria: string; linha: string }[];
  // Visitas
  visitas: VisitaRow[];
  loading: boolean;
}

export function useFichaCliente(clientId: string | null): FichaClienteData {
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [abcData, setAbcData] = useState<any[]>([]);
  const [mixData, setMixData] = useState<any[]>([]);
  const [saudeData, setSaudeData] = useState<any>(null);
  const [visitasData, setVisitasData] = useState<any[]>([]);
  const [showroomData, setShowroomData] = useState<any[]>([]);
  const [sellOutData, setSellOutData] = useState<any[]>([]);
  const [produtosData, setProdutosData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        // Get client info
        const clientRes = await supabase.from('clients').select('*').eq('id', clientId).single();
        const clientRow = clientRes.data;
        if (clientRow) {
          setCliente({
            id: clientRow.id,
            company: clientRow.company,
            trade_name: clientRow.trade_name,
            document: clientRow.document,
            segment: clientRow.segment,
            owner_email: clientRow.owner_email,
            phone: clientRow.phone,
            city: clientRow.city,
            state: clientRow.state,
            curve: clientRow.curve,
          });
        }

        const clientName = clientRow?.trade_name || clientRow?.company || '';

        // Parallel fetches
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];

        const [ordersRes, abcRes, mixRes, saudeRes, visitasRes, showroomRes, sellOutRes, produtosRes] = await Promise.all([
          // Orders for this client (last 12 months)
          supabase.from('orders')
            .select('issue_date, product, supplier, quantity, price, order_type')
            .eq('client_id', clientId)
            .gte('issue_date', twelveMonthsAgo)
            .order('issue_date', { ascending: false }),
          // ABC
          supabase.from('vw_segmentacao_abc' as any).select('*'),
          // Mix
          supabase.from('vw_mix_cliente' as any).select('*'),
          // Saude
          supabase.from('vw_saude_carteira' as any).select('*'),
          // Visitas (legacy)
          supabase.from('visitas' as any).select('*').eq('cliente_id', clientId).order('data_visita', { ascending: false }).limit(20),
          // Showroom (legacy, active only)
          supabase.from('showroom' as any).select('id, data_entrada, data_saida, condicao, produto_id').eq('cliente_id', clientId).is('data_saida', null),
          // Sell-out (legacy)
          supabase.from('sell_out' as any).select('*').eq('cliente_id', clientId).order('data_venda', { ascending: false }).limit(50),
          // All products for mix opportunity
          supabase.from('produtos' as any).select('nome, categoria, linha').eq('ativo', true),
        ]);

        setOrdersData(ordersRes.data ?? []);
        setAbcData(abcRes.data ?? []);
        setMixData(mixRes.data ?? []);
        // Find matching saude row by client name
        const saudeMatch = (saudeRes.data ?? []).find((r: any) =>
          r.client_name?.toUpperCase().trim() === clientName.toUpperCase().trim()
        );
        setSaudeData(saudeMatch ?? null);
        setVisitasData(visitasRes.data ?? []);
        setShowroomData(showroomRes.data ?? []);
        setSellOutData(sellOutRes.data ?? []);
        setProdutosData(produtosRes.data ?? []);
      } catch (err) {
        console.error('Erro ao carregar ficha do cliente:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [clientId]);

  return useMemo(() => {
    const clientName = cliente?.trade_name || cliente?.company || '';
    const upperName = clientName.toUpperCase().trim();

    // ABC
    const abcRow = abcData.find((r: any) => r.client_name?.toUpperCase().trim() === upperName);
    const segmentoAbc = abcRow?.segmento || cliente?.curve || 'C';

    // Mix
    const mixRow = mixData.find((r: any) => r.client_name?.toUpperCase().trim() === upperName);
    const indiceMixPct = Number(mixRow?.indice_mix_pct) || 0;

    // Representative
    const representative = saudeData?.representative || cliente?.owner_email || '—';

    // Potencial (from clientes legacy or estimate)
    const potencialEstimado = 0;

    // KPIs from orders
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let sellIn12m = 0;
    let sellInMtd = 0;
    for (const o of ordersData) {
      const rev = Number(o.price) || 0;
      sellIn12m += rev;
      if (o.issue_date?.startsWith(currentMonth)) sellInMtd += rev;
    }

    const diasUltimaCompra = saudeData?.dias_sem_compra ?? 0;

    // Dias última visita (from activities or visitas)
    let diasUltimaVisita: number | null = null;
    if (visitasData.length > 0) {
      const lastVisit = new Date(visitasData[0].data_visita);
      diasUltimaVisita = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Orders by month
    const monthMap = new Map<string, number>();
    for (const o of ordersData) {
      const m = o.issue_date?.substring(0, 7);
      if (m) monthMap.set(m, (monthMap.get(m) || 0) + (Number(o.price) || 0));
    }
    const ordersByMonth = Array.from(monthMap.entries())
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Orders detail
    const ordersDetail: OrderRow[] = ordersData.map((o: any) => ({
      issue_date: o.issue_date,
      product: o.product,
      supplier: o.supplier,
      quantity: o.quantity,
      price: Number(o.price) || 0,
      order_type: o.order_type,
    }));

    // Sell-out
    const sellOutRows: SellOutRow[] = sellOutData.map((r: any) => ({
      data_venda: r.data_venda,
      produto_nome: null,
      quantidade: r.quantidade,
      valor_venda: Number(r.valor_venda) || 0,
      origem: r.origem,
    }));

    // Showroom
    const showroomAtual: ShowroomRow[] = showroomData.map((r: any) => ({
      produto_nome: null,
      produto_linha: null,
      data_entrada: r.data_entrada,
      data_saida: r.data_saida,
      condicao: r.condicao,
    }));

    // Mix opportunities: products never purchased
    const purchasedProducts = new Set(ordersData.map((o: any) => (o.product || '').toUpperCase().trim()));
    const produtosNuncaComprados = produtosData
      .filter((p: any) => !purchasedProducts.has((p.nome || '').toUpperCase().trim()))
      .map((p: any) => ({
        nome: p.nome,
        categoria: p.categoria || '—',
        linha: p.linha || '—',
      }))
      .slice(0, 50);

    // Visitas
    const visitas: VisitaRow[] = visitasData.map((v: any) => ({
      data_visita: v.data_visita,
      resultado: v.resultado,
      observacoes: v.observacoes,
      proxima_visita_prevista: v.proxima_visita_prevista,
      tipo: v.tipo,
      valor_pedido: v.valor_pedido ? Number(v.valor_pedido) : null,
      mix_apresentado: v.mix_apresentado,
      oportunidade_mix: v.oportunidade_mix,
    }));

    return {
      cliente,
      segmentoAbc,
      representative,
      potencialEstimado,
      sellIn12m,
      sellInMtd,
      walletSharePct: 0,
      indiceMixPct,
      diasUltimaCompra,
      diasUltimaVisita,
      ordersByMonth,
      ordersDetail,
      sellOutRows,
      showroomAtual,
      produtosNuncaComprados,
      visitas,
      loading,
    };
  }, [cliente, ordersData, abcData, mixData, saudeData, visitasData, showroomData, sellOutData, produtosData, loading]);
}
