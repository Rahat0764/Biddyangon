'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InstituteCreateForm } from '@/components/InstituteCreateForm';
import { Modal } from '@/components/Modal';
import { CredentialCard } from '@/components/CredentialCard';
import { createInstituteHead } from '@/app/actions/users';
import { useToast } from '@/components/ToastProvider';

interface InstituteRow { id: string; name: string; shortcut: string; status: string; created_at: string; has_head?: boolean; }

export default function InstitutesPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<InstituteRow[] | null>(null);
  const [headModalFor, setHeadModalFor] = useState<InstituteRow | null>(null);
  const [headName, setHeadName] = useState('');
  const [headPhone, setHeadPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; tempPassword: string } | null>(null);

  async function refresh() {
    const { data } = await supabase.from('institutes').select('id, name, shortcut, status, created_at').order('created_at', { ascending: false });
    setRows(data ?? []);
  }

  useEffect(() => { refresh(); }, []);

  async function toggleStatus(row: InstituteRow) {
    const next = row.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('institutes').update({ status: next }).eq('id', row.id);
    if (!error) {
      setRows((rs) => (rs ?? []).map((r) => (r.id === row.id ? { ...r, status: next } : r)));
      toast(next === 'suspended' ? 'Institute suspended' : 'Institute activated', `${row.name} — everyone there is now ${next === 'suspended' ? 'locked out' : 'able to sign in again'}.`, 'info');
    }
  }

  async function submitHead() {
    if (!headModalFor || !headName.trim()) return;
    setBusy(true);
    const result = await createInstituteHead(headModalFor.id, headName.trim(), headPhone.trim());
    setBusy(false);
    if (!result.success) { toast('Could not create Head account', result.message, 'error'); return; }
    setCredentials({ username: result.username!, tempPassword: result.tempPassword! });
    setHeadModalFor(null);
    setHeadName(''); setHeadPhone('');
    toast('Institute Head account created', `${result.username} is ready to log in.`, 'success');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Institutes</h1>
        <p className="text-sm text-slate2-light mt-1">Every institute running on Biddyangon. Each one's data is fully isolated.</p>
      </div>

      <InstituteCreateForm onCreated={(row) => setRows((rs) => [row, ...(rs ?? [])])} />

      <div className="scroll-x border border-line rounded-DEFAULT bg-white">
        <table>
          <thead><tr><th>Institute</th><th>Shortcut</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td className="font-semibold">{r.name}</td>
                <td className="font-mono">{r.shortcut}</td>
                <td>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                    ● {r.status}
                  </span>
                </td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="flex gap-2">
                  <button onClick={() => setHeadModalFor(r)} className="border border-line text-xs font-semibold px-2.5 py-1 rounded-sm hover:bg-paper">+ Head Account</button>
                  <button onClick={() => toggleStatus(r)} className="border border-line text-xs font-semibold px-2.5 py-1 rounded-sm hover:bg-paper">{r.status === 'active' ? 'Suspend' : 'Activate'}</button>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="text-slate2-light">No institutes yet — create the first one above.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!headModalFor} onClose={() => setHeadModalFor(null)} title={`Create Head Account — ${headModalFor?.name ?? ''}`}>
        <p className="text-sm text-slate2-light mb-4">Creates the login (username <span className="font-mono">{headModalFor?.shortcut}-head</span>) and generates a temporary password — no manual SQL needed.</p>
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1.5">Full Name</label>
          <input value={headName} onChange={(e) => setHeadName(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="e.g. Md. Abdul Karim" />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-1.5">Phone (optional)</label>
          <input value={headPhone} onChange={(e) => setHeadPhone(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="+880 1XXX-XXXXXX" />
        </div>
        <button disabled={busy || !headName.trim()} onClick={submitHead} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm w-full">
          {busy ? 'Creating…' : 'Create Head Account'}
        </button>
      </Modal>

      <Modal open={!!credentials} onClose={() => setCredentials(null)} title="Account Created">
        {credentials && <CredentialCard username={credentials.username} tempPassword={credentials.tempPassword} />}
      </Modal>
    </div>
  );
}
