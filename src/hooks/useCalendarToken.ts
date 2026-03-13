import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCalendarToken() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    fetchToken();
  }, [user?.email]);

  const fetchToken = async () => {
    if (!user?.email) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('calendar_tokens' as any)
      .select('token')
      .eq('user_email', user.email)
      .single();

    if (data && !error) {
      setToken((data as any).token);
    } else {
      // Create token
      const { data: newData, error: insertError } = await supabase
        .from('calendar_tokens' as any)
        .insert({ user_email: user.email } as any)
        .select('token')
        .single();

      if (newData && !insertError) {
        setToken((newData as any).token);
      }
    }
    setLoading(false);
  };

  const getFeedUrl = () => {
    if (!token) return null;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'pjdyaeprvtwoltynoqri';
    return `https://${projectId}.supabase.co/functions/v1/ical-feed?token=${token}`;
  };

  return { token, loading, feedUrl: getFeedUrl() };
}
