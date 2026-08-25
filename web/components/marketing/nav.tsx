"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "./brand-mark";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#marketplace", label: "Marketplace" },
  { href: "https://github.com", label: "Docs", external: true },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-plane/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-[1.05rem] font-black tracking-tight text-ink"
        >
          <BrandMark className="h-[22px] w-[22px]" />
          NODEFRAME
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="font-mono text-sm tracking-wide text-ink-secondary transition-colors hover:text-teal"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-teal hover:text-teal"
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-copper bg-copper px-4 py-2 font-mono text-sm font-medium text-plane transition-colors hover:border-copper-strong hover:bg-copper-strong"
          >
            Open dashboard
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-ink md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="M5 5l14 14M19 5L5 19"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 font-mono text-sm text-ink-secondary hover:bg-surface hover:text-teal"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong px-4 py-2.5 font-mono text-sm text-ink"
            >
              GitHub
            </a>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-copper bg-copper px-4 py-2.5 font-mono text-sm font-medium text-plane"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
