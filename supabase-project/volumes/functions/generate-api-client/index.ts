import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { nanoid } from "https://esm.sh/nanoid@5.0.2";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser) {
      return new Response("Unauthorized", { status: 401 });
    }

    const uid = authUser.user.id;

    const { organization_id, name } = await req.json();

    if (!organization_id) {
      return new Response("organization_id is required", { status: 400 });
    }

    // Check if user is admin or owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("uid", uid)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Generate the keys
    const client_id = `client_${nanoid(20)}`;
    const client_secret = `secret_${nanoid(40)}`;

    // Store in db
    const { error } = await supabase
      .from("api_clients")
      .insert({
        organization_id,
        client_id,
        client_secret,
        name
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ client_id, client_secret }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
