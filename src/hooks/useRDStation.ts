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

  // Sincronização com RD Station temporariamente desativada
  const syncQuoteToRDStation = async (_quote: Quote): Promise<RDStationSyncResult> => {
    console.log('[RDStation] Sincronização desativada — ignorando chamada');
    return { success: true, message: 'Sincronização desativada' };
  };

  return {
    syncQuoteToRDStation,
    isSyncing,
  };
}
