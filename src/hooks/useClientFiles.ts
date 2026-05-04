// src/hooks/useClientFiles.ts
// Hook para listar arquivos de confirmação do cliente no OneDrive
// via edge function get-client-files (Microsoft Graph API).

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  downloadUrl: string | null;
}

interface UseClientFilesResult {
  files: ClientFile[];
  loading: boolean;
  error: string | null;
  folder: string | null;
  refetch: () => Promise<void>;
}

export function useClientFiles(clientId?: string): UseClientFilesResult {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "get-client-files",
        {
          body: clientId ? { client_id: clientId } : {},
        }
      );

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      setFiles(data?.data ?? []);
      setFolder(data?.folder ?? null);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar arquivos.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, error, folder, refetch: fetchFiles };
}
