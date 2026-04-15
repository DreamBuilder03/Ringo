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
      {/* Subtle dot texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(146,25,32,0.08) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Warm gradient wash */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-[#F3EEE3]/[0.02] via-transparent to-[#F3EEE3]/[0.02]" />
      <Sidebar role={role} />
      <main className="lg:ml-[280px] min-h-screen p-4 md:p-6 lg:p-8 pt-16 lg:pt-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
