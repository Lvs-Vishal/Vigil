"use client";

import { useState } from "react";
import { AiWiringGuide } from "./ai-wiring-guide";
import { supabaseClient } from "@/lib/supabase";
import { seed } from "@/lib/data";

// ── Sensor catalogue ─────────────────────────────────────────────────────────

export type SensorId = "dht11" | "mq6" | "hcsr04" | "tcs34725" | "mfrc522";
export type BoardId = "devkitv1" | "wroom32u" | "s3mini";

const MAX_SENSORS = 5;

interface SensorDef {
  id: SensorId;
  label: string;
  chip: string;
  iface: string;
  description: string;
  icon: string; // emoji placeholder — keeps zero image deps
}

const SENSORS: SensorDef[] = [
  {
    id: "dht11",
    label: "Temperature & Humidity",
    chip: "DHT11",
    iface: "1-Wire",
    description: "Measures ambient temperature (0–50°C) and relative humidity (20–80% RH). Single-wire protocol, 1 GPIO.",
    icon: "🌡️",
  },
  {
    id: "mq6",
    label: "LPG / Gas Detector",
    chip: "MQ-6",
    iface: "Analog",
    description: "Detects LPG, butane, and propane concentrations. Analog output requires ADC1 pin (Wi-Fi compatible).",
    icon: "💨",
  },
  {
    id: "hcsr04",
    label: "Ultrasonic Distance",
    chip: "HC-SR04",
    iface: "Digital",
    description: "Measures distance 2–400cm with ±3mm accuracy via ultrasonic pulses. Needs TRIG + ECHO (2 GPIOs).",
    icon: "📡",
  },
  {
    id: "tcs34725",
    label: "Color / Light Sensor",
    chip: "TCS34725",
    iface: "I2C",
    description: "Detects RGB color and ambient lux. Shared I2C bus (SDA=21, SCL=22). IR filter for accurate readings.",
    icon: "🎨",
  },
  {
    id: "mfrc522",
    label: "RFID Reader",
    chip: "MFRC522",
    iface: "SPI",
    description: "13.56MHz contactless RFID — reads Mifare Classic, Mifare Ultralight, and NTAG chips via SPI bus.",
    icon: "📶",
  },
];

interface BoardDef {
  id: BoardId;
  label: string;
  subtitle: string;
}

const BOARDS: BoardDef[] = [
  { id: "devkitv1", label: "ESP32 DevKit V1", subtitle: "Standard 30-pin breadboard form factor" },
  { id: "wroom32u", label: "ESP32-WROOM-32U", subtitle: "External antenna connector, compact PCB" },
  { id: "s3mini", label: "ESP32-S3-Mini", subtitle: "Dual-core Xtensa, USB-C, more GPIOs" },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function BoardCard({
  board,
  selected,
  onSelect,
}: {
  board: BoardDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1 rounded-[10px] border px-4 py-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
        selected
          ? "border-teal/60 bg-teal/8 shadow-[0_0_0_1px_rgba(43,214,164,0.3)]"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-2"
      }`}
    >
      <span className={`font-mono text-[13px] font-semibold ${selected ? "text-teal" : "text-ink"}`}>
        {board.label}
      </span>
      <span className="text-[11.5px] text-ink-muted">{board.subtitle}</span>
    </button>
  );
}

function SensorCard({
  sensor,
  selected,
  disabled,
  onToggle,
}: {
  sensor: SensorDef;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={`relative flex flex-col gap-2 rounded-[10px] border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper ${
        selected
          ? "border-copper/60 bg-copper/8 shadow-[0_0_0_1px_rgba(217,122,63,0.25)]"
          : disabled
            ? "cursor-not-allowed border-border bg-surface opacity-40"
            : "border-border bg-surface hover:border-border-strong hover:bg-surface-2"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-copper text-[9px] text-plane font-bold">
          ✓
        </span>
      )}
      <span className="text-[20px] leading-none" aria-hidden="true">{sensor.icon}</span>
      <div>
        <div className={`text-[13px] font-semibold ${selected ? "text-copper-strong" : "text-ink"}`}>
          {sensor.label}
        </div>
        <div className="mt-0.5 flex gap-2">
          <span className="font-mono text-[10px] text-ink-muted">{sensor.chip}</span>
          <span className="rounded-full border border-border-strong px-1.5 py-px font-mono text-[9.5px] tracking-[0.04em] text-ink-muted uppercase">
            {sensor.iface}
          </span>
        </div>
      </div>
      <p className="text-[11.5px] leading-[1.45] text-ink-muted">{sensor.description}</p>
    </button>
  );
}

// ── Main HubBuilder component ─────────────────────────────────────────────────

export function HubBuilder() {
  const [board, setBoard] = useState<BoardId>("devkitv1");
  const [selected, setSelected] = useState<SensorId[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  function toggleSensor(id: SensorId) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SENSORS) return prev;
      return [...prev, id];
    });
    // Collapse guide on any selection change — user must re-generate.
    setShowGuide(false);
  }

  // Map HubBuilder sensor IDs to seed-data plugin slugs
  const SENSOR_TO_SLUG: Record<SensorId, string> = {
    dht11: "temperature",
    mq6: "gas-level",
    hcsr04: "proximity",
    tcs34725: "ambient-light",
    mfrc522: "access-control",
  };

  async function handleGenerate() {
    setShowGuide(true);
    // Scroll to guide after a paint frame.
    requestAnimationFrame(() => {
      document.getElementById("wiring-guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Generate fake data in Supabase if connected
    if (supabaseClient) {
      try {
        // Clear old modules (this cascades to readings and events if DB setup properly, or we can just delete modules)
        await supabaseClient.from("modules").delete().neq("id", "0");
        
        const nowMs = Date.now();
        const modulesToInsert = selected.map((sId, index) => {
          const pluginSlug = SENSOR_TO_SLUG[sId];
          const plugin = seed.marketplace.find((p) => p.slug === pluginSlug);
          return {
            id: `mod-${pluginSlug}-${nowMs}`,
            plugin_slug: pluginSlug,
            label: plugin?.name || pluginSlug,
            slot: `A${index + 1}`,
            status: "good",
            connected_at: new Date().toISOString(),
          };
        });

        if (modulesToInsert.length > 0) {
          await supabaseClient.from("modules").insert(modulesToInsert);

          // Generate fake historical readings (last 30 minutes, 1 per minute)
          const readingsToInsert: any[] = [];
          for (const mod of modulesToInsert) {
            let baseValue = 50;
            if (mod.plugin_slug === "temperature") baseValue = 25;
            if (mod.plugin_slug === "ambient-light") baseValue = 400;
            if (mod.plugin_slug === "gas-level") baseValue = 150;
            if (mod.plugin_slug === "proximity") baseValue = 80;
            
            for (let i = 30; i >= 0; i--) {
              const noise = (Math.random() - 0.5) * (baseValue * 0.1);
              readingsToInsert.push({
                module_id: mod.id,
                value: baseValue + noise,
                recorded_at: new Date(nowMs - i * 60000).toISOString(),
              });
            }
          }
          await supabaseClient.from("readings").insert(readingsToInsert);
        }
      } catch (err) {
        console.warn("Failed to push hub builder config to Supabase", err);
      }
    }
  }

  return (
    <section id="hub-builder" className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-copper">
            {"// Hub Builder"}
          </p>
          <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Design your tailor-made hub.
          </h2>
          <p className="mt-3 text-ink-secondary">
            Pick your base board and snap in up to {MAX_SENSORS} sensors. Get exact GPIO wiring instructions — no strapping
            pins, no conflicts.
          </p>
        </div>

        {/* Step 1 — Board */}
        <div className="mb-10">
          <h3 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">
            Step 1 — Choose base board
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BOARDS.map((b) => (
              <BoardCard key={b.id} board={b} selected={board === b.id} onSelect={() => setBoard(b.id)} />
            ))}
          </div>
        </div>

        {/* Step 2 — Sensors */}
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Step 2 — Select sensors
            </h3>
            <span className="font-mono text-[11px] text-ink-muted">
              {selected.length} / {MAX_SENSORS} selected
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => { setSelected([]); setShowGuide(false); }}
                className="ml-auto font-mono text-[11px] text-ink-muted underline underline-offset-2 hover:text-ink transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SENSORS.map((s) => (
              <SensorCard
                key={s.id}
                sensor={s}
                selected={selected.includes(s.id)}
                disabled={selected.length >= MAX_SENSORS}
                onToggle={() => toggleSensor(s.id)}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selected.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-copper bg-copper px-5 py-3 font-mono text-sm font-medium text-plane transition-colors hover:border-copper-strong hover:bg-copper-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✨ Generate Wiring Guide
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {selected.length > 0 && !showGuide && (
            <span className="font-mono text-[12px] text-ink-muted">
              {selected.length} sensor{selected.length !== 1 ? "s" : ""} ready
            </span>
          )}
        </div>

        {/* Wiring Guide */}
        {showGuide && <AiWiringGuide selectedSensors={selected} />}
      </div>
    </section>
  );
}
