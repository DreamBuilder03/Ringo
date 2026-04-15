import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import Link from 'next/link';
import './demo.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Try Ringo — Live AI Voice Demo for Your Restaurant',
  description:
    'Hear Ringo answer the phone for your restaurant in under a minute. Enter your restaurant, then talk live.',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${inter.variable} demo-root min-h-screen bg-[#0A0A0A] text-[#141414]`}>
      <header className="sticky top-0 z-40 border-b border-bone/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Ringo
            </span>
          </Link>
          <Link
            href="/book"
            className="rounded-full border border-bone/15 px-4 py-2 text-sm font-medium text-[#141414]/90 transition hover:border-bone/30 hover:bg-bone/5"
          >
            Book a call
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
