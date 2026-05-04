// src/hooks/useClientFiles.ts
// Busca arquivos do OneDrive + registra logs de visualização e download

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

async function callEdgeFunction(token: string, body: object) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-client-files`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
  return res.json();
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

      const json = await callEdgeFunction(session.access_token, {});
      if (json.error) throw new Error(json.error);
      setFiles(json.data ?? []);
    } catch (err: any) {
      if (err.message?.includes("404")) {
        setFiles([]);
      } else {
        setError(err.message ?? "Erro ao carregar arquivos.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function logView(fileName: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await callEdgeFunction(session.access_token, {
        action: "view",
        file_name: fileName,
      });
    } catch { /* silencioso */ }
  }

  async function logDownload(fileName: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await callEdgeFunction(session.access_token, {
        action: "download",
        file_name: fileName,
      });
    } catch { /* silencioso */ }
  }

  return { files, loading, error, refetch: fetchFiles, logView, logDownload };
}
