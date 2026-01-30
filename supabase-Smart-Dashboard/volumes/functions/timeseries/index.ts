import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* =========================
   SUPABASE CLIENT
========================= */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* =========================
   SNAP AUTH
========================= */
const SNAP_TOKEN_URL = "https://snap4.rhodes.gr/auth/realms/master/protocol/openid-connect/token/";
const SNAP_USERNAME = Deno.env.get("SNAP_USERNAME")!;
const SNAP_PASSWORD = Deno.env.get("SNAP_PASSWORD")!;
const SNAP_CLIENT_ID = Deno.env.get("SNAP_CLIENT_ID")!;
const SNAP_CLIENT_SECRET = Deno.env.get("SNAP_CLIENT_SECRET")!;
const SNAP_BASE = "https://snap4.rhodes.gr/ServiceMap/api/v1/iot-search/";
const BBOX = "36.0;27.7;36.6;28.3";

/* =========================
   HELPERS
========================= */
function isValidNumber(v: any): v is number {
  return typeof v === "number" && !isNaN(v);
}

function getUnit(metric: string) {
  const units: Record<string,string> = {
    temperature: "°C",
    humidity: "%",
    fuel_tank: "%",
    power_consumption: "kW",
    co2: "ppm",
    PM25: "µg/m³",
    PM1: "µg/m³",
    LVOC: "ppb",
    outdoor_temperature: "°C"
  };
  return units[metric] ?? null;
}

/* =========================
   SNAP FUNCTIONS
========================= */
async function getSnapToken(): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "password",
    username: SNAP_USERNAME,
    password: SNAP_PASSWORD
  });

  const res = await fetch(SNAP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${SNAP_CLIENT_ID}:${SNAP_CLIENT_SECRET}`)
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

async function fetchSnap(params: Record<string,string>) {
  const token = await getSnapToken();
  if (!token) return [];

  let url = `${SNAP_BASE}?selection=${BBOX}`;
  for (const [k,v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(v)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });

  if (!res.ok) {
    console.error("❌ SNAP fetch failed:", res.status);
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

/* =========================
   INSERT ALL METRICS DYNAMICALLY
========================= */
async function insertAllMetrics(data: any) {
  const ts = data.dateObserved ?? data.date_time;
  const device = data.deviceName;
  if (!ts || !device) return;

  const metrics = data.values ?? {};

  for (const [metric, value] of Object.entries(metrics)) {
    if (!isValidNumber(value)) continue;

    const { error } = await supabase
      .from("building_measurements")
      .upsert(
        {
          ts,
          device_name: device,
          metric,
          value: Number(value),
          unit: getUnit(metric)
        },
        { onConflict: "device_name,ts,metric", ignoreDuplicates: true }
      );

    if (error) console.error("❌ Metric insert failed", error, metric, value);
  }
}

/* =========================
   EDGE FUNCTION
========================= */
serve(async () => {
  console.log("🔥 FUNCTION STARTED");

  try {
    const features = await fetchSnap({
      nature: "Environment",
      subnature: "Building_and_industrial_cleaning_activities"
    });

    for (const f of features) {
      const data = cleanFeature(f);

      // RAW insert
      const { error: rawError } = await supabase.from("buildings_data").insert({
        device_name: data.deviceName,
        payload: data,
        received_at: new Date().toISOString()
      });
      if (rawError) console.error("❌ Raw insert failed", rawError);

      // DYNAMIC time series insert
      await insertAllMetrics(data);
    }

    console.log("✅ FUNCTION FINISHED");
    return new Response(JSON.stringify({ success: true, count: features.length }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("🔥 FUNCTION CRASHED", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
