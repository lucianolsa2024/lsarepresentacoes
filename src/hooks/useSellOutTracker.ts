import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GiroPdvRow {
  client_name: string;
  representative: string;
  product: string;
  supplier: string;
  sellout: number;
  pecas_vendidas: number;
  sellin: number;
  pecas_expostas: number;
  giro_pct: number;
  classificacao_giro: string;
}

interface RankingProdutoRow {
  product: string;
  supplier: string;
  sellout_total: number;
  pecas_vendidas: number;
  pedidos_encomenda: number;
  clientes_compradores: number;
  sellin_total: number;
  clientes_expondo: number;
  taxa_conversao_pct: number;
}

interface SaudeRow {
  client_name: string;
  representative: string;
  sellout_total: number;
  sellout_90d: number;
  taxa_giro: number;
  status_sellout: string;
}

export interface SellOutFilters {
  supplier: string;
  representative: string;
}

export function useSellOutTracker(filters: SellOutFilters) {
  const [giroPdv, setGiroPdv] = useState<GiroPdvRow[]>([]);
  const [rankingProdutos, setRankingProdutos] = useState<RankingProdutoRow[]>([]);
  const [saudeCarteira, setSaudeCarteira] = useState<SaudeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [giroRes, rankRes, saudeRes] = await Promise.all([
        supabase.from('vw_giro_pdv' as any).select('*'),
        supabase.from('vw_ranking_produtos' as any).select('*'),
        supabase.from('vw_saude_carteira' as any).select('client_name, representative, sellout_total, sellout_90d, taxa_giro, status_sellout'),
      ]);
      setGiroPdv((giroRes.data || []) as any[]);
      setRankingProdutos((rankRes.data || []) as any[]);
      setSaudeCarteira((saudeRes.data || []) as any[]);
      setLoading(false);
    };
    load();
  }, []);

  // Filter giro data
  const filteredGiro = useMemo(() => {
    let data = giroPdv;
    if (filters.supplier) data = data.filter(r => r.supplier === filters.supplier);
    if (filters.representative) data = data.filter(r => r.representative === filters.representative);
    return data;
  }, [giroPdv, filters]);

  // Suppliers & reps for filter dropdowns
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    giroPdv.forEach(r => { if (r.supplier) set.add(r.supplier); });
    return Array.from(set).sort();
  }, [giroPdv]);

  const representatives = useMemo(() => {
    const set = new Set<string>();
    giroPdv.forEach(r => { if (r.representative) set.add(r.representative); });
    return Array.from(set).sort();
  }, [giroPdv]);

  // KPIs
  const totalSellOut = useMemo(() => filteredGiro.reduce((s, r) => s + (Number(r.sellout) || 0), 0), [filteredGiro]);

  const taxaGiroMedia = useMemo(() => {
    const withSellin = filteredGiro.filter(r => Number(r.sellin) > 0);
    if (withSellin.length === 0) return 0;
    return withSellin.reduce((s, r) => s + (Number(r.giro_pct) || 0), 0) / withSellin.length;
  }, [filteredGiro]);

  const topProdutoGiro = useMemo(() => {
    if (filteredGiro.length === 0) return '-';
    const best = filteredGiro.reduce((a, b) => (Number(a.giro_pct) || 0) > (Number(b.giro_pct) || 0) ? a : b);
    return best.product || '-';
  }, [filteredGiro]);

  const topClienteSellOut = useMemo(() => {
    if (saudeCarteira.length === 0) return '-';
    const best = saudeCarteira.reduce((a, b) => (Number(a.sellout_total) || 0) > (Number(b.sellout_total) || 0) ? a : b);
    return best.client_name || '-';
  }, [saudeCarteira]);

  // Showroom sem giro
  const showroomSemGiro = useMemo(() => {
    return filteredGiro
      .filter(r => r.classificacao_giro === 'showroom_sem_giro')
      .sort((a, b) => (Number(b.sellin) || 0) - (Number(a.sellin) || 0));
  }, [filteredGiro]);

  // Ranking clientes (from vw_saude_carteira)
  const rankingClientes = useMemo(() => {
    let data = [...saudeCarteira];
    if (filters.representative) data = data.filter(r => r.representative === filters.representative);
    return data.sort((a, b) => (Number(b.sellout_total) || 0) - (Number(a.sellout_total) || 0));
  }, [saudeCarteira, filters.representative]);

  return {
    loading,
    suppliers,
    representatives,
    totalSellOut,
    taxaGiroMedia,
    topProdutoGiro,
    topClienteSellOut,
    rankingProdutos,
    showroomSemGiro,
    rankingClientes,
  };
}
