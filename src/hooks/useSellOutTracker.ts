import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SellOutRecord {
  id: string;
  cliente_id: string | null;
  produto_id: string | null;
  data_venda: string;
  quantidade: number;
  valor_venda: number;
  origem: string | null;
}

interface ShowroomRecord {
  id: string;
  cliente_id: string | null;
  produto_id: string | null;
  data_entrada: string;
  data_saida: string | null;
  motivo_saida: string | null;
  condicao: string | null;
}

interface ClienteRecord {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  segmento: string | null;
}

interface ProdutoRecord {
  id: string;
  nome: string;
  linha: string | null;
  categoria: string | null;
}

interface SellInRecord {
  id: string;
  cliente_id: string | null;
  produto_id: string | null;
  data_pedido: string;
  quantidade: number;
  valor_total: number | null;
}

export interface SellOutFilters {
  clienteId: string;
  produtoId: string;
  linha: string;
  periodo: number; // months
}

export function useSellOutTracker(filters: SellOutFilters) {
  const [sellOut, setSellOut] = useState<SellOutRecord[]>([]);
  const [showroom, setShowroom] = useState<ShowroomRecord[]>([]);
  const [sellIn, setSellIn] = useState<SellInRecord[]>([]);
  const [clientes, setClientes] = useState<ClienteRecord[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - filters.periodo);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const [soRes, shRes, siRes, cliRes, prodRes] = await Promise.all([
        supabase.from('sell_out' as any).select('*').gte('data_venda', cutoffStr),
        supabase.from('showroom' as any).select('*'),
        supabase.from('sell_in').select('id,cliente_id,produto_id,data_pedido,quantidade,valor_total').gte('data_pedido', cutoffStr),
        supabase.from('clientes').select('id,razao_social,nome_fantasia,segmento'),
        supabase.from('produtos').select('id,nome,linha,categoria'),
      ]);

      setSellOut((soRes.data || []) as any[]);
      setShowroom((shRes.data || []) as any[]);
      setSellIn((siRes.data || []) as any[]);
      setClientes((cliRes.data || []) as any[]);
      setProdutos((prodRes.data || []) as any[]);
      setLoading(false);
    };
    load();
  }, [filters.periodo]);

  const produtoMap = useMemo(() => {
    const m = new Map<string, ProdutoRecord>();
    produtos.forEach(p => m.set(p.id, p));
    return m;
  }, [produtos]);

  const clienteMap = useMemo(() => {
    const m = new Map<string, ClienteRecord>();
    clientes.forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  // Apply filters
  const filteredSellOut = useMemo(() => {
    let data = sellOut;
    if (filters.clienteId) data = data.filter(r => r.cliente_id === filters.clienteId);
    if (filters.produtoId) data = data.filter(r => r.produto_id === filters.produtoId);
    if (filters.linha) {
      const prodIds = new Set(produtos.filter(p => p.linha === filters.linha).map(p => p.id));
      data = data.filter(r => r.produto_id && prodIds.has(r.produto_id));
    }
    return data;
  }, [sellOut, filters, produtos]);

  const filteredSellIn = useMemo(() => {
    let data = sellIn;
    if (filters.clienteId) data = data.filter(r => r.cliente_id === filters.clienteId);
    if (filters.produtoId) data = data.filter(r => r.produto_id === filters.produtoId);
    if (filters.linha) {
      const prodIds = new Set(produtos.filter(p => p.linha === filters.linha).map(p => p.id));
      data = data.filter(r => r.produto_id && prodIds.has(r.produto_id));
    }
    return data;
  }, [sellIn, filters, produtos]);

  // KPIs
  const totalSellOut = useMemo(() => filteredSellOut.reduce((s, r) => s + (r.valor_venda || 0), 0), [filteredSellOut]);
  const totalSellIn = useMemo(() => filteredSellIn.reduce((s, r) => s + (r.valor_total || 0), 0), [filteredSellIn]);
  const taxaGiro = totalSellIn > 0 ? (totalSellOut / totalSellIn) * 100 : 0;

  const topProdutoGiro = useMemo(() => {
    const map = new Map<string, { so: number; si: number }>();
    filteredSellOut.forEach(r => {
      if (!r.produto_id) return;
      const e = map.get(r.produto_id) || { so: 0, si: 0 };
      e.so += r.valor_venda || 0;
      map.set(r.produto_id, e);
    });
    filteredSellIn.forEach(r => {
      if (!r.produto_id) return;
      const e = map.get(r.produto_id) || { so: 0, si: 0 };
      e.si += r.valor_total || 0;
      map.set(r.produto_id, e);
    });
    let best = '';
    let bestRatio = 0;
    map.forEach((v, k) => {
      const ratio = v.si > 0 ? v.so / v.si : 0;
      if (ratio > bestRatio) { bestRatio = ratio; best = k; }
    });
    return produtoMap.get(best)?.nome || '-';
  }, [filteredSellOut, filteredSellIn, produtoMap]);

  const topClienteSellOut = useMemo(() => {
    const map = new Map<string, number>();
    filteredSellOut.forEach(r => {
      if (!r.cliente_id) return;
      map.set(r.cliente_id, (map.get(r.cliente_id) || 0) + (r.valor_venda || 0));
    });
    let best = '';
    let bestVal = 0;
    map.forEach((v, k) => { if (v > bestVal) { bestVal = v; best = k; } });
    const c = clienteMap.get(best);
    return c ? (c.nome_fantasia || c.razao_social) : '-';
  }, [filteredSellOut, clienteMap]);

  // Giro por produto
  const giroPorProduto = useMemo(() => {
    const soByProd = new Map<string, { total: number; datas: string[] }>();
    filteredSellOut.forEach(r => {
      if (!r.produto_id) return;
      const e = soByProd.get(r.produto_id) || { total: 0, datas: [] };
      e.total += r.valor_venda || 0;
      e.datas.push(r.data_venda);
      soByProd.set(r.produto_id, e);
    });

    const showroomByProd = new Map<string, Set<string>>();
    showroom.filter(s => !s.data_saida).forEach(s => {
      if (!s.produto_id) return;
      const set = showroomByProd.get(s.produto_id) || new Set();
      if (s.cliente_id) set.add(s.cliente_id);
      showroomByProd.set(s.produto_id, set);
    });

    return produtos.map(p => {
      const so = soByProd.get(p.id);
      const exposicao = showroomByProd.get(p.id)?.size || 0;
      const totalSo = so?.total || 0;
      const datas = so?.datas || [];
      let diasMedio = 0;
      if (datas.length > 1) {
        const sorted = datas.map(d => new Date(d).getTime()).sort();
        const range = sorted[sorted.length - 1] - sorted[0];
        diasMedio = Math.round(range / (1000 * 60 * 60 * 24) / datas.length);
      }
      const status = totalSo > 0 ? (diasMedio <= 30 ? 'alto' : diasMedio <= 60 ? 'medio' : 'baixo') : 'sem_venda';
      return { id: p.id, nome: p.nome, linha: p.linha, exposicao, totalSo, diasMedio, status };
    }).filter(p => p.exposicao > 0 || p.totalSo > 0).sort((a, b) => b.totalSo - a.totalSo);
  }, [filteredSellOut, showroom, produtos]);

  // Showroom em risco
  const showroomRisco = useMemo(() => {
    const now = Date.now();
    const soProds = new Set(sellOut.map(r => `${r.produto_id}|${r.cliente_id}`));

    return showroom
      .filter(s => !s.data_saida)
      .map(s => {
        const dias = Math.round((now - new Date(s.data_entrada).getTime()) / (1000 * 60 * 60 * 24));
        const temSellOut = soProds.has(`${s.produto_id}|${s.cliente_id}`);
        const nivel = dias >= 120 ? 'critico' : dias >= 90 ? 'alerta' : 'ok';
        const prod = s.produto_id ? produtoMap.get(s.produto_id) : null;
        const cli = s.cliente_id ? clienteMap.get(s.cliente_id) : null;
        const acao = nivel === 'critico' ? 'Substituição urgente' : nivel === 'alerta' ? 'Ação promocional / treinamento' : '';
        return {
          id: s.id,
          produto: prod?.nome || '-',
          cliente: cli ? (cli.nome_fantasia || cli.razao_social) : '-',
          dataEntrada: s.data_entrada,
          dias,
          temSellOut,
          nivel,
          acao,
          condicao: s.condicao,
        };
      })
      .filter(s => s.nivel !== 'ok' && !s.temSellOut)
      .sort((a, b) => b.dias - a.dias);
  }, [showroom, sellOut, produtoMap, clienteMap]);

  // Ranking clientes
  const rankingClientes = useMemo(() => {
    const soMap = new Map<string, number>();
    const siMap = new Map<string, number>();
    filteredSellOut.forEach(r => {
      if (!r.cliente_id) return;
      soMap.set(r.cliente_id, (soMap.get(r.cliente_id) || 0) + (r.valor_venda || 0));
    });
    filteredSellIn.forEach(r => {
      if (!r.cliente_id) return;
      siMap.set(r.cliente_id, (siMap.get(r.cliente_id) || 0) + (r.valor_total || 0));
    });

    const allIds = new Set([...soMap.keys(), ...siMap.keys()]);
    return Array.from(allIds).map(id => {
      const cli = clienteMap.get(id);
      const so = soMap.get(id) || 0;
      const si = siMap.get(id) || 0;
      const giro = si > 0 ? (so / si) * 100 : 0;
      return {
        id,
        nome: cli ? (cli.nome_fantasia || cli.razao_social) : id,
        sellOut12m: so,
        sellIn12m: si,
        taxaGiro: giro,
      };
    }).sort((a, b) => b.sellOut12m - a.sellOut12m);
  }, [filteredSellOut, filteredSellIn, clienteMap]);

  // Linhas distintas
  const linhas = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach(p => { if (p.linha) set.add(p.linha); });
    return Array.from(set).sort();
  }, [produtos]);

  return {
    loading,
    clientes,
    produtos,
    linhas,
    totalSellOut,
    totalSellIn,
    taxaGiro,
    topProdutoGiro,
    topClienteSellOut,
    giroPorProduto,
    showroomRisco,
    rankingClientes,
  };
}
