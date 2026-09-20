import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, institutes(name, status)')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  // A suspended institute's members can't use the dashboard at all — this
  // is an application-level check; the underlying RLS policies don't
  // currently gate on institute status (documented in the security patch
  // notes), so this is the actual enforcement point today.
  const institute = (profile as any).institutes;
  if (profile.role !== 'super_admin' && institute?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
        <div className="card p-8 max-w-sm text-center">
          <div className="text-2xl mb-3">🔒</div>
          <h1 className="font-serif text-lg font-semibold text-ink mb-2">Institute Suspended</h1>
          <p className="text-sm text-slate2-light">Access to {institute.name} has been suspended by the platform administrator. Contact Biddyangon support if you believe this is a mistake.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role={profile.role}
      fullName={profile.full_name}
      photoUrl={profile.photo_url}
      instituteName={institute?.name ?? 'Biddyangon'}
      mustChangePassword={profile.must_change_password}
    >
      {children}
    </DashboardShell>
  );
}
