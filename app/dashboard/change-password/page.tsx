'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BrandMark } from '@/components/BrandMark';

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) { setError(authError.message); setBusy(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-ink">
      <div className="mb-8"><BrandMark dark /></div>
      <form onSubmit={submit} className="w-full max-w-sm bg-white/[.04] border border-white/10 rounded-lg p-7">
        <h1 className="text-white font-serif text-lg font-semibold mb-2">Set a New Password</h1>
        <p className="text-[#8B92B5] text-xs mb-5">This is a temporary password. Choose a permanent one to continue.</p>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#B7BBD9] mb-1.5">New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
            className="w-full bg-white/5 border border-white/15 rounded-sm px-3 py-2.5 text-sm text-white outline-none focus:border-brass-light" />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#B7BBD9] mb-1.5">Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8}
            className="w-full bg-white/5 border border-white/15 rounded-sm px-3 py-2.5 text-sm text-white outline-none focus:border-brass-light" />
        </div>
        {error && <div className="mb-4 text-xs text-[#F3A5A2] bg-[#3A1E1E] border border-[#5A2A2A] rounded-sm px-3 py-2">{error}</div>}
        <button disabled={busy} type="submit" className="w-full bg-brass hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-sm">
          {busy ? 'Saving…' : 'Set Password & Continue'}
        </button>
      </form>
    </div>
  );
}
