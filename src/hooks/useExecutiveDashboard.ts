import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaudeCarteira {
  client_name: string;
  representative: string;
  ultima_compra: string;
  dias_sem_compra: number;
  compra_30d: number;
  compra_90d: number;
  volume_total: number;
  mix_produtos: number;
  total_pedidos: number;
  status_compra: string;
}

export interface ClienteRisco {
  client_name: string;
  representative: string;
  ultima_compra: string;
  dias_sem_compra: number;
  volume_historico: number;
  mix_historico: number;
  nivel_risco: string;
}

export interface SegmentacaoAbc {
  client_name: string;
  representative: string;
  volume_total: number;
  pct_do_total: number;
  pct_acumulada: number;
  segmento: string;
}

export interface SellInMensal {
  mes: string;
  supplier: string;
  total: number;
  pedidos: number;
  clientes: number;
}

export interface YoyMensal {
  mes_num: number;
  mes_nome: string;
  ano: number;
  total: number;
}

export interface PositivacaoMensal {
  mes: string;
  clientes_positivados: number;
  positivados_sohome: number;
  positivados_casabrazil: number;
}

interface ExecutiveDashboardData {
  saudeCarteira: SaudeCarteira[];
  clientesRisco: ClienteRisco[];
  segmentacaoAbc: SegmentacaoAbc[];
  sellInMensal: SellInMensal[];
  yoyMensal: YoyMensal[];
  positivacaoMensal: PositivacaoMensal[];
  loading: boolean;
}

export function useExecutiveDashboard(): ExecutiveDashboardData {
  const [saudeCarteira, setSaudeCarteira] = useState<SaudeCarteira[]>([]);
  const [clientesRisco, setClientesRisco] = useState<ClienteRisco[]>([]);
  const [segmentacaoAbc, setSegmentacaoAbc] = useState<SegmentacaoAbc[]>([]);
  const [sellInMensal, setSellInMensal] = useState<SellInMensal[]>([]);
  const [yoyMensal, setYoyMensal] = useState<YoyMensal[]>([]);
  const [positivacaoMensal, setPositivacaoMensal] = useState<PositivacaoMensal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [saudeRes, riscoRes, abcRes, sellInRes, yoyRes, posRes] = await Promise.all([
          supabase.from('vw_saude_carteira' as any).select('*'),
          supabase.from('vw_clientes_risco' as any).select('*').order('volume_historico', { ascending: false }),
          supabase.from('vw_segmentacao_abc' as any).select('*'),
          supabase.from('vw_sell_in_mensal' as any).select('*').order('mes', { ascending: true }),
          supabase.from('vw_yoy_mensal' as any).select('*').order('ano', { ascending: true }).order('mes_num', { ascending: true }),
          supabase.from('vw_positivacao_mensal' as any).select('*').order('mes', { ascending: true }),
        ]);

        setSaudeCarteira((saudeRes.data as any[] ?? []) as SaudeCarteira[]);
        setClientesRisco((riscoRes.data as any[] ?? []) as ClienteRisco[]);
        setSegmentacaoAbc((abcRes.data as any[] ?? []) as SegmentacaoAbc[]);
        setSellInMensal((sellInRes.data as any[] ?? []) as SellInMensal[]);
        setYoyMensal((yoyRes.data as any[] ?? []) as YoyMensal[]);
        setPositivacaoMensal((posRes.data as any[] ?? []) as PositivacaoMensal[]);
      } catch (err) {
        console.error('Erro ao carregar dashboard executivo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return { saudeCarteira, clientesRisco, segmentacaoAbc, sellInMensal, yoyMensal, positivacaoMensal, loading };
}
