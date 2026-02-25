import { useState, useEffect, useCallback } from 'react';
import { Quote, QuoteStatus, ClientData, QuoteItem, PaymentConditions } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Legacy localStorage key for migration
const STORAGE_KEY = 'quote-system-quotes';

const dbToQuote = (row: {
  id: string;
  client_id: string | null;
  client_data: Json;
  items: Json;
  payment: Json;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  version?: number;
  parent_quote_id?: string | null;
}): Quote => {
  // Map DB status to QuoteStatus
  const mapStatus = (s: string): QuoteStatus => {
    if (s === 'pedido') return 'pedido';
    if (s === 'cancelado') return 'cancelado';
    return 'orcamento';
  };
  return {
    id: row.id,
    createdAt: row.created_at,
    client: row.client_data as unknown as ClientData,
    items: row.items as unknown as QuoteItem[],
    payment: row.payment as unknown as PaymentConditions,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    status: mapStatus(row.status),
    version: row.version || 1,
    parentQuoteId: row.parent_quote_id || null,
  };
};

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If RLS blocks access, fall back to localStorage
        console.log('Using localStorage for quotes');
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setQuotes(JSON.parse(stored));
          } catch {
            setQuotes([]);
          }
        }
        return;
      }

      setQuotes((data || []).map(dbToQuote));
    } catch (error) {
      console.error('Error fetching quotes:', error);
      // Fall back to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setQuotes(JSON.parse(stored));
        } catch {
          setQuotes([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const addQuote = async (quote: Quote, clientId?: string, ownerEmail?: string, version?: number, parentQuoteId?: string): Promise<Quote | null> => {
    try {
      const insertData: Record<string, any> = {
        id: quote.id,
        client_id: clientId || null,
        client_data: quote.client as unknown as Json,
        items: quote.items as unknown as Json,
        payment: quote.payment as unknown as Json,
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        status: quote.status || 'orcamento',
        version: version || 1,
        parent_quote_id: parentQuoteId || null,
      };
      if (ownerEmail) insertData.owner_email = ownerEmail;
      const { data, error } = await supabase
        .from('quotes')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('DB error inserting quote:', error);
        toast.error(`Erro ao salvar orçamento: ${error.message}`);
        // Fall back to localStorage
        const newQuotes = [quote, ...quotes];
        setQuotes(newQuotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuotes));
        return quote;
      }

      const newQuote = dbToQuote(data);
      setQuotes((prev) => [newQuote, ...prev]);
      return newQuote;
    } catch (error) {
      console.error('Error adding quote:', error);
      // Fall back to localStorage
      const newQuotes = [quote, ...quotes];
      setQuotes(newQuotes);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuotes));
      return quote;
    }
  };

  const updateQuote = async (id: string, quote: Quote): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          client_data: quote.client as unknown as Json,
          items: quote.items as unknown as Json,
          payment: quote.payment as unknown as Json,
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
        })
        .eq('id', id);

      if (error) {
        console.error('DB error updating quote:', error);
        // Fall back to localStorage
        const newQuotes = quotes.map((q) => (q.id === id ? quote : q));
        setQuotes(newQuotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuotes));
        return true;
      }

      await fetchQuotes();
      return true;
    } catch (error) {
      console.error('Error updating quote:', error);
      return false;
    }
  };

  const deleteQuote = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('DB error deleting quote:', error);
        // Fall back to localStorage
        const newQuotes = quotes.filter((q) => q.id !== id);
        setQuotes(newQuotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuotes));
        return true;
      }

      setQuotes((prev) => prev.filter((q) => q.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting quote:', error);
      return false;
    }
  };

  const duplicateQuote = async (id: string): Promise<Quote | null> => {
    const quote = quotes.find((q) => q.id === id);
    if (!quote) return null;

    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    return await addQuote(newQuote);
  };

  const getQuoteById = (id: string): Quote | undefined => {
    return quotes.find((q) => q.id === id);
  };

  const updateQuoteStatus = async (id: string, status: QuoteStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
      toast.success(`Status atualizado para ${status === 'pedido' ? 'Pedido' : status === 'cancelado' ? 'Cancelado' : 'Orçamento'}`);
      return true;
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast.error('Erro ao atualizar status');
      return false;
    }
  };

  return {
    quotes,
    loading,
    addQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    duplicateQuote,
    getQuoteById,
    refetch: fetchQuotes,
  };
}
