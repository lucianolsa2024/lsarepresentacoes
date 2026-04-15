import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShowroomItem {
  id: string;
  nf_numero: string;
  dt_faturamento: string;
  cliente: string;
  segmento_cliente: string | null;
  produto: string;
  cidade: string | null;
  representante: string | null;
  quantidade: number;
  valor: number;
  status_exposicao: string;
  status_treinamento: string;
  dias_desde_fat: number;
  urgencia: string;
  treinamento_pendente: boolean;
}

export interface ResumoRep {
  representante: string;
  total_itens: number;
  expostos: number;
  pendentes: number;
  urgentes: number;
  taxa_exposicao: number;
}

export function useShowroomTracking() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['showroom-tracking'],
    queryFn: async () => {
      const [acompRes, resumoRes] = await Promise.all([
        supabase.from('vw_showroom_acompanhamento' as any).select('*'),
        supabase.from('vw_showroom_resumo_rep' as any).select('*'),
      ]);

      return {
        items: (acompRes.data || []) as unknown as ShowroomItem[],
        resumoRep: (resumoRes.data || []) as unknown as ResumoRep[],
      };
    },
  });

  const confirmarExposicao = useMutation({
    mutationFn: async (params: { id: string; status_exposicao: string; observacao: string }) => {
      const { error } = await supabase
        .from('showroom_tracking' as any)
        .update({
          status_exposicao: params.status_exposicao,
          data_confirmacao: new Date().toISOString().split('T')[0],
          observacao: params.observacao,
        } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exposição confirmada');
      queryClient.invalidateQueries({ queryKey: ['showroom-tracking'] });
    },
    onError: () => toast.error('Erro ao confirmar exposição'),
  });

  const marcarTreinamento = useMutation({
    mutationFn: async (params: { id: string; data_treinamento: string; obs_treinamento: string }) => {
      const { error } = await supabase
        .from('showroom_tracking' as any)
        .update({
          status_treinamento: 'realizado',
          data_treinamento: params.data_treinamento,
          obs_treinamento: params.obs_treinamento,
        } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Treinamento registrado');
      queryClient.invalidateQueries({ queryKey: ['showroom-tracking'] });
    },
    onError: () => toast.error('Erro ao registrar treinamento'),
  });

  return {
    items: data?.items || [],
    resumoRep: data?.resumoRep || [],
    isLoading,
    confirmarExposicao,
    marcarTreinamento,
  };
}
