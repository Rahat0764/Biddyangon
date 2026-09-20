import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/SettingsTabs';
import { GradingPolicyEditor } from '@/components/GradingPolicyEditor';

export default async function GradingSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id || profile.role !== 'institute_head') redirect('/dashboard');

  const { data: institute } = await supabase.from('institutes').select('grading_policy').eq('id', profile.institute_id).single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-slate2-light mt-1">How marks convert to grades and GPA across every exam.</p>
      </div>
      <SettingsTabs />
      <GradingPolicyEditor instituteId={profile.institute_id} initial={institute!.grading_policy} />
    </div>
  );
}
