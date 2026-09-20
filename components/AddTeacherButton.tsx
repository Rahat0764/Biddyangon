'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { CredentialCard } from './CredentialCard';
import { createTeacher } from '@/app/actions/users';
import { useToast } from './ToastProvider';

export function AddTeacherButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; tempPassword: string } | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    const result = await createTeacher(name.trim(), designation.trim(), phone.trim());
    setBusy(false);
    if (!result.success) { toast('Could not create Teacher account', result.message, 'error'); return; }
    setCredentials({ username: result.username!, tempPassword: result.tempPassword! });
    setOpen(false);
    setName(''); setDesignation(''); setPhone('');
    toast('Teacher account created', `${result.username} is ready to log in.`, 'success');
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-indigo text-white text-sm font-semibold px-4 py-2.5 rounded-sm">+ Add Teacher</button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Teacher">
        <p className="text-sm text-slate2-light mb-4">A username and temporary password are generated automatically. Assign subjects to them afterward from a class's Subjects page.</p>
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1.5">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="e.g. Nasrin Sultana" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="e.g. Senior Teacher" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="+880 1XXX-XXXXXX" />
          </div>
        </div>
        <button disabled={busy || !name.trim()} onClick={submit} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm w-full">
          {busy ? 'Creating…' : 'Create Teacher Account'}
        </button>
      </Modal>

      <Modal open={!!credentials} onClose={() => setCredentials(null)} title="Account Created">
        {credentials && <CredentialCard username={credentials.username} tempPassword={credentials.tempPassword} />}
      </Modal>
    </>
  );
}
