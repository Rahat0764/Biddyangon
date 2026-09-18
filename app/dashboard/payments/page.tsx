import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RecordPaymentForm } from '@/components/RecordPaymentForm';

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*, institutes(name, logo_url)').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['account', 'institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const { data: feeTypes } = await supabase.from('fee_types').select('id, name, amount').eq('institute_id', profile.institute_id);
  const { data: recent } = await supabase
    .from('payments').select('id, amount, method, created_at, profiles(full_name)')
    .eq('institute_id', profile.institute_id).order('created_at', { ascending: false }).limit(15);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Record Payment</h1>
        <p className="text-sm text-slate2-light mt-1">Look up a student by ID, record the payment, and the receipt PDF downloads automatically.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RecordPaymentForm
          instituteId={profile.institute_id}
          instituteName={(profile as any).institutes?.name ?? 'Institute'}
          instituteLogoUrl={(profile as any).institutes?.logo_url ?? null}
          feeTypes={feeTypes ?? []}
          recordedBy={profile.id}
        />

        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-3">Recent Payments</h3>
          <div className="scroll-x border border-line rounded-DEFAULT">
            <table>
              <thead><tr><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
              <tbody>
                {(recent ?? []).map((p: any) => (
                  <tr key={p.id}><td>{p.profiles?.full_name ?? '—'}</td><td>৳{Number(p.amount).toLocaleString()}</td><td className="capitalize">{p.method}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>
                ))}
                {(recent ?? []).length === 0 && <tr><td colSpan={4} className="text-slate2-light">No payments recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
