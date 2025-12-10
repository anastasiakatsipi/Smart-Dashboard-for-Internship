import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    // 1. Validate the JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Create supabase client with JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // 3. Get the authenticated user (uid)
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const uid = user.user.id;

    // 4. Parse body
    const body = await req.json();
    const { orgName } = body;

    if (!orgName) {
      return new Response("Organization name required", { status: 400 });
    }

    // 5. Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName })  
      .select()
      .single();

    if (orgError) throw orgError;

    const orgId = org.organization_id;

    // 6. Add user as owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: orgId,
        uid,
        role: "owner",
      });

    if (memberError) throw memberError;

    // 7. Return org
    return new Response(JSON.stringify(org), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
