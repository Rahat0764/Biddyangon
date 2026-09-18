import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuditPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, institutes(name, shortcut)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Audit Logs</h1>
        <p className="text-sm text-slate2-light mt-1">Every sensitive action, across every institute, permanently recorded and never editable from the UI.</p>
      </div>
      <div className="scroll-x border border-line rounded-DEFAULT bg-white">
        <table>
          <thead><tr><th>Institute</th><th>Action</th><th>Timestamp</th></tr></thead>
          <tbody>
            {(logs ?? []).map((l: any) => (
              <tr key={l.id}>
                <td className="font-mono">{l.institutes?.shortcut ?? '—'}</td>
                <td>{l.action}</td>
                <td className="text-slate2-light">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && <tr><td colSpan={3} className="text-slate2-light">No actions logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
