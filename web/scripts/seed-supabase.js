const SUPABASE_URL = "https://gucznihxatxnsdwqihiv.supabase.co";
const SUPABASE_KEY = "sb_publishable_XHbvKzJrrIU-t-UNVHeMEg_bvZ3kQtU";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation, resolution=merge-duplicates",
};

async function api(path, method = "GET", body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${method} ${path}: ${text}`);
  }
  return res.json();
}

const PLUGINS = [
  {
    slug: "sound-level",
    name: "Sound Sensor",
    sensor_chip: "Sound sensor module (analog/digital mic)",
    category: "Sensing",
    metric_key: "sound_level",
    unit: "dB (rel)",
    warn_above: 70,
    crit_above: 85,
    author: "nodeframe-core",
    installed: true,
    target_slot: "A1",
    description: "Installed in slot A1, running now.",
  },
  {
    slug: "ambient-light",
    name: "Light / Color Sensor",
    sensor_chip: "TCS34725 (RGB color + ambient light)",
    category: "Sensing",
    metric_key: "lux",
    unit: "lux",
    warn_above: 900,
    crit_above: 1200,
    author: "nodeframe-core",
    installed: true,
    target_slot: "A2",
    description: "Installed in slot A2, running now.",
  },
  {
    slug: "temperature",
    name: "Temperature",
    sensor_chip: "Digital temperature probe",
    category: "Sensing",
    metric_key: "temperature",
    unit: "°C",
    warn_above: 29,
    crit_above: 33,
    author: "nodeframe-core",
    installed: true,
    target_slot: "A3",
    description: "Installed in slot A3, running now.",
  },
  {
    slug: "proximity",
    name: "Proximity",
    sensor_chip: "HC-SR04 (Ultrasonic)",
    category: "Sensing",
    metric_key: "distance_cm",
    unit: "cm",
    warn_below: 30,
    crit_below: 12,
    author: "nodeframe-core",
    installed: true,
    target_slot: "A4",
    description: "Installed in slot A4, running now.",
  },
  {
    slug: "gas-level",
    name: "Gas Level",
    sensor_chip: "MQ-6 (LPG/Propane)",
    category: "Safety",
    metric_key: "gas_ppm",
    unit: "ppm",
    warn_above: 400,
    crit_above: 650,
    author: "nodeframe-core",
    installed: false,
    target_slot: "B1",
    description: "MQ-6 gas sensor plugin — detects LPG/propane in ppm.",
  },
  {
    slug: "access-control",
    name: "Access Control",
    sensor_chip: "MFRC522 RFID",
    category: "Security",
    metric_key: null,
    unit: null,
    author: "nodeframe-core",
    installed: false,
    target_slot: "B2",
    description: "MFRC522 RFID reader plugin — badge-in/badge-out logging.",
  },
  {
    slug: "vibration",
    name: "Vibration",
    sensor_chip: "ADXL345 (accelerometer)",
    category: "Mechanical",
    metric_key: "vibration_g",
    unit: "g (RMS)",
    warn_above: 0.18,
    crit_above: 0.3,
    author: "nodeframe-core",
    installed: false,
    target_slot: "B3",
    description: "3-axis accelerometer plugin for RMS vibration monitoring.",
  },
  {
    slug: "soil-moisture",
    name: "Soil Moisture",
    sensor_chip: "Capacitive probe",
    category: "Environmental",
    metric_key: "soil_pct",
    unit: "%",
    warn_below: 18,
    crit_below: 8,
    author: "nodeframe-core",
    installed: false,
    target_slot: "C1",
    description: "Capacitive soil-moisture plugin.",
  },
];

const MODULES = [
  {
    id: "mod-sound-01",
    plugin_slug: "sound-level",
    label: "Sound Sensor",
    slot: "A1",
    status: "warning",
    connected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "mod-light-01",
    plugin_slug: "ambient-light",
    label: "Light / Color Sensor",
    slot: "A2",
    status: "good",
    connected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "mod-temp-01",
    plugin_slug: "temperature",
    label: "Temperature",
    slot: "A3",
    status: "good",
    connected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "mod-proximity-01",
    plugin_slug: "proximity",
    label: "Proximity",
    slot: "A4",
    status: "good",
    connected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

async function seed() {
  console.log("1. Deleting existing readings...");
  await api("readings?id=gt.0", "DELETE");

  console.log("2. Deleting existing events...");
  await api("events?id=gt.0", "DELETE");

  console.log("3. Deleting existing modules...");
  await api("modules?id=neq.0", "DELETE");

  console.log("4. Deleting basic-sensor plugin...");
  try {
    await api("plugins?slug=eq.basic-sensor", "DELETE");
  } catch (e) {}

  console.log("5. Upserting canonical plugins...");
  for (const p of PLUGINS) {
    await api("plugins", "POST", p);
  }

  console.log("6. Inserting modules...");
  await api("modules", "POST", MODULES);

  console.log("7. Generating current readings...");
  const now = new Date().toISOString();
  const readings = [
    {
      module_id: "mod-sound-01",
      metric_key: "sound_level",
      value: 71.0,
      unit: "dB (rel)",
      recorded_at: now,
    },
    {
      module_id: "mod-light-01",
      metric_key: "lux",
      value: 420.0,
      unit: "lux",
      recorded_at: now,
    },
    {
      module_id: "mod-temp-01",
      metric_key: "temperature",
      value: 24.5,
      unit: "°C",
      recorded_at: now,
    },
    {
      module_id: "mod-proximity-01",
      metric_key: "distance_cm",
      value: 57.3,
      unit: "cm",
      recorded_at: now,
    },
  ];

  await api("readings", "POST", readings);
  console.log(`Successfully inserted ${readings.length} current readings!`);

  console.log("8. Inserting initial events...");
  const events = [
    {
      module_id: "mod-sound-01",
      event_type: "threshold_warning",
      severity: "warning",
      message: "Sound level exceeded warning threshold (71 dB > 70 dB)",
      created_at: new Date(Date.now() - 300000).toISOString(),
    },
    {
      module_id: null,
      event_type: "system_boot",
      severity: "info",
      message: "Nodeframe Core v2.4.1 initialized. 4/8 slots occupied.",
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];
  await api("events", "POST", events);
  console.log("Supabase database successfully resynced and aligned!");
}

seed().catch(console.error);
