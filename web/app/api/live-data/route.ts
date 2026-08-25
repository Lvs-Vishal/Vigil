// GET /api/live-data
//
// Thin Next.js API route that delegates to the canonical fetchLiveSeedData()
// helper and returns the result as JSON. Called by the useLiveData client hook
// every 30 seconds — no Supabase Realtime / WebSocket required, safe for RLS-
// disabled tables accessed via the anon key.
//
// Cache: no-store so Next.js never serves a stale edge-cached response for a
// live-sensor endpoint.
import { NextResponse } from "next/server";
import { fetchLiveSeedData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchLiveSeedData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/live-data] unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live data" },
      { status: 500 },
    );
  }
}
