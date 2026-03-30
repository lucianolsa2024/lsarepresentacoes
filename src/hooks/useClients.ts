import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClientData, ClientInfluencer } from '@/types/quote';
import { toast } from 'sonner';

export type ClientCurve = 'A' | 'B' | 'C' | 'D';

import { ClientType } from '@/types/quote';

export interface Client extends ClientData {
  id: string;
  parentClientId: string | null;
  curve: ClientCurve;
  curveUpdatedAt: string | null;
  portfolioStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

// Convert DB row to Client
const dbToClient = (row: any, reps: string[] = [], influencers: ClientInfluencer[] = []): Client => ({
  id: row.id,
  name: row.name || '',
  company: row.company,
  tradeName: row.trade_name || '',
  document: row.document || '',
  phone: row.phone || '',
  email: row.email || '',
  isNewClient: row.is_new_client || false,
  clientType: (row.client_type as ClientType) || undefined,
  ownerEmail: row.owner_email || undefined,
  parentClientId: row.parent_client_id || null,
  curve: (row.curve as ClientCurve) || 'D',
  curveUpdatedAt: row.curve_updated_at || null,
  portfolioStatus: row.portfolio_status || null,
  inscricaoEstadual: row.inscricao_estadual || '',
  site: row.site || '',
  segment: row.segment || '',
  defaultPaymentTerms: row.default_payment_terms || '',
  notes: row.notes || '',
  representativeEmails: reps,
  influencers,
  address: {
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
  phone: row.phone || '',
  email: row.email || '',
  isNewClient: row.is_new_client || false,
  clientType: (row.client_type as ClientType) || undefined,
  ownerEmail: row.owner_email || undefined,
  parentClientId: row.parent_client_id || null,
  curve: (row.curve as ClientCurve) || 'D',
  curveUpdatedAt: row.curve_updated_at || null,
  portfolioStatus: row.portfolio_status || null,
  inscricaoEstadual: row.inscricao_estadual || '',
  site: row.site || '',
  segment: row.segment || '',
  defaultPaymentTerms: row.default_payment_terms || '',
  notes: row.notes || '',
  representativeEmails: reps,
  influencers,
  address: {
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Convert Client to DB format
const clientToDb = (client: ClientData & { curve?: string }) => ({
  name: client.name || null,
  company: client.company,
  trade_name: client.tradeName || null,
  document: client.document || null,
  phone: client.phone || null,
  email: client.email || null,
  is_new_client: client.isNewClient,
  client_type: client.clientType || null,
  owner_email: client.ownerEmail || null,
  parent_client_id: client.parentClientId || null,
  street: client.address.street || null,
  number: client.address.number || null,
  complement: client.address.complement || null,
  neighborhood: client.address.neighborhood || null,
  city: client.address.city || null,
  state: client.address.state || null,
  zip_code: client.address.zipCode || null,
  inscricao_estadual: client.inscricaoEstadual || null,
  site: client.site || null,
  segment: client.segment || null,
  default_payment_terms: client.defaultPaymentTerms || null,
  notes: client.notes || null,
  ...(client.curve ? { curve: client.curve } : {}),
});
  phone: client.phone || null,
  email: client.email || null,
  is_new_client: client.isNewClient,
  client_type: client.clientType || null,
  owner_email: client.ownerEmail || null,
  parent_client_id: client.parentClientId || null,
  street: client.address.street || null,
  number: client.address.number || null,
  complement: client.address.complement || null,
  neighborhood: client.address.neighborhood || null,
  city: client.address.city || null,
  state: client.address.state || null,
  zip_code: client.address.zipCode || null,
  inscricao_estadual: client.inscricaoEstadual || null,
  site: client.site || null,
  segment: client.segment || null,
  default_payment_terms: client.defaultPaymentTerms || null,
  notes: client.notes || null,
  ...(client.curve ? { curve: client.curve } : {}),
});

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch clients, reps, and influencers in parallel
      const [clientsRes, repsRes, influencersRes] = await Promise.all([
        supabase.from('clients').select('*').order('company'),
        supabase.from('client_representatives' as any).select('*'),
        supabase.from('client_influencers' as any).select('*'),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      // Group reps by client_id
      const repsByClient: Record<string, string[]> = {};
      ((repsRes.data || []) as any[]).forEach((r: any) => {
        if (!repsByClient[r.client_id]) repsByClient[r.client_id] = [];
        repsByClient[r.client_id].push(r.representative_email);
      });

      // Group influencers by client_id
      const influencersByClient: Record<string, ClientInfluencer[]> = {};
      ((influencersRes.data || []) as any[]).forEach((inf: any) => {
        if (!influencersByClient[inf.client_id]) influencersByClient[inf.client_id] = [];
        influencersByClient[inf.client_id].push({
          id: inf.id,
          name: inf.name,
          role: inf.role || '',
          phone: inf.phone || '',
          email: inf.email || '',
          notes: inf.notes || '',
        });
      });

      setClients(
        (clientsRes.data || []).map((row: any) =>
          dbToClient(row, repsByClient[row.id] || [], influencersByClient[row.id] || [])
        )
      );
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const syncRepsAndInfluencers = async (clientId: string, clientData: ClientData) => {
    // Sync representatives
    if (clientData.representativeEmails) {
      // Delete existing
      await supabase.from('client_representatives' as any).delete().eq('client_id', clientId);
      // Insert new
      if (clientData.representativeEmails.length > 0) {
        await supabase.from('client_representatives' as any).insert(
          clientData.representativeEmails.map(email => ({
            client_id: clientId,
            representative_email: email,
          }))
        );
      }
      // Also update owner_email to the first rep for backward compat
      if (clientData.representativeEmails.length > 0 && !clientData.ownerEmail) {
        await supabase.from('clients').update({ owner_email: clientData.representativeEmails[0] }).eq('id', clientId);
      }
    }

    // Sync influencers
    if (clientData.influencers) {
      await supabase.from('client_influencers' as any).delete().eq('client_id', clientId);
      if (clientData.influencers.length > 0) {
        await supabase.from('client_influencers' as any).insert(
          clientData.influencers.map(inf => ({
            client_id: clientId,
            name: inf.name,
            role: inf.role || null,
            phone: inf.phone || null,
            email: inf.email || null,
            notes: inf.notes || null,
          }))
        );
      }
    }
  };

  const addClient = async (clientData: ClientData): Promise<Client | null> => {
    try {
      // Set owner_email from first rep for backward compatibility
      const dataToInsert = clientToDb(clientData);
      if (clientData.representativeEmails?.length && !dataToInsert.owner_email) {
        dataToInsert.owner_email = clientData.representativeEmails[0];
      }

      const { data, error } = await supabase
        .from('clients')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      await syncRepsAndInfluencers(data.id, clientData);

      const newClient = dbToClient(data, clientData.representativeEmails || [], clientData.influencers || []);
      setClients(prev => [...prev, newClient].sort((a, b) => a.company.localeCompare(b.company)));
      toast.success('Cliente cadastrado com sucesso');
      return newClient;
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Erro ao cadastrar cliente');
      return null;
    }
  };

  const updateClient = async (id: string, clientData: ClientData): Promise<boolean> => {
    try {
      const dataToUpdate = clientToDb(clientData);
      if (clientData.representativeEmails?.length && !dataToUpdate.owner_email) {
        dataToUpdate.owner_email = clientData.representativeEmails[0];
      }

      const { error } = await supabase
        .from('clients')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      await syncRepsAndInfluencers(id, clientData);

      await fetchClients();
      toast.success('Cliente atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente excluído');
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
      return false;
    }
  };

  const searchClients = (query: string): Client[] => {
    if (!query.trim()) return clients;
    const normalizedQuery = query.toLowerCase().trim();
    return clients.filter(
      c =>
        c.company.toLowerCase().includes(normalizedQuery) ||
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.document.toLowerCase().includes(normalizedQuery) ||
        c.email.toLowerCase().includes(normalizedQuery)
    );
  };

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    searchClients,
    refetch: fetchClients,
  };
}
