import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) throw new Error("Token inválido");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Acesso negado: apenas admins");

    const body = await req.json();
    const { action, userId, email, password, banned } = body;

    let result: any;

    switch (action) {
      case "list": {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listError) throw listError;
        result = listData.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          email_confirmed_at: u.email_confirmed_at,
        }));
        break;
      }

      case "create": {
        const { data: createData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
        if (createError) throw createError;
        result = createData.user;
        break;
      }

      case "update_email": {
        const { data: emailData, error: emailError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, { email });
        if (emailError) throw emailError;
        result = emailData.user;
        break;
      }

      case "update_password": {
        const { data: passData, error: passError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (passError) throw passError;
        result = passData.user;
        break;
      }

      case "toggle_ban": {
        const { data: banData, error: banError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: banned ? "876600h" : "none",
          } as any);
        if (banError) throw banError;
        result = banData.user;
        break;
      }

      case "delete": {
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
        result = { deleted: true };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
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
