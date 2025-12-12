import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ADMIN CLIENT → ΠΡΕΠΕΙ ΝΑ ΧΡΗΣΙΜΟΠΟΙΕΙ SERVICE ROLE KEY
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// JSON HELPER
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// VERIFY AUTH USING JWT
async function requireAuth(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) return { error: "Missing token" };

  // USER CLIENT → ΠΡΕΠΕΙ ΝΑ ΧΡΗΣΙΜΟΠΟΙΕΙ ANON KEY
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) return { error: "Invalid JWT" };

  return { user: data.user };
}

// HELPER → check if user is owner of organization
async function isOwner(uid: string, organization_id: string) {
  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("uid", uid)
    .eq("organization_id", organization_id)
    .single();
  if (error || !data) return false;
  return data.role === "owner";
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/manage_members", ""); // keep your original structure

  // HEALTH CHECK (public)
  if (path === "/health") {
    return json({ ok: true });
  }

  // PROTECTED ROUTES — require JWT
  const auth = await requireAuth(req);
  if (auth.error) return json({ error: auth.error }, 401);

  const userId = auth.user.id;

  // CREATE USER
  if (path === "/create-user") {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON format" }, 400);
    }

    const { email, password, organization_id, full_name, role } = body;
    if (!email || !password || !organization_id)
      return json({ error: "email, password, and organization_id are required" }, 422);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) return json({ error: createError.message }, 400);

    const uid = userData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      uid,
      full_name: full_name ?? null,
    });
    if (profileError) return json({ error: "Failed to create profile" }, 500);

    const { error: memberError } = await supabaseAdmin.from("organization_members").insert({
      organization_id,
      uid,
      role: role ?? "member",
    });
    if (memberError) return json({ error: "Failed to assign user to organization" }, 500);

    return json({
      message: "User created and added to organization successfully",
      uid,
      email,
      organization_id,
      role: role ?? "member",
    });
  }

  // DELETE USER (owner only)
  if (path === "/delete-user") {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON format" }, 400);
    }

    const { uidToDelete, organization_id } = body;
    if (!uidToDelete || !organization_id)
      return json({ error: "uidToDelete and organization_id are required" }, 422);

    const owner = await isOwner(userId, organization_id);
    if (!owner) return json({ error: "Only owners can delete users" }, 403);

    const { error: memberDelError } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("uid", uidToDelete)
      .eq("organization_id", organization_id);
    if (memberDelError) return json({ error: "Failed to remove user from organization" }, 500);

    const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(uidToDelete);
    if (authDelError) return json({ error: authDelError.message }, 500);

    return json({ message: "User deleted successfully", uid: uidToDelete });
  }

  return json({ error: "Not Found" }, 404);
});
