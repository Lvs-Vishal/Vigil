"use client";

import { useState } from "react";

interface GenerateResult {
  slug: string;
  instructions: string;
  generated_code: string;
  pr_url: string | null;
  branch?: string;
  github_enabled: boolean;
  github_error?: string;
  error?: string;
}

// ── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-[5px] border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-ink-secondary uppercase transition-colors hover:border-border-strong hover:text-ink"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, slug }: { code: string; slug: string }) {
  return (
    <div className="mt-5 overflow-hidden rounded-[10px] border border-border">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-hidden="true" />
          <span className="font-mono text-[11px] text-ink-muted">
            firmware/plugins/{slug}.h
          </span>
        </div>
        <CopyButton text={code} />
      </div>
      {/* Code */}
      <pre className="max-h-[480px] overflow-auto bg-surface px-5 py-4 font-mono text-[11.5px] leading-[1.65] text-ink-secondary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── PR success banner ─────────────────────────────────────────────────────────

function PRBanner({ prUrl, branch }: { prUrl: string; branch?: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[9px] border border-teal/35 bg-teal/7 px-4 py-3.5">
      <span className="text-[15px]" aria-hidden="true">🎉</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-teal">Pull request created</span>
        {branch && (
          <span className="font-mono text-[10.5px] text-ink-muted">branch: {branch}</span>
        )}
      </div>
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-1.5 rounded-[6px] border border-teal/40 bg-teal/10 px-3 py-1.5 font-mono text-[11px] font-medium text-teal transition-colors hover:bg-teal/20"
      >
        Open on GitHub
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function PluginGenerator() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const charLimit = 500;

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) return;

    setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      const res = await fetch("/api/generate-plugin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const data = (await res.json()) as GenerateResult;

      if (!res.ok || data.error) {
        setApiError(data.error ?? `Server responded ${res.status}`);
        return;
      }

      setResult(data);
    } catch {
      setApiError("Could not reach the plugin generator API. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <section id="plugin-generator" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="rounded-xl border border-border-strong bg-surface px-6 py-12 sm:px-12">
        {/* Header */}
        <div className="mb-8 max-w-xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-copper">
            {"// AI Plugin Generator"}
          </p>
          <h2 className="text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Build the plugin your sensor deserves.
          </h2>
          <p className="mt-3 text-ink-secondary">
            Describe your sensor in plain English. The AI generates a complete, production-ready C++ class
            implementing the <span className="font-mono text-teal">SensorPlugin</span> interface — ready to compile
            onto any Nodeframe core.
            {" "}
            {process.env.NEXT_PUBLIC_GITHUB_ENABLED === "true" && (
              <span>A GitHub pull request is opened automatically.</span>
            )}
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <label htmlFor="plugin-prompt" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-ink-muted">
            Describe your sensor
          </label>
          <textarea
            id="plugin-prompt"
            value={prompt}
            onChange={(e) => {
              if (e.target.value.length <= charLimit) setPrompt(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Add a BMP280 barometric pressure and temperature sensor over I2C"'
            rows={4}
            className="w-full resize-none rounded-[8px] border border-border bg-surface-2 px-4 py-3 font-mono text-[13px] text-ink placeholder:text-ink-muted/60 focus:border-copper/60 focus:outline-none focus:ring-1 focus:ring-copper/30 transition-colors"
            disabled={loading}
          />
          <div className="mt-1 flex items-center justify-between font-mono text-[10.5px] text-ink-muted">
            <span>⌘ + Enter to generate</span>
            <span className={prompt.length > charLimit * 0.9 ? "text-warning" : ""}>
              {prompt.length} / {charLimit}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            id="generate-plugin-btn"
            onClick={handleGenerate}
            disabled={loading || prompt.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-md border border-copper bg-copper px-5 py-3 font-mono text-sm font-medium text-plane transition-colors hover:border-copper-strong hover:bg-copper-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-plane/40 border-t-plane" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                ✨ Generate Plugin
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
          <span className="text-[12px] text-ink-muted">
            Powered by GPT-4o · hardware-safety rules enforced in the prompt
          </span>
        </div>

        {/* API error */}
        {apiError && (
          <div
            role="alert"
            className="mt-5 rounded-[9px] border border-critical/40 bg-critical/8 px-4 py-3 text-[12.5px] text-critical"
          >
            ⚠ {apiError}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-2">
            {result.pr_url && (
              <PRBanner prUrl={result.pr_url} branch={result.branch} />
            )}
            {result.github_error && (
              <div className="mt-4 rounded-[9px] border border-warning/40 bg-warning/7 px-4 py-3 text-[12px] text-ink-secondary">
                <span className="font-semibold text-warning">GitHub PR skipped:</span> {result.github_error}
                <br />
                <span className="text-ink-muted">The generated code is still available below — copy it and open a PR manually.</span>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-5 rounded-[10px] border border-border bg-surface-2 p-5 text-[13px] leading-[1.6]">
              <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink">
                Wiring Instructions
              </h3>
              <div className="whitespace-pre-wrap text-ink-secondary">
                {result.instructions}
              </div>
            </div>

            <CodeBlock code={result.generated_code} slug={result.slug} />

            {/* Hardware safety reminder */}
            <div className="mt-4 rounded-[8px] border border-border bg-surface-2 px-4 py-3 font-mono text-[10.5px] text-ink-muted">
              ⚡ Always review generated code before flashing. Verify: no{" "}
              <span className="text-ink">delay()</span> calls, no strapping pins (GPIO 0, 2, 5, 12, 15), correct
              voltage levels for your sensor.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
