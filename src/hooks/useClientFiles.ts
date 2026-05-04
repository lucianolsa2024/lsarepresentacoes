// src/hooks/useClientFiles.ts
// Busca os arquivos de confirmação do cliente no OneDrive via Edge Function

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ClientFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  downloadUrl: string | null;
}

export function useClientFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchFiles();
  }, [user?.id]);

  async function fetchFiles() {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão inválida");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-client-files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFiles(json.data ?? []);

    } catch (err: any) {
      // Pasta não encontrada = cliente não tem arquivos ainda
      if (err.message?.includes("404") || err.message?.includes("não encontrad")) {
        setFiles([]);
      } else {
        setError(err.message ?? "Erro ao carregar arquivos.");
      }
    } finally {
      setLoading(false);
    }
  }

  return { files, loading, error, refetch: fetchFiles };
}
