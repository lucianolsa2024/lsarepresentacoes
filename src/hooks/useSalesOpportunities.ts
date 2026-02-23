import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SalesOpportunity {
  id: string;
  clientId: string | null;
  title: string;
  description: string;
  funnelType: 'lojista' | 'corporativo';
  stage: string;
  value: number;
  expectedCloseDate: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityFormData {
  clientId?: string | null;
  title: string;
  description?: string;
  funnelType: 'lojista' | 'corporativo';
  stage: string;
  value?: number;
  expectedCloseDate?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  ownerEmail?: string;
}

export const FUNNEL_STAGES = [
  { key: 'prospeccao', label: 'Prospecção' },
  { key: 'qualificacao', label: 'Qualificação' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'negociacao', label: 'Negociação' },
  { key: 'fechamento', label: 'Fechamento' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' },
] as const;

const dbToOpportunity = (row: any): SalesOpportunity => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  description: row.description || '',
  funnelType: row.funnel_type,
  stage: row.stage,
  value: row.value || 0,
  expectedCloseDate: row.expected_close_date,
  contactName: row.contact_name || '',
  contactPhone: row.contact_phone || '',
  contactEmail: row.contact_email || '',
  notes: row.notes || '',
  lostReason: row.lost_reason,
  wonAt: row.won_at,
  lostAt: row.lost_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useSalesOpportunities() {
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities((data || []).map(dbToOpportunity));
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Erro ao carregar oportunidades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const addOpportunity = async (data: OpportunityFormData): Promise<SalesOpportunity | null> => {
    try {
      const insertData: Record<string, any> = {
        client_id: data.clientId || null,
        title: data.title,
        description: data.description || null,
        funnel_type: data.funnelType,
        stage: data.stage,
        value: data.value || 0,
        expected_close_date: data.expectedCloseDate || null,
        contact_name: data.contactName || null,
        contact_phone: data.contactPhone || null,
        contact_email: data.contactEmail || null,
        notes: data.notes || null,
      };
      if (data.ownerEmail) insertData.owner_email = data.ownerEmail;
      const { data: result, error } = await supabase
        .from('sales_opportunities')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      const opp = dbToOpportunity(result);
      setOpportunities(prev => [opp, ...prev]);
      toast.success('Oportunidade criada');
      return opp;
    } catch (error) {
      console.error('Error adding opportunity:', error);
      toast.error('Erro ao criar oportunidade');
      return null;
    }
  };

  const updateOpportunity = async (id: string, data: Partial<OpportunityFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.funnelType !== undefined) updateData.funnel_type = data.funnelType;
      if (data.stage !== undefined) {
        updateData.stage = data.stage;
        if (data.stage === 'ganho') updateData.won_at = new Date().toISOString();
        if (data.stage === 'perdido') updateData.lost_at = new Date().toISOString();
      }
      if (data.value !== undefined) updateData.value = data.value;
      if (data.expectedCloseDate !== undefined) updateData.expected_close_date = data.expectedCloseDate;
      if (data.contactName !== undefined) updateData.contact_name = data.contactName;
      if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
      if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.clientId !== undefined) updateData.client_id = data.clientId;

      const { error } = await supabase
        .from('sales_opportunities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchOpportunities();
      return true;
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast.error('Erro ao atualizar oportunidade');
      return false;
    }
  };

  const deleteOpportunity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sales_opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setOpportunities(prev => prev.filter(o => o.id !== id));
      toast.success('Oportunidade excluída');
      return true;
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast.error('Erro ao excluir oportunidade');
      return false;
    }
  };

  const moveStage = async (id: string, newStage: string): Promise<boolean> => {
    return updateOpportunity(id, { stage: newStage });
  };

  return {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveStage,
    refetch: fetchOpportunities,
  };
}
