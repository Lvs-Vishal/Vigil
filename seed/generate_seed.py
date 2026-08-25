#!/usr/bin/env python3
"""
Nodeframe seed data generator — v2, matched to the real hackathon build.

Honesty constraints this version enforces (previous version overclaimed):
  - `modules` contains ONLY the sensors physically wired to the ESP32 today
    (4 of them, power-budget-limited). No fabricated "community" authors, no
    fabricated install counts anywhere.
  - `marketplace` lists those same 4 PLUS 4 more plugin manifests the team
    has already written but not physically built yet ("not installed") —
    proving the "any sensor" claim with real, inspectable manifests instead
    of marketplace-install-count theater.
  - Two of the four real sensors run a genuine drift/anomaly story so the
    AI-insights feature (Ollama-backed) has real signal to reason about:
    Temperature climbing toward its warning band (predictive "overheating"
    story) and Sound Sensor holding a sustained elevated/irregular plateau
    (predictive "mechanical wear" story).

Produces seed_data.json, schema.sql-compatible seed_inserts.sql (via the
sibling generate_inserts.py), unchanged in shape from before.
"""
import json
import math
import random
from datetime import datetime, timedelta, timezone

random.seed(7)

NOW = datetime(2026, 8, 22, 14, 50, 0, tzinfo=timezone.utc)
POINTS = 60
INTERVAL_MIN = 2  # one sample every 2 minutes -> 2 hour window

# ---------------------------------------------------------------------------
# The 4 sensors actually wired to the ESP32 for the demo (power-budget caps
# it at 4 of the ~6 the team has on hand).
# ---------------------------------------------------------------------------
MODULES = [
    {
        "id": "mod-sound-01",
        "slug": "sound-level",
        "label": "Sound Sensor",
        "slot": "A1",
        "sensor_chip": "Sound sensor module (analog/digital mic)",
        "metric_key": "sound_level",
        "unit": "dB (rel)",
        "base": 52, "amp": 6, "noise": 2.5, "period_min": 22,
        "warn_above": 70, "crit_above": 85,  # 85 dB(A) is the common 8h occupational exposure line
        # sustained elevated + irregular plateau in the last ~28 min: a real
        # "something's wrong and it hasn't stopped" story, not a single blip
        "plateau_last_n": 14, "plateau_level": 76, "plateau_noise": 4.5,
        "author": "nodeframe-core",
    },
    {
        "id": "mod-light-01",
        "slug": "ambient-light",
        "label": "Light / Color Sensor",
        "slot": "A2",
        "sensor_chip": "TCS34725 (RGB color + ambient light)",
        "metric_key": "lux",
        "unit": "lux",
        "base": 340, "amp": 180, "noise": 25, "period_min": 60,
        "warn_above": 900, "crit_above": 1200,
        "author": "nodeframe-core",
    },
    {
        "id": "mod-temp-01",
        "slug": "temperature",
        "label": "Temperature",
        "slot": "A3",
        "sensor_chip": "Digital temperature probe",
        "metric_key": "temperature",
        "unit": "°C",
        "base": 24.5, "amp": 1.6, "noise": 0.3, "period_min": 40,
        "warn_above": 29, "crit_above": 33,
        # climbing steadily toward (but not yet past) critical — the
        # "catch it before it breaks" predictive story
        "drift_last_n": 22, "drift_target": 30.8,
        "author": "nodeframe-core",
    },
    {
        "id": "mod-proximity-01",
        "slug": "proximity",
        "label": "Proximity",
        "slot": "A4",
        "sensor_chip": "HC-SR04 (Ultrasonic)",
        "metric_key": "distance_cm",
        "unit": "cm",
        "base": 145, "amp": 60, "noise": 8, "period_min": 20,
        "warn_below": 30, "crit_below": 12,
        "author": "nodeframe-core",
    },
]

# ---------------------------------------------------------------------------
# Plugin manifests the team has already written but has NOT physically
# built today (lab has the parts; ESP32 power budget only covers 4 at once).
# Same author as the installed ones — there is no separate "community" tier
# to invent, so we don't.
# ---------------------------------------------------------------------------
NOT_INSTALLED = [
    {
        "slug": "gas-level", "name": "Gas Level", "sensor_chip": "MQ-6 (LPG/Propane)",
        "category": "Safety", "slot": "B1",
        "metric_key": "gas_ppm", "unit": "ppm",
        "thresholds": {"warn_above": 400, "crit_above": 650},
        "description": "MQ-6 gas sensor plugin, manifest already written — installs the moment the power budget or a second core frees up a slot. Detects LPG/propane in ppm with a configurable safety-relay cutoff.",
    },
    {
        "slug": "access-control", "name": "Access Control", "sensor_chip": "MFRC522 RFID",
        "category": "Security", "slot": "B2",
        "metric_key": None, "unit": None, "thresholds": {},
        "description": "MFRC522 RFID reader plugin — badge-in/badge-out logging with an authorized-list check, same as the original build. Event-based rather than a continuous reading. Ready to seat in slot B2.",
    },
    {
        "slug": "vibration", "name": "Vibration", "sensor_chip": "ADXL345 (accelerometer)",
        "category": "Mechanical", "slot": "B3",
        "metric_key": "vibration_g", "unit": "g (RMS)",
        "thresholds": {"warn_above": 0.18, "crit_above": 0.30},
        "description": "3-axis accelerometer plugin for RMS vibration monitoring — complements the Sound Sensor's acoustic signal with a mechanical one for the same fault class.",
    },
    {
        "slug": "soil-moisture", "name": "Soil Moisture", "sensor_chip": "Capacitive probe",
        "category": "Environmental", "slot": "C1",
        "metric_key": "soil_pct", "unit": "%",
        "thresholds": {"warn_below": 18, "crit_below": 8},
        "description": "Capacitive soil-moisture plugin — proves the plugin format isn't industrial-only; same manifest shape, completely different domain.",
    },
]

# ---------------------------------------------------------------------------
# Time-series generation
# ---------------------------------------------------------------------------
def gen_series(mod):
    pts = []
    for i in range(POINTS):
        t = NOW - timedelta(minutes=INTERVAL_MIN * (POINTS - 1 - i))
        phase = 2 * math.pi * (i / max(1, mod["period_min"] / INTERVAL_MIN))
        val = mod["base"] + mod["amp"] * math.sin(phase) + random.gauss(0, mod["noise"])

        drift_n = mod.get("drift_last_n")
        if drift_n and i >= POINTS - drift_n:
            progress = (i - (POINTS - drift_n)) / (drift_n - 1)
            val = val * (1 - progress) + mod["drift_target"] * progress + random.gauss(0, mod["noise"] * 0.4)

        plateau_n = mod.get("plateau_last_n")
        if plateau_n and i >= POINTS - plateau_n:
            val = mod["plateau_level"] + random.gauss(0, mod["plateau_noise"])
            # once elevated, it stays at/above the warning line — no dipping
            # back under mid-plateau, or the "sustained" story breaks
            floor = mod.get("warn_above", mod["plateau_level"]) + 1
            val = max(val, floor)

        val = round(val, 2)
        pts.append({"t": t.strftime("%Y-%m-%dT%H:%M:00Z"), "v": val})
    return pts

def status_for(mod, latest):
    if "crit_above" in mod and latest >= mod["crit_above"]:
        return "critical"
    if "warn_above" in mod and latest >= mod["warn_above"]:
        return "warning"
    if "crit_below" in mod and latest <= mod["crit_below"]:
        return "critical"
    if "warn_below" in mod and latest <= mod["warn_below"]:
        return "warning"
    return "good"

modules_out = []
for mod in MODULES:
    series = gen_series(mod)
    latest = series[-1]["v"]
    modules_out.append({
        "id": mod["id"], "slug": mod["slug"], "label": mod["label"], "slot": mod["slot"],
        "sensor_chip": mod["sensor_chip"], "metric_key": mod["metric_key"], "unit": mod["unit"],
        "author": mod["author"],
        "thresholds": {k: mod[k] for k in ("warn_above", "crit_above", "warn_below", "crit_below") if k in mod},
        "status": status_for(mod, latest),
        "latest": latest,
        "series": series,
        "connected_at": (NOW - timedelta(days=random.randint(1, 5))).strftime("%Y-%m-%dT%H:%M:00Z"),
    })

# ---------------------------------------------------------------------------
# System event log — only real events: the two live stories above, plus
# ordinary connect/firmware housekeeping. No RFID scans (that module isn't
# installed), no fabricated "installs" from outside users.
# ---------------------------------------------------------------------------
temp_mod = next(m for m in modules_out if m["slug"] == "temperature")
sound_mod = next(m for m in modules_out if m["slug"] == "sound-level")
temp_drift_start_t = NOW - timedelta(minutes=INTERVAL_MIN * MODULES[2]["drift_last_n"])
sound_plateau_start_t = NOW - timedelta(minutes=INTERVAL_MIN * MODULES[0]["plateau_last_n"])

events = [
    {"t": (NOW - timedelta(minutes=6)).strftime("%Y-%m-%dT%H:%M:00Z"), "type": "threshold",
     "severity": "warning", "module": "Temperature",
     "message": f"Temperature crossed its 29°C warning threshold (now {temp_mod['latest']}°C) and is still climbing."},
    {"t": temp_drift_start_t.strftime("%Y-%m-%dT%H:%M:00Z"), "type": "trend",
     "severity": "info", "module": "Temperature",
     "message": "Steady upward drift detected — began roughly 44 minutes before crossing the warning line."},
    {"t": (NOW - timedelta(minutes=4)).strftime("%Y-%m-%dT%H:%M:00Z"), "type": "threshold",
     "severity": "warning", "module": "Sound Sensor",
     "message": f"Sound level has held at an elevated, irregular plateau (~{sound_mod['latest']} dB rel) for over 25 minutes."},
    {"t": sound_plateau_start_t.strftime("%Y-%m-%dT%H:%M:00Z"), "type": "trend",
     "severity": "info", "module": "Sound Sensor",
     "message": "Acoustic signature shifted from steady ambient noise to a sustained elevated plateau."},
    {"t": (NOW - timedelta(hours=1, minutes=5)).strftime("%Y-%m-%dT%H:%M:00Z"), "type": "connect",
     "severity": "info", "module": "Proximity",
     "message": "Module hot-plugged into slot A4 — manifest read, driver loaded, no reboot required."},
    {"t": (NOW - timedelta(hours=3, minutes=20)).strftime("%Y-%m-%dT%H:%M:00Z"), "type": "firmware",
     "severity": "info", "module": "Core Hub",
     "message": "Core firmware updated to v2.4.1 (plugin ABI unchanged, all modules stayed online)."},
]
events.sort(key=lambda e: e["t"], reverse=True)

# ---------------------------------------------------------------------------
# Assemble
# ---------------------------------------------------------------------------
marketplace = [
    {
        "slug": m["slug"], "name": m["label"], "sensor_chip": m["sensor_chip"],
        "category": "Sensing", "author": m["author"], "installed": True,
        "description": f"Installed in slot {m['slot']}, running now.",
        "metric_key": m["metric_key"], "unit": m["unit"], "thresholds": m["thresholds"],
    }
    for m in modules_out
] + [
    {
        "slug": e["slug"], "name": e["name"], "sensor_chip": e["sensor_chip"],
        "category": e["category"], "author": "nodeframe-core", "installed": False,
        "description": e["description"], "target_slot": e["slot"],
        "metric_key": e["metric_key"], "unit": e["unit"], "thresholds": e["thresholds"],
    }
    for e in NOT_INSTALLED
]

seed = {
    "generated_at": NOW.strftime("%Y-%m-%dT%H:%M:00Z"),
    "core": {
        "name": "Nodeframe Core Hub",
        "firmware": "v2.4.1",
        "uptime_hours": 6,  # honest: this is a hackathon build, not a 9-day-uptime deployment
        "slots_total": 8,
        "slots_used": len(MODULES),
    },
    "modules": modules_out,
    "events": events,
    "marketplace": marketplace,
}

with open("seed_data.json", "w") as f:
    json.dump(seed, f, indent=2)

print(f"wrote seed_data.json — {len(modules_out)} installed modules, {len(events)} events, "
      f"{len(marketplace)} marketplace entries ({len(MODULES)} installed / {len(NOT_INSTALLED)} not installed)")
