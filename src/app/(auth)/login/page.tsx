'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-omri-dark">
      {/* Grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(29,158,117,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(29,158,117,0.05)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient blob */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-omri-teal/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Image
              src="/omri-logo.svg"
              alt="OMRI"
              width={160}
              height={50}
              className="h-12 w-auto mx-auto"
            />
            <p className="text-sm text-omri-muted mt-2">Sign in to your dashboard</p>
          </div>

          <div className="rounded-2xl border border-omri-border bg-omri-card backdrop-blur-sm p-8 shadow-lg shadow-obsidian/5">
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-xl bg-bone border border-bone px-4 py-3 text-sm text-bone">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-omri-muted/70">
            New to OMRI?{' '}
            <Link href="/onboarding" className="text-omri-teal hover:text-omri-teal-light transition-colors font-semibold">
              Start free trial
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-omri-muted/50 font-semibold">
            <Shield className="h-3 w-3" />
            <span>Protected by 256-bit SSL encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
