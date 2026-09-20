'use client';
import { useState } from 'react';

// Shown right after an account is created — a one-time display of the
// generated username + temporary password, with a copy button. Supabase
// never lets us read a password back later, so this is the only moment
// it's ever visible; the admin should hand it to the person directly (or
// print/download the sheet on the bulk-import page) rather than relying
// on re-finding it here.
export function CredentialCard({ username, tempPassword }: { username: string; tempPassword: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`Username: ${username}\nPassword: ${tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="bg-paper border border-line rounded-sm p-4">
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div><div className="text-[11px] text-slate2-light uppercase tracking-wide">Username</div><div className="font-mono font-semibold text-ink">{username}</div></div>
        <div><div className="text-[11px] text-slate2-light uppercase tracking-wide">Temporary Password</div><div className="font-mono font-semibold text-ink">{tempPassword}</div></div>
      </div>
      <button onClick={copy} className="text-xs font-semibold text-indigo">{copied ? '✓ Copied' : 'Copy credentials'}</button>
      <p className="text-[11px] text-slate2-light mt-2">They'll be asked to change this password on first login. This is shown once — write it down now.</p>
    </div>
  );
}
