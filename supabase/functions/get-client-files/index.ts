// supabase/functions/get-client-files/index.ts
// Busca arquivos do OneDrive + registra logs de acesso

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_ID     = Deno.env.get("AZURE_TENANT_ID")!;
const CLIENT_ID     = Deno.env.get("AZURE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("AZURE_CLIENT_SECRET")!;
const DRIVE_ID      = Deno.env.get("ONEDRIVE_DRIVE_ID")!;
const ROOT_FOLDER   = "PÚBLICO LSA/CONFIRMAÇÕES CLIENTES 2026";

async function getAccessToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         "https://graph.microsoft.com/.default",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${data.error_description}`);
  return data.access_token;
}

async function listFiles(token: string, folderPath: string) {
  const encodedPath = encodeURIComponent(folderPath);
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${encodedPath}:/children?$select=id,name,size,lastModifiedDateTime,file,@microsoft.graph.downloadUrl&$orderby=lastModifiedDateTime desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Graph API error: ${await res.text()}`);
  const data = await res.json();
  return (data.value ?? []).filter((item: any) => item.file);
}

async function logAction(
  supabaseAdmin: any,
  clientId: string,
  userId: string,
  fileName: string,
  action: "view" | "download" | "added"
) {
  await supabaseAdmin.from("client_file_logs").insert({
    client_id: clientId,
    user_id:   userId,
    file_name: fileName,
    action,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) throw new Error("Token inválido");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("client_id, role")
      .eq("user_id", user.id)
      .single();

    const body = await req.json().catch(() => ({}));
    let clientId = roleData?.client_id;

    if (roleData?.role === "admin" && body.client_id) {
      clientId = body.client_id;
    }

    if (!clientId) throw new Error("Cliente não vinculado");

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("company, trade_name")
      .eq("id", clientId)
      .single();

    if (clientError || !clientData) throw new Error("Cliente não encontrado");

    const clientFolderName = (clientData.trade_name || clientData.company).toUpperCase();
    const folderPath = `${ROOT_FOLDER}/${clientFolderName}`;

    // Se for ação de log (view ou download), registra e retorna
    if (body.action && body.file_name) {
      await logAction(supabaseAdmin, clientId, user.id, body.file_name, body.action);
      return new Response(JSON.stringify({ logged: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Lista arquivos do OneDrive
    const token = await getAccessToken();
    const files = await listFiles(token, folderPath);

    // Registra arquivos novos (últimas 24h) como "added"
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newFiles = files.filter((f: any) => f.lastModifiedDateTime > oneDayAgo);

    for (const f of newFiles) {
      const { data: existing } = await supabaseAdmin
        .from("client_file_logs")
        .select("id")
        .eq("client_id", clientId)
        .eq("file_name", f.name)
        .eq("action", "added")
        .maybeSingle();

      if (!existing) {
        await logAction(supabaseAdmin, clientId, user.id, f.name, "added");
      }
    }

    const result = files.map((f: any) => ({
      id:           f.id,
      name:         f.name,
      size:         f.size,
      lastModified: f.lastModifiedDateTime,
      downloadUrl:  f["@microsoft.graph.downloadUrl"] ?? null,
    }));

    return new Response(JSON.stringify({ data: result, folder: folderPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
