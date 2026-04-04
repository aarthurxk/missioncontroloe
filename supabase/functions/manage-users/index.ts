import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getCallerAsAdmin(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return null;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleData?.role !== "admin") return null;
  return user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { action, ...params } = await req.json();

  // ── SETUP: Create first admin (only if no users exist) ──
  if (action === "setup") {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    if (count && count > 0) {
      return jsonResponse({ error: "Setup já realizado. Faça login." }, 400);
    }

    const { email, password, name } = params;
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }

    await supabase.from("user_roles").insert({ user_id: userData.user.id, role: "admin" });
    await supabase.from("profiles").update({ name }).eq("id", userData.user.id);

    return jsonResponse({ success: true });
  }

  // ── INVITE: Admin creates a new user ──
  if (action === "invite") {
    const caller = await getCallerAsAdmin(req, supabase);
    if (!caller) return jsonResponse({ error: "Apenas admins podem convidar" }, 403);

    const { email, password, name, role } = params;
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }

    await supabase.from("user_roles").insert({ user_id: userData.user.id, role });
    await supabase.from("profiles").update({ name }).eq("id", userData.user.id);

    return jsonResponse({ success: true, user_id: userData.user.id });
  }

  // ── DELETE: Admin removes a user ──
  if (action === "delete") {
    const caller = await getCallerAsAdmin(req, supabase);
    if (!caller) return jsonResponse({ error: "Apenas admins podem remover" }, 403);

    const { user_id } = params;
    if (user_id === caller.id) {
      return jsonResponse({ error: "Não é possível remover a si mesmo" }, 400);
    }

    const { error } = await supabase.auth.admin.deleteUser(user_id);
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ success: true });
  }

  // ── CHANGE PASSWORD: Admin resets a user's password ──
  if (action === "change_password") {
    const caller = await getCallerAsAdmin(req, supabase);
    if (!caller) return jsonResponse({ error: "Apenas admins podem alterar senhas" }, 403);

    const { email, password } = params;
    // find user by email
    const { data: { users: found } } = await supabase.auth.admin.listUsers();
    const target = found?.find((u: any) => u.email === email);
    if (!target) return jsonResponse({ error: "Usuário não encontrado" }, 404);

    const { error } = await supabase.auth.admin.updateUserById(target.id, { password });
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ success: true });
  }

  // ── LIST: Admin lists all users with emails ──
  if (action === "list") {
    const caller = await getCallerAsAdmin(req, supabase);
    if (!caller) return jsonResponse({ error: "Apenas admins podem listar" }, 403);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return jsonResponse({ error: error.message }, 400);

    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    const combined = users.map((u: any) => {
      const profile = profiles?.find((p: any) => p.id === u.id);
      const roleRow = roles?.find((r: any) => r.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        name: profile?.name || "",
        avatar_emoji: profile?.avatar_emoji || "👤",
        role: roleRow?.role || "viewer",
        created_at: u.created_at,
      };
    });

    return jsonResponse({ users: combined });
  }

  return jsonResponse({ error: "Ação inválida" }, 400);
});
