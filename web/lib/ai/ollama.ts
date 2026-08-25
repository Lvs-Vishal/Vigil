// Server-side-only client for a local Ollama instance. No API key, no
// external network call — this is why "Ollama (fully local)" was picked for
// the hackathon demo: it keeps working even with venue wifi unplugged, as
// long as `ollama serve` is running on the same machine (or LAN host) as
// this app.
import type { Insight, ModuleSnapshot } from "./types";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const TIMEOUT_MS = 8000;

function buildPrompt(snapshots: ModuleSnapshot[]): string {
  const flagged = snapshots.filter((s) => s.status !== "good");
  const rows = (flagged.length ? flagged : snapshots)
    .map((s) => {
      const thresholds = Object.entries(s.thresholds)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      const dur = s.minutesSinceFlagged !== null ? `${s.minutesSinceFlagged} min` : "n/a";
      return `- ${s.label} (${s.sensorChip}): metric=${s.metricKey}, latest=${s.latest}${s.unit}, status=${s.status}, trend=${s.trend}, minutes_flagged=${dur}, thresholds={${thresholds}}, recent_events=${JSON.stringify(s.recentEvents)}`;
    })
    .join("\n");

  return `You are a condition-monitoring assistant for an industrial sensor rig called Nodeframe. Given the sensor snapshots below, write short, plain-English maintenance insights an operator would find useful — the kind of thing a technician would want to see, like "this machine needs repair" or "check for overheating." Only write insights for modules that are warning or critical. If every module below is "good", return exactly one info-severity insight saying everything is nominal.

Sensor snapshots:
${rows}

Respond with ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{"insights": [{"moduleSlug": string, "moduleLabel": string, "severity": "info"|"warning"|"critical", "title": string (max 8 words), "body": string (1-2 sentences, concrete and actionable)}]}`;
}

function isInsight(x: unknown): x is Insight {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.moduleSlug === "string" &&
    typeof o.moduleLabel === "string" &&
    (o.severity === "info" || o.severity === "warning" || o.severity === "critical") &&
    typeof o.title === "string" &&
    typeof o.body === "string"
  );
}

export async function generateOllamaInsights(
  snapshots: ModuleSnapshot[],
): Promise<{ insights: Insight[]; model: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [{ role: "user", content: buildPrompt(snapshots) }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama responded ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw new Error("Ollama response had no message content");

    let parsed: { insights?: unknown[] };
    try {
      parsed = JSON.parse(content) as { insights?: unknown[] };
    } catch {
      throw new Error("Ollama response was not valid JSON");
    }

    const insights = (parsed.insights ?? []).filter(isInsight);
    if (insights.length === 0) throw new Error("Ollama returned no valid insights");

    return { insights, model: OLLAMA_MODEL };
  } finally {
    clearTimeout(timer);
  }
}
