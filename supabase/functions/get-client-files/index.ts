// supabase/functions/get-client-files/index.ts
// Busca os arquivos de confirmação do cliente no OneDrive via Microsoft Graph API

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_ID  = Deno.env.get("AZURE_TENANT_ID")!;
const CLIENT_ID  = Deno.env.get("AZURE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("AZURE_CLIENT_SECRET")!;
const DRIVE_ID   = Deno.env.get("ONEDRIVE_DRIVE_ID")!;   // preenchido após descoberta
const ROOT_FOLDER = "PÚBLICO LSA/CONFIRMAÇÕES CLIENTES 2026";

// Obtém token de acesso do Azure AD (client credentials)
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

// Lista arquivos de uma pasta do OneDrive pelo caminho
async function listFiles(token: string, folderPath: string) {
  const encodedPath = encodeURIComponent(folderPath);
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${encodedPath}:/children?$select=id,name,size,lastModifiedDateTime,file,@microsoft.graph.downloadUrl&$orderby=lastModifiedDateTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error: ${err}`);
  }

  const data = await res.json();
  return (data.value ?? []).filter((item: any) => item.file); // só arquivos, não subpastas
}

// Gera link temporário de download (válido por 1h)
async function getDownloadUrl(token: string, itemId: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${itemId}?$select=@microsoft.graph.downloadUrl`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data["@microsoft.graph.downloadUrl"] ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verifica autenticação do usuário
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

    // 2. Busca client_id vinculado ao usuário
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("client_id, role")
      .eq("user_id", user.id)
      .single();

    // Admin pode passar client_id por parâmetro; cliente usa o próprio
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let clientId = roleData?.client_id;

    if (roleData?.role === "admin" && body.client_id) {
      clientId = body.client_id;
    }

    if (!clientId) throw new Error("Cliente não vinculado");

    // 3. Busca nome do cliente no banco
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("company, trade_name")
      .eq("id", clientId)
      .single();

    if (clientError || !clientData) throw new Error("Cliente não encontrado");

    // 4. Monta o caminho da pasta do cliente no OneDrive
    // Tenta trade_name primeiro, depois company
    const clientFolderName = (clientData.trade_name || clientData.company).toUpperCase();
    const folderPath = `${ROOT_FOLDER}/${clientFolderName}`;

    // 5. Busca token Azure e lista arquivos
    const token = await getAccessToken();
    const files = await listFiles(token, folderPath);

    // 6. Formata resposta
    const result = files.map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      lastModified: f.lastModifiedDateTime,
      downloadUrl: f["@microsoft.graph.downloadUrl"] ?? null,
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
