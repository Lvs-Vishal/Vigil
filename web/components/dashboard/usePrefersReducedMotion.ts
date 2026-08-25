"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Mirrors the static build's `prefers-reduced-motion` gate: when the user
 * prefers reduced motion, the dashboard's live-simulation interval must
 * never start (no ticking clock, no synthetic data points, no pulsing dot).
 *
 * Backed by `useSyncExternalStore` (rather than state-set-in-an-effect) so
 * it subscribes directly to the media query's own change events and reports
 * `false` for the server snapshot, matching what a server render produces
 * since `window` isn't available there.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  // Older Safari fallback.
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
