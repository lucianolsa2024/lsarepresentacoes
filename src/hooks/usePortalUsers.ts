import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PortalUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed_at: string | null;
}

async function callEdgeFunction(action: string, payload: object = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-portal-users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );

  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export function usePortalUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await callEdgeFunction("list");
      setUsers(data ?? []);
    } catch (err: any) {
      toast({ title: "Erro ao listar usuários", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function createUser(email: string, password: string) {
    try {
      await callEdgeFunction("create", { email, password });
      toast({ title: "Usuário criado", description: `${email} criado com sucesso.` });
      await fetchUsers();
      return true;
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
      return false;
    }
  }

  async function updateEmail(userId: string, email: string) {
    try {
      await callEdgeFunction("update_email", { userId, email });
      toast({ title: "E-mail atualizado" });
      await fetchUsers();
      return true;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      return false;
    }
  }

  async function updatePassword(userId: string, password: string) {
    try {
      await callEdgeFunction("update_password", { userId, password });
      toast({ title: "Senha atualizada" });
      return true;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      return false;
    }
  }

  async function toggleBan(userId: string, currentlyBanned: boolean) {
    try {
      await callEdgeFunction("toggle_ban", { userId, banned: !currentlyBanned });
      toast({ title: currentlyBanned ? "Acesso reativado" : "Acesso suspenso" });
      await fetchUsers();
      return true;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      return false;
    }
  }

  async function deleteUser(userId: string) {
    try {
      await callEdgeFunction("delete", { userId });
      toast({ title: "Usuário removido" });
      await fetchUsers();
      return true;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      return false;
    }
  }

  return {
    users, loading, fetchUsers,
    createUser, updateEmail, updatePassword, toggleBan, deleteUser,
  };
}
