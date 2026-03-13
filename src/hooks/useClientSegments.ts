import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientSegment {
  id: string;
  name: string;
}

export function useClientSegments() {
  const [segments, setSegments] = useState<ClientSegment[]>([]);

  const fetchSegments = useCallback(async () => {
    const { data } = await supabase
      .from('client_segments' as any)
      .select('*')
      .order('name');
    if (data) {
      setSegments((data as any[]).map((s: any) => ({ id: s.id, name: s.name })));
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const addSegment = async (name: string): Promise<ClientSegment | null> => {
    const { data, error } = await supabase
      .from('client_segments' as any)
      .insert({ name })
      .select()
      .single();
    if (error || !data) return null;
    const newSeg = { id: (data as any).id, name: (data as any).name };
    setSegments(prev => [...prev, newSeg].sort((a, b) => a.name.localeCompare(b.name)));
    return newSeg;
  };

  return { segments, addSegment, refetch: fetchSegments };
}
