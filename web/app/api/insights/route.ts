import { NextResponse } from "next/server";
import { fetchLiveSeedData } from "@/lib/data";
import { buildSnapshots } from "@/lib/ai/snapshot";
import { heuristicInsights } from "@/lib/ai/heuristic";
import { generateOllamaInsights } from "@/lib/ai/ollama";
import type { InsightsResult } from "@/lib/ai/types";

// Always compute fresh — this reads the live seed/simulation state, and the
// route is cheap (heuristic path) or bounded by an 8s timeout (Ollama path).
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchLiveSeedData();
  const snapshots = buildSnapshots(data.modules);
  const flagged = snapshots.filter((s) => s.status !== "good");

  // Nothing wrong right now — skip the model call entirely. The heuristic
  // already returns the right "all nominal" message for this case.
  if (flagged.length === 0) {
    const result: InsightsResult = { insights: heuristicInsights(snapshots), source: "heuristic" };
    return NextResponse.json(result);
  }

  try {
    const { insights, model } = await generateOllamaInsights(snapshots);
    const result: InsightsResult = { insights, source: "ollama", model };
    return NextResponse.json(result);
  } catch (err) {
    // Ollama not running, unreachable, timed out, or returned something we
    // couldn't parse — fall back to the deterministic heuristic so the demo
    // panel never breaks. The error is surfaced (not swallowed) so the UI
    // can show a small "local model unavailable" note if it wants to.
    const result: InsightsResult = {
      insights: heuristicInsights(snapshots),
      source: "heuristic",
      error: err instanceof Error ? err.message : "Ollama unavailable",
    };
    return NextResponse.json(result);
  }
}
