import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra maiúscula';
  if (!/[0-9]/.test(password)) return 'Senha deve conter pelo menos um número';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is admin
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 100 });
      if (error) throw error;
      const users = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.user_metadata?.full_name || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
      }));
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create') {
      const { email, password, name } = body;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const pwError = validatePassword(password);
      if (pwError) {
        return new Response(JSON.stringify({ error: pwError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) throw error;
      return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reset-password') {
      const { userId: targetUserId, newPassword } = body;
      if (!targetUserId || !newPassword) {
        return new Response(JSON.stringify({ error: 'userId e newPassword são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const pwError = validatePassword(newPassword);
      if (pwError) {
        return new Response(JSON.stringify({ error: pwError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const rawMsg = err?.message || String(err) || 'Erro interno';
    console.error('Admin operation failed:', rawMsg);

    // Traduz mensagens comuns do GoTrue para PT-BR
    let msg = rawMsg;
    const lower = rawMsg.toLowerCase();
    let status = 500;
    if (lower.includes('weak') || lower.includes('known to be')) {
      msg = 'Senha muito comum ou vazada em incidentes de segurança. Escolha uma senha mais forte (ex.: combine letras, números e símbolos não óbvios).';
      status = 422;
    } else if (lower.includes('password') && lower.includes('short')) {
      msg = 'Senha muito curta. Use no mínimo 8 caracteres.';
      status = 422;
    } else if (lower.includes('user not found')) {
      msg = 'Usuário não encontrado.';
      status = 404;
    } else if (lower.includes('email') && lower.includes('exists')) {
      msg = 'Já existe um usuário com este email.';
      status = 409;
    }

    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
