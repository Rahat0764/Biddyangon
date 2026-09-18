'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

export function InstituteCreateForm({ onCreated }: { onCreated: (row: any) => void }) {
  const supabase = createClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [type, setType] = useState('School');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    const cut = shortcut.trim().toLowerCase();
    if (!name.trim() || !/^[a-z0-9]+$/.test(cut)) {
      toast('Check the fields', 'Name is required and shortcut must be lowercase letters/numbers only.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.from('institutes').insert({ name, shortcut: cut }).select().single();
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        institute_id: data.id, action: `Created institute ${data.name} (${data.shortcut})`, entity: 'institutes', entity_id: data.id,
      });

      toast('Institute created', `${data.name} is live. Next: create its Institute Head account in Supabase Auth and link a profile.`, 'success');
      onCreated(data);
      setName(''); setShortcut(''); setOpen(false);
    } catch (e: any) {
      toast('Could not create institute', e.message?.includes('duplicate') ? 'That shortcut is already taken.' : e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="bg-indigo text-white text-sm font-semibold px-4 py-2.5 rounded-sm">+ Create Institute</button>;
  }

  return (
    <div className="card p-5 mb-6 max-w-lg">
      <h3 className="font-semibold text-sm mb-4">Create Institute</h3>
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1.5">Institute Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dhaka Ideal College" className="w-full border border-line rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5">Shortcut</label>
          <input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="e.g. dic" className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono" />
          <div className="text-[11px] text-slate2-light mt-1">Used in usernames, e.g. dic-244874</div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option>School</option><option>College</option><option>Madrasa</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={submit} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">{busy ? 'Creating…' : 'Create Institute'}</button>
        <button onClick={() => setOpen(false)} className="border border-line text-sm font-semibold px-4 py-2 rounded-sm">Cancel</button>
      </div>
    </div>
  );
}
