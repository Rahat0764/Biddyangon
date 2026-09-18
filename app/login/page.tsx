'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BrandMark } from '@/components/BrandMark';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: email, error: lookupErr } = await supabase.rpc('email_for_username', { p_username: username.trim() });
      if (lookupErr || !email) throw new Error('No account found for that username.');

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please check your username and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-ink relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{
        background: 'radial-gradient(circle at 15% 20%, rgba(184,137,43,.14), transparent 45%), radial-gradient(circle at 85% 80%, rgba(43,58,143,.18), transparent 45%)',
      }} />
      <div className="relative z-10 mb-8 text-center">
        <div className="flex justify-center mb-3"><BrandMark dark /></div>
        <div className="text-[#8B92B5] text-sm">Education Management, Simplified.</div>
      </div>

      <form onSubmit={submit} className="relative z-10 w-full max-w-sm bg-white/[.04] border border-white/10 rounded-lg p-7 backdrop-blur">
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#B7BBD9] mb-1.5">Username</label>
          <input
            value={username} onChange={(e) => setUsername(e.target.value)} required
            placeholder="e.g. tmkmt-244874"
            className="w-full bg-white/5 border border-white/15 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-[#5B6289] outline-none focus:border-brass-light font-mono"
          />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#B7BBD9] mb-1.5">Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full bg-white/5 border border-white/15 rounded-sm px-3 py-2.5 text-sm text-white outline-none focus:border-brass-light"
          />
        </div>
        {error && <div className="mb-4 text-xs text-[#F3A5A2] bg-[#3A1E1E] border border-[#5A2A2A] rounded-sm px-3 py-2">{error}</div>}
        <button disabled={busy} type="submit" className="w-full bg-brass hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-sm">
          {busy ? 'Signing in…' : 'Log In'}
        </button>
        <div className="text-center mt-4 text-xs text-[#6B7299]">Forgot password? Contact your institute administrator.</div>
      </form>
    </div>
  );
}
