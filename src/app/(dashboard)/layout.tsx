import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import type { UserRole } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role: UserRole = (profile?.role as UserRole) || 'restaurant';

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle grain texture — monochrome only, no color */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />
      {/* Subtle radial wash for depth */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,rgba(243,238,227,0.02),transparent_70%)]" />
      <Sidebar role={role} />
      <main className="lg:ml-[280px] min-h-screen p-4 md:p-6 lg:p-8 pt-16 lg:pt-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
