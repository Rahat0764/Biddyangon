'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InstituteCreateForm } from '@/components/InstituteCreateForm';

interface InstituteRow { id: string; name: string; shortcut: string; status: string; created_at: string; }

export default function InstitutesPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<InstituteRow[] | null>(null);

  useEffect(() => {
    supabase.from('institutes').select('id, name, shortcut, status, created_at').order('created_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  async function toggleStatus(row: InstituteRow) {
    const next = row.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('institutes').update({ status: next }).eq('id', row.id);
    if (!error) setRows((rs) => (rs ?? []).map((r) => (r.id === row.id ? { ...r, status: next } : r)));
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
                <td><button onClick={() => toggleStatus(r)} className="border border-line text-xs font-semibold px-2.5 py-1 rounded-sm hover:bg-paper">{r.status === 'active' ? 'Suspend' : 'Activate'}</button></td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="text-slate2-light">No institutes yet — create the first one above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
