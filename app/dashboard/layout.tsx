import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, institutes(name)')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <DashboardShell
      role={profile.role}
      fullName={profile.full_name}
      photoUrl={profile.photo_url}
      instituteName={(profile as any).institutes?.name ?? 'Biddyangon'}
    >
      {children}
    </DashboardShell>
  );
}
