import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';
import { toast } from 'sonner';

interface RDStationSyncResult {
  success: boolean;
  organizationId?: string;
  contactId?: string;
  dealId?: string;
  message?: string;
  error?: string;
}

export function useRDStation() {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncQuoteToRDStation = async (quote: Quote): Promise<RDStationSyncResult> => {
    setIsSyncing(true);

    try {
      console.log('Starting RD Station sync for quote:', quote.id);

      const { data, error } = await supabase.functions.invoke('rdstation-sync', {
        body: {
          client: quote.client,
          quote: {
            id: quote.id,
            total: quote.total,
            items: quote.items.map(item => ({
              productName: item.productName,
              modulation: item.modulation,
              fabricTier: item.fabricTier,
              price: item.price,
              quantity: item.quantity,
            })),
            createdAt: quote.createdAt,
          },
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao chamar edge function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha na sincronização');
      }

      console.log('RD Station sync successful:', data);
      toast.success('✅ Sincronizado com RD Station CRM', {
        description: `Negociação criada para ${quote.client.company}`,
      });

      return data as RDStationSyncResult;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('RD Station sync failed:', errorMessage);
      
      toast.error('Falha ao sincronizar com RD Station', {
        description: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };

    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncQuoteToRDStation,
    isSyncing,
  };
}
