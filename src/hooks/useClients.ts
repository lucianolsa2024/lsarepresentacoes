import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from '@/types/quote';
import { toast } from 'sonner';

export interface Client extends ClientData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Convert DB row to Client
const dbToClient = (row: {
  id: string;
  name: string | null;
  company: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  is_new_client: boolean | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}): Client => ({
  id: row.id,
  name: row.name || '',
  company: row.company,
  document: row.document || '',
  phone: row.phone || '',
  email: row.email || '',
  isNewClient: row.is_new_client || false,
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
const clientToDb = (client: ClientData) => ({
  name: client.name || null,
  company: client.company,
  document: client.document || null,
  phone: client.phone || null,
  email: client.email || null,
  is_new_client: client.isNewClient,
  street: client.address.street || null,
  number: client.address.number || null,
  complement: client.address.complement || null,
  neighborhood: client.address.neighborhood || null,
  city: client.address.city || null,
  state: client.address.state || null,
  zip_code: client.address.zipCode || null,
});

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company');

      if (error) throw error;

      setClients((data || []).map(dbToClient));
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

  const addClient = async (clientData: ClientData): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientToDb(clientData))
        .select()
        .single();

      if (error) throw error;

      const newClient = dbToClient(data);
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
      const { error } = await supabase
        .from('clients')
        .update(clientToDb(clientData))
        .eq('id', id);

      if (error) throw error;

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
