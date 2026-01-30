// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.1/http/server.ts"
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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/api", "");

  // HEALTH CHECK (public)
  if (path === "/health") {
    return json({ ok: true });
  }

  // PROTECTED ROUTES — require JWT
  const auth = await requireAuth(req);
  if (auth.error) return json({ error: auth.error }, 401);

  if (path === "/buildings") {
    const { data, error } = await supabaseAdmin.from("building_data").select("*");
    if (error) return json({ error: error.message }, 500);

    return json({ buildings: data });
  }

  if (path === "/latest") {
    const buildings = await supabaseAdmin.from("building_data_latest").select("*");
    const lights = await supabaseAdmin.from("traffic_lights_data_latest").select("*");
    const sensors = await supabaseAdmin.from("traffic_sensors_data_latest").select("*");

    return json({
      latest: {
        buildings: buildings.data,
        traffic_lights: lights.data,
        traffic_sensors: sensors.data,
      },
    });
  }

  return json({ error: "Not Found" }, 404);
});
