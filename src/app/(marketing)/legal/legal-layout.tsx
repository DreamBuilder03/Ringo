import Link from "next/link";
import type { ReactNode } from "react";

export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90">
      {/* Top nav */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ringo-logo.png"
              alt="Ringo"
              className="h-7 w-auto brightness-0 invert"
            />
          </Link>
          <Link
            href="/"
            className="text-white/50 hover:text-white/90 text-sm transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-3">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-white mb-4">
          {title}
        </h1>
        <p className="text-white/40 text-sm mb-12">
          Effective date: {effectiveDate}
        </p>

        <article className="legal-prose text-white/70 text-[15px] leading-[1.75]">
          {children}
        </article>

        <div className="mt-16 pt-8 border-t border-white/[0.06] text-sm text-white/40">
          Questions? Email{" "}
          <a
            href="mailto:hello@useringo.ai"
            className="text-white/70 hover:text-white underline underline-offset-2"
          >
            hello@useringo.ai
          </a>
          .
        </div>
      </main>

      <style>{`
        .legal-prose h2 {
          color: #fff;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.5rem;
          letter-spacing: -0.01em;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .legal-prose h3 {
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          font-size: 1.05rem;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .legal-prose p { margin-bottom: 1rem; }
        .legal-prose ul { margin: 0.75rem 0 1.25rem 1.25rem; list-style: disc; }
        .legal-prose li { margin-bottom: 0.4rem; }
        .legal-prose a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
        .legal-prose strong { color: #fff; font-weight: 600; }
      `}</style>
    </div>
  );
}
