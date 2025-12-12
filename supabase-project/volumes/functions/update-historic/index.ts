import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase service role client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

// SNAP credentials
const SNAP_TOKEN_URL ="https://snap4.rhodes.gr/auth/realms/master/protocol/openid-connect/token/";
const SNAP_USERNAME = Deno.env.get("SNAP_USERNAME");
const SNAP_PASSWORD = Deno.env.get("SNAP_PASSWORD");
const SNAP_CLIENT_ID = Deno.env.get("SNAP_CLIENT_ID");
const SNAP_CLIENT_SECRET = Deno.env.get("SNAP_CLIENT_SECRET");

// API Base
const SNAP_BASE = "https://snap4.rhodes.gr/ServiceMap/api/v1/iot-search/";
const BBOX = "36.0;27.7;36.6;28.3";

// ----------------------------
// GET TOKEN
// ----------------------------
async function getSnapToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    username: SNAP_USERNAME,
    password: SNAP_PASSWORD
  });

  const res = await fetch(SNAP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + btoa(`${SNAP_CLIENT_ID}:${SNAP_CLIENT_SECRET}`)
    },
    body
  });

  if (!res.ok) {
    console.error("❌ Token fetch failed:", res.status);
    return null;
  }

  const json = await res.json();
  return json.access_token;
}

// ----------------------------
// FETCH SNAP DATA
// ----------------------------
async function fetchSnap(params) {
  const token = await getSnapToken();
  if (!token) return [];

  let url = `${SNAP_BASE}?selection=${BBOX}`;

  for (const [k, v] of Object.entries(params)) {
    url += `&${k}=${encodeURIComponent(v)}`;
  }

  console.log("🌐 Fetching:", url);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error("❌ SNAP fetch failed:", res.status);
    return [];
  }

  const json = await res.json();
  return json?.features ?? [];
}

// ----------------------------
// CLEAN FEATURE
// ----------------------------
function cleanFeature(f) {
  const props = f.properties ?? {};
  const values = props.values ?? {};

  const merged = { ...props, ...values };

  if (f.geometry?.coordinates) {
    merged.lng = f.geometry.coordinates[0];
    merged.lat = f.geometry.coordinates[1];
  }

  return merged;
}

// ----------------------------
// SAVE TO TABLE
// ----------------------------
async function saveTo(table, items) {
  if (!items.length) {
    console.log(`ℹ No data for ${table}`);
    return;
  }

  const rows = items.map((i) => ({ payload: i }));

  const { error } = await supabase.from(table).insert(rows);

  if (error) console.error(`❌ Insert error for ${table}:`, error);
  else console.log(`✅ Saved ${items.length} to ${table}`);
}

// ----------------------------
// SYNC BUILDINGS
// ----------------------------
async function syncBuildings() {
  const features = await fetchSnap({
    model: "RhodesBuildingProfile",
    type: "BuildingProfile"
  });

  console.log("🏢 Buildings fetched:", features.length);

  const cleaned = features.map(cleanFeature);
  await saveTo("building_data", cleaned);

  return cleaned;
}

// ----------------------------
// SYNC TRAFFIC LIGHTS
// ----------------------------
async function syncTrafficLights() {
  const features = await fetchSnap({
    model: "RhodesTrafficLightProfile"
  });

  console.log("🚦 TrafficLights fetched:", features.length);

  const cleaned = features.map(cleanFeature);
  await saveTo("traffic_lights_data", cleaned);

  return cleaned;
}

// ----------------------------
// SYNC TRAFFIC SENSORS
// ----------------------------
async function syncTrafficSensors() {
  const features = await fetchSnap({
    model: "RhodesTrafficSensorProfile"
  });

  console.log("📡 TrafficSensors fetched:", features.length);

  const cleaned = features.map(cleanFeature);
  await saveTo("traffic_sensors_data", cleaned);

  return cleaned;
}

// ----------------------------
// MAIN SYNC
// ----------------------------
async function runFullSync() {
  console.log("▶ START FULL SYNC");

  const buildings = await syncBuildings();
  const lights = await syncTrafficLights();
  const sensors = await syncTrafficSensors();

  console.log("✔ FULL SYNC COMPLETED");

  return { buildings, lights, sensors };
}

// ----------------------------
// HTTP ENTRYPOINT
// ----------------------------
serve(async () => {
  console.log("🔥 update-historic HIT");

  const results = await runFullSync();

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
