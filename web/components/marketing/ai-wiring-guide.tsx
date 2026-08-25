"use client";

// AiWiringGuide — deterministic, hardware-safe pin assignment engine.
//
// SAFETY RULES (enforced in code, not just docs):
//   Forbidden inputs:  GPIO  0,  2,  5, 12, 15  (ESP32 strapping pins)
//   Forbidden outputs: GPIO 34, 35, 36, 39       (input-only ADC pins)
//   I2C bus:           SDA=21, SCL=22            (always fixed, shared)
//   SPI bus (MFRC522): MOSI=23, MISO=19, SCK=18, SS=4
//   DHT11 (1-wire):    first available from safe single-wire pool
//   HC-SR04 (2 pins):  TRIG + ECHO from safe digital pool
//   MQ-6 (analog):     first available from safe ADC pool

import type { SensorId } from "./hub-builder";

// ── Pin pool definitions ─────────────────────────────────────────────────────
// All pools exclude strapping pins (0, 2, 5, 12, 15) and input-only pins
// (34, 35, 36, 39). Ordered preference: most reliable GPIOs first.
const STRAPPING_PINS = new Set([0, 2, 5, 12, 15]);
const INPUT_ONLY_PINS = new Set([34, 35, 36, 39]);

// Safe general-purpose digital GPIOs (not SPI/I2C reserved):
const SAFE_DIGITAL_POOL = [4, 13, 14, 16, 17, 25, 26, 27, 32, 33];

// Safe analog-capable pins (ADC1 — reliably works alongside Wi-Fi):
const SAFE_ADC_POOL = [32, 33, 25, 26];

// Validate all pools at module load time — catches future refactors.
function assertSafe(pool: number[], name: string) {
  for (const pin of pool) {
    if (STRAPPING_PINS.has(pin)) throw new Error(`${name}: pin ${pin} is a strapping pin`);
    if (INPUT_ONLY_PINS.has(pin)) throw new Error(`${name}: pin ${pin} is input-only`);
  }
}
assertSafe(SAFE_DIGITAL_POOL, "SAFE_DIGITAL_POOL");
assertSafe(SAFE_ADC_POOL, "SAFE_ADC_POOL");

// ── Types ────────────────────────────────────────────────────────────────────

export interface WireRow {
  sensorPin: string;   // e.g. "DATA", "TRIG", "SDA"
  esp32Pin: number;    // GPIO number
  wire: string;        // suggested wire color
  note: string;
}

export interface SensorWiring {
  sensorId: SensorId;
  sensorLabel: string;
  interface: string;   // "I2C", "SPI", "1-Wire Digital", "Digital", "Analog"
  rows: WireRow[];
  powerRows: WireRow[];
}

// ── Pin allocator ────────────────────────────────────────────────────────────
// Tracks which GPIO numbers have already been assigned so no two sensors
// share a signal pin.

function makeAllocator() {
  const used = new Set<number>();

  function take(pool: number[]): number {
    for (const pin of pool) {
      if (!used.has(pin)) {
        used.add(pin);
        return pin;
      }
    }
    throw new Error("Pin pool exhausted — too many sensors selected.");
  }

  return { take, used };
}

// ── Per-sensor wiring builders ───────────────────────────────────────────────

function buildDht11(alloc: ReturnType<typeof makeAllocator>): SensorWiring {
  const dataPin = alloc.take(SAFE_DIGITAL_POOL);
  return {
    sensorId: "dht11",
    sensorLabel: "DHT11 (Temp & Humidity)",
    interface: "1-Wire Digital",
    rows: [
      { sensorPin: "DATA", esp32Pin: dataPin, wire: "Yellow", note: "Add a 10kΩ pull-up to 3.3V on this line" },
    ],
    powerRows: [
      { sensorPin: "VCC", esp32Pin: 3300, wire: "Red", note: "3.3V rail" },
      { sensorPin: "GND", esp32Pin: 0, wire: "Black", note: "Any GND pin" },
    ],
  };
}

function buildMq6(alloc: ReturnType<typeof makeAllocator>): SensorWiring {
  const aoPin = alloc.take(SAFE_ADC_POOL);
  return {
    sensorId: "mq6",
    sensorLabel: "MQ-6 (LPG / Gas Sensor)",
    interface: "Analog",
    rows: [
      { sensorPin: "AO (Analog Out)", esp32Pin: aoPin, wire: "Yellow", note: "ADC1 channel — reads 0–3.3V" },
    ],
    powerRows: [
      { sensorPin: "VCC", esp32Pin: 5000, wire: "Red", note: "5V rail (heater requires 5V)" },
      { sensorPin: "GND", esp32Pin: 0, wire: "Black", note: "Any GND pin" },
    ],
  };
}

function buildHcSr04(alloc: ReturnType<typeof makeAllocator>): SensorWiring {
  const trigPin = alloc.take(SAFE_DIGITAL_POOL);
  const echoPin = alloc.take(SAFE_DIGITAL_POOL);
  return {
    sensorId: "hcsr04",
    sensorLabel: "HC-SR04 (Ultrasonic Distance)",
    interface: "Digital (2-pin)",
    rows: [
      { sensorPin: "TRIG", esp32Pin: trigPin, wire: "Blue", note: "Output from ESP32 → sensor" },
      { sensorPin: "ECHO", esp32Pin: echoPin, wire: "Green", note: "Input to ESP32 · Add 1kΩ+2kΩ voltage divider — HC-SR04 outputs 5V logic" },
    ],
    powerRows: [
      { sensorPin: "VCC", esp32Pin: 5000, wire: "Red", note: "5V rail" },
      { sensorPin: "GND", esp32Pin: 0, wire: "Black", note: "Any GND pin" },
    ],
  };
}

function buildTcs34725(): SensorWiring {
  // I2C is always SDA=21, SCL=22 — fixed, shared bus, no allocation needed.
  return {
    sensorId: "tcs34725",
    sensorLabel: "TCS34725 (Color Sensor)",
    interface: "I2C",
    rows: [
      { sensorPin: "SDA", esp32Pin: 21, wire: "Yellow", note: "Shared I2C bus — connect all I2C sensors here" },
      { sensorPin: "SCL", esp32Pin: 22, wire: "White", note: "Shared I2C bus — connect all I2C sensors here" },
    ],
    powerRows: [
      { sensorPin: "VCC", esp32Pin: 3300, wire: "Red", note: "3.3V rail" },
      { sensorPin: "GND", esp32Pin: 0, wire: "Black", note: "Any GND pin" },
    ],
  };
}

function buildMfrc522(): SensorWiring {
  // SPI bus — fixed hardware pins on ESP32: MOSI=23, MISO=19, SCK=18.
  // SS (Slave Select) uses GPIO 4 from the safe pool — hardcoded here
  // because SPI requires consistent SS across firmware and wiring guide.
  return {
    sensorId: "mfrc522",
    sensorLabel: "MFRC522 (RFID Reader)",
    interface: "SPI",
    rows: [
      { sensorPin: "SDA/SS",  esp32Pin: 4,  wire: "Orange", note: "Slave Select — one per SPI device" },
      { sensorPin: "SCK",     esp32Pin: 18, wire: "White",  note: "SPI clock — shared bus" },
      { sensorPin: "MOSI",    esp32Pin: 23, wire: "Blue",   note: "Master Out Slave In — shared bus" },
      { sensorPin: "MISO",    esp32Pin: 19, wire: "Green",  note: "Master In Slave Out — shared bus" },
      { sensorPin: "RST",     esp32Pin: 27, wire: "Purple", note: "Reset — any safe digital GPIO" },
    ],
    powerRows: [
      { sensorPin: "3.3V", esp32Pin: 3300, wire: "Red",   note: "3.3V rail — do NOT connect to 5V" },
      { sensorPin: "GND",  esp32Pin: 0,    wire: "Black", note: "Any GND pin" },
    ],
  };
}

// ── Public assignment function ───────────────────────────────────────────────

export function assignPins(selectedSensors: SensorId[]): SensorWiring[] {
  const alloc = makeAllocator();

  // Reserve SPI pins upfront if MFRC522 is selected, so other sensors
  // don't accidentally claim GPIO 18, 19, 23.
  if (selectedSensors.includes("mfrc522")) {
    alloc.used.add(18); // SCK
    alloc.used.add(19); // MISO
    alloc.used.add(23); // MOSI
    alloc.used.add(27); // RST
  }

  // Reserve I2C pins if TCS34725 is selected.
  if (selectedSensors.includes("tcs34725")) {
    alloc.used.add(21); // SDA
    alloc.used.add(22); // SCL
  }

  const results: SensorWiring[] = [];

  for (const id of selectedSensors) {
    switch (id) {
      case "dht11":   results.push(buildDht11(alloc));   break;
      case "mq6":     results.push(buildMq6(alloc));     break;
      case "hcsr04":  results.push(buildHcSr04(alloc));  break;
      case "tcs34725": results.push(buildTcs34725());    break;
      case "mfrc522": results.push(buildMfrc522());      break;
    }
  }

  return results;
}

// ── Wire color dot ───────────────────────────────────────────────────────────

const WIRE_COLORS: Record<string, string> = {
  Red: "#e25454",
  Black: "#555",
  Yellow: "#f0b429",
  Green: "#35c26b",
  Blue: "#3987e5",
  White: "#d6d6d6",
  Orange: "#d97a3f",
  Purple: "#9085e9",
};

function WireDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 flex-none rounded-full border border-border-strong"
      style={{ background: WIRE_COLORS[color] ?? "#888" }}
      aria-hidden="true"
    />
  );
}

// ── Sensor wiring table ──────────────────────────────────────────────────────

function PinTable({ rows, ispower }: { rows: WireRow[]; ispower?: boolean }) {
  return (
    <table className="w-full text-left text-[12px]">
      <thead>
        <tr className="border-b border-border">
          <th className="pb-1.5 pr-4 font-mono text-[10px] font-medium tracking-[0.06em] text-ink-muted uppercase">
            Sensor Pin
          </th>
          <th className="pb-1.5 pr-4 font-mono text-[10px] font-medium tracking-[0.06em] text-ink-muted uppercase">
            {ispower ? "Rail" : "ESP32 GPIO"}
          </th>
          <th className="pb-1.5 pr-4 font-mono text-[10px] font-medium tracking-[0.06em] text-ink-muted uppercase">
            Wire
          </th>
          <th className="pb-1.5 font-mono text-[10px] font-medium tracking-[0.06em] text-ink-muted uppercase">
            Notes
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.sensorPin} className="border-b border-border/50 last:border-0">
            <td className="py-2 pr-4 font-mono font-medium text-ink">{row.sensorPin}</td>
            <td className="py-2 pr-4 font-mono tabular-nums text-teal">
              {ispower
                ? row.esp32Pin === 3300
                  ? "3.3V"
                  : row.esp32Pin === 5000
                    ? "5V"
                    : "GND"
                : `GPIO ${row.esp32Pin}`}
            </td>
            <td className="py-2 pr-4">
              <span className="flex items-center gap-1.5 text-ink-secondary">
                <WireDot color={row.wire} />
                {row.wire}
              </span>
            </td>
            <td className="py-2 text-ink-muted">{row.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

export function AiWiringGuide({ selectedSensors }: { selectedSensors: SensorId[] }) {
  if (selectedSensors.length === 0) return null;

  let wirings: SensorWiring[];
  let pinError: string | null = null;

  try {
    wirings = assignPins(selectedSensors);
  } catch (err) {
    pinError = err instanceof Error ? err.message : "Unknown pin allocation error.";
    wirings = [];
  }

  return (
    <section
      id="wiring-guide"
      className="mt-8 rounded-[12px] border border-border bg-surface"
      aria-labelledby="wiring-guide-heading"
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3
            id="wiring-guide-heading"
            className="font-display text-[13px] font-extrabold tracking-[0.08em] text-ink uppercase"
          >
            ✨ AI Wiring Guide
          </h3>
          <span className="font-mono text-[11px] text-ink-muted">
            {selectedSensors.length} sensor{selectedSensors.length !== 1 ? "s" : ""} · ESP32 DevKit V1
          </span>
        </div>
        <p className="mt-1 text-[12px] text-ink-muted">
          Pin assignments are deterministic and hardware-safe. Strapping pins (GPIO 0, 2, 5, 12, 15) and
          input-only pins (GPIO 34–39) are never used for sensor connections.
        </p>
      </div>

      {pinError && (
        <div className="m-4 rounded-[8px] border border-critical/40 bg-critical/8 px-4 py-3 text-[12.5px] text-critical">
          ⚠ {pinError}
        </div>
      )}

      <div className="divide-y divide-border">
        {wirings.map((wiring) => (
          <div key={wiring.sensorId} className="px-5 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-ink">{wiring.sensorLabel}</span>
              <span className="rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] tracking-[0.05em] text-ink-muted uppercase">
                {wiring.interface}
              </span>
            </div>

            <div className="mb-3 overflow-x-auto">
              <PinTable rows={wiring.rows} />
            </div>

            {wiring.powerRows.length > 0 && (
              <div className="overflow-x-auto">
                <div className="mb-1.5 font-mono text-[10px] tracking-[0.06em] text-ink-muted uppercase">Power</div>
                <PinTable rows={wiring.powerRows} ispower />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border px-5 py-3">
        <p className="font-mono text-[10.5px] text-ink-muted">
          ⚡ Always connect GND before signal wires. Double-check voltage levels — the ESP32 is 3.3V logic; sensors
          marked &quot;5V&quot; may require a level shifter on their output lines.
        </p>
      </div>
    </section>
  );
}
