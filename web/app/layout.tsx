import type { Metadata } from "next";
import type { ReactNode } from "react";

// Self-hosted via @fontsource (npm-distributed woff2 files) instead of
// next/font/google — this app has zero runtime or build-time dependency on
// fonts.googleapis.com / fonts.gstatic.com, which matters for hackathon
// judging on unknown networks, offline demos, and CI.
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/archivo/900.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nodeframe — the modular sensor platform",
    template: "%s · Nodeframe",
  },
  description:
    "Nodeframe is a plug-and-play sensor platform built on an ESP32 core hub. Snap in a module and your dashboard builds itself — no firmware rewrite required.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-plane text-ink">{children}</body>
    </html>
  );
}
