import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarteiraClient {
  client_name: string;
  representative: string;
  ultimo_sellout: string | null;
  dias_sem_sellout: number;
  sellout_90d: number;
  taxa_giro: number;
  mix_produtos: number;
  status_sellout: string;
  segmento: string;
  // Visit data
  ultima_visita: string | null;
  dias_sem_visita: number | null;
  status_visita: string;
  client_id: string | null;
}

export interface ClienteRisco {
  client_name: string;
  representative: string;
  dias_sem_sellout: number;
  sellout_historico: number;
  nivel_risco: string;
}

interface UseMapaCarteiraResult {
  clients: CarteiraClient[];
  clientesRisco: ClienteRisco[];
  representatives: string[];
  loading: boolean;
  refetch: () => void;
}

export function useMapaCarteira(): UseMapaCarteiraResult {
  const [rawSaude, setRawSaude] = useState<any[]>([]);
  const [rawAbc, setRawAbc] = useState<any[]>([]);
  const [rawRisco, setRawRisco] = useState<any[]>([]);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [rawClientIds, setRawClientIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [saudeRes, abcRes, riscoRes, visitsRes, clientsRes] = await Promise.all([
        supabase.from('vw_saude_carteira' as any).select('*'),
        supabase.from('vw_segmentacao_abc' as any).select('*'),
        supabase.from('vw_clientes_risco' as any).select('*'),
        supabase
          .from('activities')
          .select('client_id, client_name, due_date, completed_at, status')
          .in('type', ['visita', 'checklist_loja'])
          .order('due_date', { ascending: false }),
        supabase.from('clients').select('id, company, trade_name'),
      ]);

      setRawSaude(saudeRes.data ?? []);
      setRawAbc(abcRes.data ?? []);
      setRawRisco(riscoRes.data ?? []);
      setRawVisits(visitsRes.data ?? []);
      setRawClientIds(clientsRes.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar mapa de carteira:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const { clients, clientesRisco, representatives } = useMemo(() => {
    // ABC segment map
    const abcMap = new Map<string, string>();
    for (const r of rawAbc) abcMap.set(r.client_name, r.segmento);

    // Client name -> id map
    const nameToId = new Map<string, string>();
    for (const c of rawClientIds) {
      const name = (c.trade_name || c.company || '').toUpperCase().trim();
      nameToId.set(name, c.id);
      if (c.company) nameToId.set(c.company.toUpperCase().trim(), c.id);
    }

    // Latest visit per client
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
      if (r.representative) reps.add(r.representative);

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
        representative: r.representative || '',
        ultimo_sellout: r.ultimo_sellout,
        dias_sem_sellout: r.dias_sem_sellout ?? 0,
        sellout_90d: Number(r.sellout_90d) || 0,
        taxa_giro: Number(r.taxa_giro) || 0,
        mix_produtos: Number(r.mix_produtos) || 0,
        status_sellout: r.status_sellout || 'vermelho',
        segmento: abcMap.get(r.client_name) || 'C',
        ultima_visita: visit?.date || null,
        dias_sem_visita: diasSemVisita,
        status_visita: statusVisita,
        client_id: nameToId.get(clientName) || null,
      };
    });

    // Sort: A first, then by sellout_90d desc
    const segOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
    mapped.sort((a, b) => {
      const sa = segOrder[a.segmento] ?? 2;
      const sb = segOrder[b.segmento] ?? 2;
      if (sa !== sb) return sa - sb;
      return b.sellout_90d - a.sellout_90d;
    });

    const riscoMapped: ClienteRisco[] = (rawRisco as any[]).map((r) => ({
      client_name: r.client_name,
      representative: r.representative || '',
      dias_sem_sellout: r.dias_sem_sellout ?? 0,
      sellout_historico: Number(r.sellout_historico) || 0,
      nivel_risco: r.nivel_risco || 'alerta',
    }));

    // Sort critico first
    riscoMapped.sort((a, b) => {
      if (a.nivel_risco === 'critico' && b.nivel_risco !== 'critico') return -1;
      if (b.nivel_risco === 'critico' && a.nivel_risco !== 'critico') return 1;
      return b.dias_sem_sellout - a.dias_sem_sellout;
    });

    return {
      clients: mapped,
      clientesRisco: riscoMapped,
      representatives: Array.from(reps).sort(),
    };
  }, [rawSaude, rawAbc, rawRisco, rawVisits, rawClientIds]);

  return { clients, clientesRisco, representatives, loading, refetch: fetchData };
}
