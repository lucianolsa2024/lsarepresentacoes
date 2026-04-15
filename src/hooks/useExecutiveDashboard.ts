import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaudeCarteira {
  client_name: string;
  representative: string;
  ultimo_sellout: string;
  dias_sem_sellout: number;
  sellout_90d: number;
  taxa_giro: number;
  mix_produtos: number;
  status_sellout: string;
}

export interface ClienteRisco {
  client_name: string;
  representative: string;
  dias_sem_sellout: number;
  sellout_historico: number;
  nivel_risco: string;
}

export interface SegmentacaoAbc {
  client_name: string;
  representative: string;
  sellout_total: number;
  sellin_total: number;
  volume_total: number;
  pct_do_sellout: number;
  pct_acumulada: number;
  segmento: string;
}

export interface SellOutMensal {
  mes: string;
  supplier: string;
  sell_out_total: number;
  pedidos: number;
  clientes: number;
}

export interface SellOutMtd {
  representative: string;
  clientes_ativos: number;
  qtd_pedidos: number;
  sell_out_mtd: number;
  pecas_mtd: number;
}

export interface SellInMtd {
  representative: string;
  clientes_ativos: number;
  qtd_pedidos: number;
  sell_in_mtd: number;
  pecas_mtd: number;
}

export interface YoyMensal {
  mes_num: number;
  mes_nome: string;
  ano: number;
  sellout_total: number;
  sellin_total: number;
  volume_total: number;
}

export interface PositivacaoMensal {
  mes: string;
  clientes_com_sellout: number;
  clientes_sohome: number;
  clientes_casabrazil: number;
}

interface ExecutiveDashboardData {
  saudeCarteira: SaudeCarteira[];
  clientesRisco: ClienteRisco[];
  segmentacaoAbc: SegmentacaoAbc[];
  sellOutMensal: SellOutMensal[];
  sellOutMtd: SellOutMtd[];
  sellInMtd: SellInMtd[];
  yoyMensal: YoyMensal[];
  positivacaoMensal: PositivacaoMensal[];
  loading: boolean;
}

export function useExecutiveDashboard(): ExecutiveDashboardData {
  const [saudeCarteira, setSaudeCarteira] = useState<SaudeCarteira[]>([]);
  const [clientesRisco, setClientesRisco] = useState<ClienteRisco[]>([]);
  const [segmentacaoAbc, setSegmentacaoAbc] = useState<SegmentacaoAbc[]>([]);
  const [sellOutMensal, setSellOutMensal] = useState<SellOutMensal[]>([]);
  const [sellOutMtd, setSellOutMtd] = useState<SellOutMtd[]>([]);
  const [sellInMtd, setSellInMtd] = useState<SellInMtd[]>([]);
  const [yoyMensal, setYoyMensal] = useState<YoyMensal[]>([]);
  const [positivacaoMensal, setPositivacaoMensal] = useState<PositivacaoMensal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [saudeRes, riscoRes, abcRes, sellOutMensalRes, sellOutMtdRes, sellInMtdRes, yoyRes, posRes] = await Promise.all([
          supabase.from('vw_saude_carteira' as any).select('*'),
          supabase.from('vw_clientes_risco' as any).select('*').order('sellout_historico', { ascending: false }),
          supabase.from('vw_segmentacao_abc' as any).select('*'),
          supabase.from('vw_sell_out_mensal' as any).select('*').order('mes', { ascending: true }),
          supabase.from('vw_sell_out_mtd' as any).select('*'),
          supabase.from('vw_sell_in_mtd' as any).select('*'),
          supabase.from('vw_yoy_mensal' as any).select('*').order('ano', { ascending: true }).order('mes_num', { ascending: true }),
          supabase.from('vw_positivacao_mensal' as any).select('*').order('mes', { ascending: true }),
        ]);

        setSaudeCarteira((saudeRes.data as any[] ?? []) as SaudeCarteira[]);
        setClientesRisco((riscoRes.data as any[] ?? []) as ClienteRisco[]);
        setSegmentacaoAbc((abcRes.data as any[] ?? []) as SegmentacaoAbc[]);
        setSellOutMensal((sellOutMensalRes.data as any[] ?? []) as SellOutMensal[]);
        setSellOutMtd((sellOutMtdRes.data as any[] ?? []) as SellOutMtd[]);
        setSellInMtd((sellInMtdRes.data as any[] ?? []) as SellInMtd[]);
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

  return { saudeCarteira, clientesRisco, segmentacaoAbc, sellOutMensal, sellOutMtd, sellInMtd, yoyMensal, positivacaoMensal, loading };
}
