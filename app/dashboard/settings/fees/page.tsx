import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/SettingsTabs';
import { FeeTypesManager } from '@/components/FeeTypesManager';

export default async function FeeSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id || profile.role !== 'institute_head') redirect('/dashboard');

  const { data: feeTypes } = await supabase.from('fee_types').select('id, name, amount, frequency').eq('institute_id', profile.institute_id).order('name');

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-slate2-light mt-1">Fee types available when the Account team records a payment.</p>
      </div>
      <SettingsTabs />
      <FeeTypesManager instituteId={profile.institute_id} initial={feeTypes ?? []} />
    </div>
  );
}
