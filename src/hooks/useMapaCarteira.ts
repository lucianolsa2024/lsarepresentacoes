import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarteiraClient {
  client_name: string;
  representative: string;
  ultima_compra: string | null;
  dias_sem_compra: number;
  compra_30d: number;
  compra_90d: number;
  volume_total: number;
  mix_produtos: number;
  total_pedidos: number;
  status_compra: string;
  // Joined data
  segmento: string;
  indice_mix_pct: number;
  wallet_share_pct: number;
  // Visit data (from activities)
  ultima_visita: string | null;
  dias_sem_visita: number | null;
  status_visita: string;
  client_id: string | null;
}

interface UseMapaCarteiraResult {
  clients: CarteiraClient[];
  representatives: string[];
  loading: boolean;
  refetch: () => void;
}

export function useMapaCarteira(): UseMapaCarteiraResult {
  const [rawSaude, setRawSaude] = useState<any[]>([]);
  const [rawAbc, setRawAbc] = useState<any[]>([]);
  const [rawMix, setRawMix] = useState<any[]>([]);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [rawClientIds, setRawClientIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [saudeRes, abcRes, mixRes, visitsRes, clientsRes] = await Promise.all([
        supabase.from('vw_saude_carteira' as any).select('*'),
        supabase.from('vw_segmentacao_abc' as any).select('*'),
        supabase.from('vw_mix_cliente' as any).select('*'),
        // Get latest visit activity per client
        supabase
          .from('activities')
          .select('client_id, client_name, due_date, completed_at, status')
          .in('type', ['visita', 'checklist_loja'])
          .order('due_date', { ascending: false }),
        // Get client IDs mapped to names
        supabase.from('clients').select('id, company, trade_name'),
      ]);

      setRawSaude(saudeRes.data ?? []);
      setRawAbc(abcRes.data ?? []);
      setRawMix(mixRes.data ?? []);
      setRawVisits(visitsRes.data ?? []);
      setRawClientIds(clientsRes.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar mapa de carteira:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const { clients, representatives } = useMemo(() => {
    // Build lookup maps
    const abcMap = new Map<string, string>();
    for (const r of rawAbc) abcMap.set(r.client_name, r.segmento);

    const mixMap = new Map<string, number>();
    for (const r of rawMix) mixMap.set(r.client_name, Number(r.indice_mix_pct) || 0);

    // Build client name -> id map
    const nameToId = new Map<string, string>();
    for (const c of rawClientIds) {
      const name = (c.trade_name || c.company || '').toUpperCase().trim();
      nameToId.set(name, c.id);
      // Also map company name
      if (c.company) nameToId.set(c.company.toUpperCase().trim(), c.id);
    }

    // Build latest visit per client name
    const visitMap = new Map<string, { date: string; status: string }>();
    for (const v of rawVisits) {
      const name = (v.client_name || '').toUpperCase().trim();
      if (!name) continue;
      const date = v.completed_at?.split('T')[0] || v.due_date;
      if (!visitMap.has(name) || date > visitMap.get(name)!.date) {
        visitMap.set(name, { date, status: v.status });
      }
    }

    const now = new Date();
    const reps = new Set<string>();

    const mapped: CarteiraClient[] = rawSaude.map((r) => {
      const clientName = (r.client_name || '').toUpperCase().trim();
      reps.add(r.representative);

      const visit = visitMap.get(clientName);
      let diasSemVisita: number | null = null;
      let statusVisita = 'sem_dados';
      if (visit) {
        const vDate = new Date(visit.date);
        diasSemVisita = Math.floor((now.getTime() - vDate.getTime()) / (1000 * 60 * 60 * 24));
        statusVisita = diasSemVisita > 60 ? 'atrasada' : 'ok';
      }

      return {
        client_name: r.client_name,
        representative: r.representative,
        ultima_compra: r.ultima_compra,
        dias_sem_compra: r.dias_sem_compra,
        compra_30d: Number(r.compra_30d) || 0,
        compra_90d: Number(r.compra_90d) || 0,
        volume_total: Number(r.volume_total) || 0,
        mix_produtos: r.mix_produtos,
        total_pedidos: r.total_pedidos,
        status_compra: r.status_compra,
        segmento: abcMap.get(r.client_name) || 'C',
        indice_mix_pct: mixMap.get(r.client_name) || 0,
        wallet_share_pct: 0, // vw_wallet_share empty, fallback
        ultima_visita: visit?.date || null,
        dias_sem_visita: diasSemVisita,
        status_visita: statusVisita,
        client_id: nameToId.get(clientName) || null,
      };
    });

    return {
      clients: mapped.sort((a, b) => b.volume_total - a.volume_total),
      representatives: Array.from(reps).sort(),
    };
  }, [rawSaude, rawAbc, rawMix, rawVisits, rawClientIds]);

  return { clients, representatives, loading, refetch: fetchData };
}
