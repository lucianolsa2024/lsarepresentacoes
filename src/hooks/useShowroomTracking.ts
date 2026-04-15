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
    mutationFn: async (params: {
      id: string;
      status_exposicao: string;
      observacao: string;
      agendarTreinamento?: boolean;
      cliente?: string;
      produto?: string;
      representante?: string | null;
    }) => {
      const { error } = await supabase
        .from('showroom_tracking' as any)
        .update({
          status_exposicao: params.status_exposicao,
          data_confirmacao: new Date().toISOString().split('T')[0],
          observacao: params.observacao,
        } as any)
        .eq('id', params.id);
      if (error) throw error;

      // Schedule training activity if exposed
      if (params.agendarTreinamento && params.cliente && params.produto) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

        // Find representative email from representatives_map
        let assignedEmail: string | null = null;
        if (params.representante) {
          const { data: repData } = await supabase
            .from('representatives_map')
            .select('email')
            .ilike('representative_name', `%${params.representante}%`)
            .limit(1);
          if (repData && repData.length > 0) {
            assignedEmail = repData[0].email;
          }
        }

        const { error: actError } = await supabase.from('activities').insert({
          title: `Treinamento Showroom: ${params.produto} — ${params.cliente}`,
          type: 'treinamento',
          activity_category: 'tarefa',
          due_date: dueDate.toISOString().split('T')[0],
          description: `Treinamento de produto ${params.produto} no cliente ${params.cliente}. Item confirmado como exposto no showroom.`,
          status: 'pendente',
          priority: 'alta',
          assigned_to_email: assignedEmail,
          origem: 'showroom',
        });
        if (actError) {
          console.error('Erro ao criar atividade de treinamento:', actError);
          toast.error('Exposição confirmada, mas erro ao agendar treinamento');
          return;
        }
        toast.success('Exposição confirmada e treinamento agendado');
        return;
      }
    },
    onSuccess: (_data, variables) => {
      if (!variables.agendarTreinamento) {
        toast.success('Exposição confirmada');
      }
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
