import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useIsRepresentative() {
  const { user } = useAuth();
  const [isRep, setIsRep] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setIsRep(null);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('representatives_map' as any)
        .select('representative_name')
        .eq('email', user.email)
        .maybeSingle();
      setIsRep(!!data);
    };
    check();
  }, [user?.email]);

  return isRep;
}
