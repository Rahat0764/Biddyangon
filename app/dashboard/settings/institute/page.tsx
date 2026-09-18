import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoUploadForm } from '@/components/LogoUploadForm';

export default async function InstituteSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id || profile.role !== 'institute_head') redirect('/dashboard');

  const { data: institute } = await supabase.from('institutes').select('*').eq('id', profile.institute_id).single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Institute Settings</h1>
        <p className="text-sm text-slate2-light mt-1">Branding shown across marksheets, receipts and admit cards.</p>
      </div>
      <LogoUploadForm instituteId={institute.id} currentLogoUrl={institute.logo_url} />
    </div>
  );
}
