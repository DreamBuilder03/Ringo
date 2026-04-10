'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#0D0D12] text-white">
      {/* Grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient blob */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-ringo-teal/8 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Link href="/" className="font-serif text-3xl text-ringo-teal">Ringo</Link>
            <p className="text-sm text-white/40 mt-2">Sign in to your dashboard</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-8 shadow-2xl shadow-black/20">
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
                <div className="rounded-xl bg-red-400/10 border border-red-400/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full shadow-lg shadow-ringo-teal/20" size="lg">
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-white/30">
            New to Ringo?{' '}
            <Link href="/onboarding" className="text-ringo-teal hover:text-ringo-teal-light transition-colors font-semibold">
              Start free trial
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/15 font-semibold">
            <Shield className="h-3 w-3" />
            <span>Protected by 256-bit SSL encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
