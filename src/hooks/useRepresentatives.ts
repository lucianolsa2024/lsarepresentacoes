import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Representative {
  name: string;
  email: string;
  active: boolean;
}

export function useRepresentatives() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('representatives_map' as any)
        .select('representative_name, email, active')
        .order('representative_name');
      if (data) {
        setRepresentatives(
          (data as any[]).map((r: any) => ({
            name: r.representative_name,
            email: r.email,
            active: r.active,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const activeReps = representatives.filter(r => r.active);
  const repNames = activeReps.map(r => r.name);
  const emailToName = Object.fromEntries(representatives.map(r => [r.email, r.name]));
  const nameToEmail = Object.fromEntries(representatives.map(r => [r.name.toUpperCase().trim(), r.email]));

  return { representatives, activeReps, repNames, emailToName, nameToEmail, loading };
}
