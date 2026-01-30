import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase admin client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// SNAP auth
const SNAP_TOKEN_URL =
  "https://snap4.rhodes.gr/auth/realms/master/protocol/openid-connect/token/";

const SNAP_USERNAME = Deno.env.get("SNAP_USERNAME");
const SNAP_PASSWORD = Deno.env.get("SNAP_PASSWORD");
const SNAP_CLIENT_ID = Deno.env.get("SNAP_CLIENT_ID");
const SNAP_CLIENT_SECRET = Deno.env.get("SNAP_CLIENT_SECRET");

// SNAP base
const SNAP_BASE = "https://snap4.rhodes.gr/ServiceMap/api/v1/iot-search/";
const BBOX = "36.0;27.7;36.6;28.3";

// -----------------------
// GET SNAP TOKEN
// -----------------------
async function getSnapToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    username: SNAP_USERNAME!,
    password: SNAP_PASSWORD!,
  });

  const res = await fetch(SNAP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + btoa(`${SNAP_CLIENT_ID}:${SNAP_CLIENT_SECRET}`),
    },
    body,
  });

  if (!res.ok) {
    console.error("Token fetch failed:", res.status);
    return null;
  }

  const json = await res.json();
  return json.access_token;
}

// -----------------------
// FETCH SNAP DATA
// -----------------------
async function fetchSnap(params: Record<string, string>) {
  const token = await getSnapToken();
  if (!token) return [];

  let url = `${SNAP_BASE}?selection=${BBOX}`;
  for (const [k, v] of Object.entries(params)) {
    url += `&${k}=${encodeURIComponent(v)}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error("SNAP fetch failed:", res.status);
    return [];
  }

  const json = await res.json();
  return json?.features ?? [];
}

function cleanFeature(f: any) {
  const props = f.properties ?? {};
  const values = props.values ?? {};
  const merged = { ...props, ...values };

  if (f.geometry?.coordinates) {
    merged.lng = f.geometry.coordinates[0];
    merged.lat = f.geometry.coordinates[1];
  }

  return merged;
}

// -----------------------
// SAVE LATEST (truncate + insert)
// -----------------------
async function saveLatest(table: string, items: any[]) {
  console.log(`Updating latest table: ${table}`);

  // Clear table
  await supabase.from(table).delete().neq("id", 0);

  if (!items.length) {
    console.log(`No latest data for ${table}`);
    return;
  }

  const rows = items.map((i) => ({ payload: i }));
  const { error } = await supabase.from(table).insert(rows);

  if (error) console.error(error);
  else console.log(`Inserted ${items.length} items into ${table}`);
}

// -----------------------
// SYNC LATEST
// -----------------------
async function syncLatest() {
  console.log("▶ Fetching LATEST data...");

  // Buildings
  const buildings = await fetchSnap({
    model: "RhodesBuildingProfile",
    type: "BuildingProfile",
  });
  await saveLatest("building_data_latest", buildings.map(cleanFeature));

  // Traffic lights
  const lights = await fetchSnap({
    model: "RhodesTrafficLightProfile",
  });
  await saveLatest("traffic_lights_data_latest", lights.map(cleanFeature));

  // Traffic sensors
  const sensors = await fetchSnap({
    model: "RhodesTrafficSensorProfile",
  });
  await saveLatest("traffic_sensors_data_latest", sensors.map(cleanFeature));

  console.log("✔ LATEST update completed");
}

// -----------------------
// ENTRYPOINT
// -----------------------
Deno.serve(async () => {
  syncLatest().catch((e) => console.error("Sync error:", e));
  return new Response("Latest sync started", { status: 200 });
});