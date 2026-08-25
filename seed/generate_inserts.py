#!/usr/bin/env python3
"""Turn seed_data.json into seed_inserts.sql matching schema.sql (v2)."""
import json

with open("seed_data.json") as f:
    seed = json.load(f)


def esc(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def num(n):
    return "null" if n is None else str(n)


out = ["-- Nodeframe demo seed data — generated from seed_data.json, run after schema.sql",
       "begin;", ""]

# --- plugins (all 8: 4 installed + 4 not-yet-built) ----------------------
out.append("insert into public.plugins\n"
            "  (slug, name, sensor_chip, category, metric_key, unit, warn_above, crit_above,\n"
            "   warn_below, crit_below, author, installed, target_slot, description)\nvalues")
rows = []
for m in seed["marketplace"]:
    th = m.get("thresholds") or {}
    src = next((x for x in seed["modules"] if x["slug"] == m["slug"]), None)
    target_slot = src["slot"] if src else m.get("target_slot")
    rows.append(
        "  (" + ", ".join([
            esc(m["slug"]), esc(m["name"]), esc(m.get("sensor_chip")), esc(m.get("category", "Sensing")),
            esc(m.get("metric_key")), esc(m.get("unit")),
            num(th.get("warn_above")), num(th.get("crit_above")), num(th.get("warn_below")), num(th.get("crit_below")),
            esc(m["author"]), str(m["installed"]).lower(), esc(target_slot), esc(m.get("description")),
        ]) + ")"
    )
out.append(",\n".join(rows) + ";\n")

# --- modules (installed only) --------------------------------------------
out.append("-- one row per physical sensor currently plugged into the core")
out.append("insert into public.modules (id, plugin_slug, label, slot, status, connected_at) values")
rows = []
for m in seed["modules"]:
    rows.append(
        f"  ({esc(m['id'])}, {esc(m['slug'])}, {esc(m['label'])}, {esc(m['slot'])}, "
        f"{esc(m.get('status', 'good'))}, {esc(m['connected_at'])}::timestamptz)"
    )
out.append(",\n".join(rows) + ";\n")

# --- readings (full sampled time series for each installed module) -------
out.append("-- readings: full sampled time series per installed module")
out.append("insert into public.readings (module_id, metric_key, value, unit, recorded_at) values")
rows = []
for m in seed["modules"]:
    for p in m.get("series", []):
        rows.append(f"  ({esc(m['id'])}, {esc(m['metric_key'])}, {p['v']}, {esc(m['unit'])}, {esc(p['t'])}::timestamptz)")
out.append(",\n".join(rows) + ";\n")

# --- events ----------------------------------------------------------------
out.append("-- events: threshold/trend/connect/firmware events")
out.append("insert into public.events (module_id, event_type, severity, message, meta, created_at) values")
rows = []
for e in seed["events"]:
    mod = next((m for m in seed["modules"] if m["label"] == e["module"]), None)
    mod_id = esc(mod["id"]) if mod else "null"
    rows.append(f"  ({mod_id}, {esc(e['type'])}, {esc(e['severity'])}, {esc(e['message'])}, '{{}}'::jsonb, {esc(e['t'])}::timestamptz)")
out.append(",\n".join(rows) + ";\n")

out.append("commit;")

with open("seed_inserts.sql", "w") as f:
    f.write("\n".join(out))

print("wrote seed_inserts.sql")
