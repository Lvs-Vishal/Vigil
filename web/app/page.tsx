import Link from "next/link";
import type { Metadata } from "next";
import { seed, marketingStats, fmtNumber } from "@/lib/data";
import { Nav } from "@/components/marketing/nav";
import { BrandMark } from "@/components/marketing/brand-mark";
import { ModuleRack } from "@/components/marketing/module-rack";
import { StatItem } from "@/components/marketing/stat-item";
import { FeatureCard } from "@/components/marketing/feature-card";
import { StepCard } from "@/components/marketing/step-card";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { PreviewModuleCard } from "@/components/marketing/preview-module-card";
import { MarketplaceCard } from "@/components/marketing/marketplace-card";

export const metadata: Metadata = {
  description:
    "Plug a sensor into any slot and watch your dashboard build itself — no firmware rewrite, no redeploy.",
};

const GITHUB_URL = "https://github.com";

const PREVIEW_SLUGS = ["sound-level", "ambient-light", "temperature", "proximity"];

export default function Home() {
  const stats = marketingStats();
  const previewModules = PREVIEW_SLUGS.map((slug) =>
    seed.modules.find((m) => m.slug === slug),
  ).filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <>
      <Nav />

      <main className="flex-1">
        {/* ---------------------------------------------------------- Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
            <div>
              <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-teal">
                <span className="text-ink-muted">{"//"}</span>
                Modular sensor platform
              </p>
              <h1 className="max-w-xl text-balance font-display text-[2.5rem] font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl">
                Swap the sensor. Not the firmware.
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-secondary">
                Nodeframe is a plug-and-play sensor platform for hardware
                builders. Snap a module into any slot and it shows up on your
                dashboard automatically — no firmware rewrite, no redeploy.
                Right now {stats.modulesLive} sensors are wired to the demo
                rig, capped by the power budget, not the architecture — four
                more plugin manifests are already written and waiting for a
                slot.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-md border border-copper bg-copper px-5 py-3 font-mono text-sm font-medium text-plane transition-colors hover:border-copper-strong hover:bg-copper-strong"
                >
                  Open the live dashboard
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <a
                  href="#marketplace"
                  className="inline-flex items-center gap-2 rounded-md border border-border-strong px-5 py-3 font-mono text-sm text-ink transition-colors hover:border-teal hover:text-teal"
                >
                  Browse the marketplace
                </a>
              </div>

              <p className="mt-6 font-mono text-[0.8rem] text-ink-muted">
                {stats.modulesLive} of {stats.slotsTotal} bays seated right now ·{" "}
                {stats.readyToInstall} more plugins ready to install
              </p>
            </div>

            <ModuleRack />
          </div>
        </section>

        {/* ---------------------------------------------------------- Stats */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:px-8 lg:grid-cols-4">
            <StatItem
              value={`${stats.modulesLive}/${stats.slotsTotal}`}
              label="Modules running"
            />
            <StatItem
              value={fmtNumber(stats.pluginsInMarketplace)}
              label="Plugins in the marketplace"
            />
            <StatItem
              value={fmtNumber(stats.readyToInstall)}
              label="Plugins ready to install"
            />
            <StatItem value="<1s" label="Hot-plug detection, no reboot" />
          </div>
        </section>

        {/* -------------------------------------------------------- Features */}
        <section id="product" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-teal">
              {"// Product"}
            </p>
            <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
              One slot. Any sensor.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Any sensor, one bus"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <rect x="3" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9V6a2 2 0 012-2h1M11 9V6a2 2 0 00-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M17 12h4M17 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Temperature, gas, light, vibration, soil moisture — whatever
              you&apos;re measuring, it plugs into the same slot and speaks the
              same language. Nodeframe doesn&apos;t care what&apos;s on the other
              end of the wire.
            </FeatureCard>

            <FeatureCard
              title="A dashboard that builds itself"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="8" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="13" y="3" width="8" height="5" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="13" y="10" width="8" height="11" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="3" y="13" width="8" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              }
            >
              Plug in a module and a panel appears — live readings,
              thresholds, status — with zero front-end code. Swap the sensor
              and the dashboard follows.
            </FeatureCard>

            <FeatureCard
              title="Open by design"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M12 3l7 3.2v5.4c0 4.4-3 8.3-7 9.4-4-1.1-7-5-7-9.4V6.2L12 3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Every sensor ships as a small plugin. Anyone can write one,
              publish it to the marketplace, and it runs on any Nodeframe
              core — yours included.
            </FeatureCard>

            <FeatureCard
              title="AI insights, on-device"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.5l1.8 4.4 4.4 1.8-4.4 1.8L12 16l-1.8-4.5-4.4-1.8 4.4-1.8L12 3.5z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M19 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              }
            >
              A local Ollama model reads live sensor state and flags things
              in plain English — &quot;this sensor is trending toward
              overheating,&quot; &quot;this looks like it needs repair.&quot;
              No cloud API key, nothing leaves the rig, and a deterministic
              rule-based fallback keeps it working even if the model isn&apos;t
              running.
            </FeatureCard>
          </div>
        </section>

        {/* ---------------------------------------------------- How it works */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-teal">
              {"// How it works"}
            </p>
            <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
              From new module to live panel in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <StepCard index={1} title="Plug it in">
              Seat a module in any open slot. No screws to configure, no
              reboot.
            </StepCard>
            <StepCard index={2} title="Watch it appear">
              Your dashboard picks it up in under a second — live readings, a
              status pill, a chart.
            </StepCard>
            <StepCard index={3} title="Set it and walk away">
              Dial in a warning threshold once. Nodeframe watches it for you,
              every two minutes, forever.
            </StepCard>
          </div>
        </section>

        {/* ------------------------------------------------------- Preview */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Your hub, live
            </h2>
            <p className="mt-3 text-ink-secondary">
              This is the real console — the same one behind the numbers
              above.
            </p>
          </div>

          <BrowserFrame url="nodeframe.app/dashboard">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {previewModules.map((m) => (
                <PreviewModuleCard key={m.slug} module={m} />
              ))}
            </div>
          </BrowserFrame>

          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 font-mono text-sm text-copper-strong transition-colors hover:text-copper"
            >
              Open the full dashboard
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------- Marketplace */}
        <section id="marketplace" className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="mb-12 max-w-2xl">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-teal">
                {"// Marketplace"}
              </p>
              <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
                Every plugin, installed or not
              </h2>
              <p className="mt-3 text-ink-secondary">
                {stats.pluginsInstalled} plugins are seated and running right
                now; {stats.readyToInstall} more have a manifest written and
                are one open slot away. Install one and your dashboard grows
                a panel for it — nothing to configure by hand.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seed.marketplace.map((plugin) => (
                <MarketplaceCard key={plugin.slug} plugin={plugin} />
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="rounded-xl border border-border-strong bg-surface px-6 py-14 text-center sm:px-14">
            <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Build the plugin your sensor deserves.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-ink-secondary">
              Write a manifest, wire up a driver, and it runs on any
              Nodeframe core — yours included.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-strong px-5 py-3 font-mono text-sm text-ink transition-colors hover:border-teal hover:text-teal"
              >
                Read the docs
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-copper bg-copper px-5 py-3 font-mono text-sm font-medium text-plane transition-colors hover:border-copper-strong hover:bg-copper-strong"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------- Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5 font-display text-base font-black tracking-tight text-ink">
                <BrandMark className="h-5 w-5" />
                NODEFRAME
              </div>
              <p className="mt-3 max-w-[32ch] text-sm text-ink-secondary">
                A modular sensor platform, built for hardware hackathons.
              </p>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Product
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                <li>
                  <Link href="/dashboard" className="text-sm text-ink-secondary hover:text-teal">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <a href="#marketplace" className="text-sm text-ink-secondary hover:text-teal">
                    Marketplace
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-secondary hover:text-teal"
                  >
                    Docs
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Community
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                <li>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-secondary hover:text-teal"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-secondary hover:text-teal"
                  >
                    Contributing
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 font-mono text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Nodeframe · MIT licensed</span>
          </div>
        </div>
      </footer>
    </>
  );
}
