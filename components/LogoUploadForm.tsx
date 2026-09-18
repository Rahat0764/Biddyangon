'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

export function LogoUploadForm({ instituteId, currentLogoUrl }: { instituteId: string; currentLogoUrl: string | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${instituteId}/logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('institute-logos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('institute-logos').getPublicUrl(path);
      const { error } = await supabase.from('institutes').update({ logo_url: pub.publicUrl }).eq('id', instituteId);
      if (error) throw error;
      setPreview(pub.publicUrl);
      toast('Logo updated', 'Your institute logo now appears on marksheets, receipts and the sidebar.', 'success');
    } catch (e: any) {
      toast('Upload failed', e.message ?? 'Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 max-w-md">
      <h3 className="font-semibold text-sm mb-4">Institute Logo</h3>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-md border border-line flex items-center justify-center overflow-hidden bg-paper">
          {preview ? <img src={preview} className="w-full h-full object-contain" alt="logo" /> : <span className="text-xs text-slate2-light">No logo</span>}
        </div>
        <label className="border border-line rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-paper">
          {busy ? 'Uploading…' : 'Upload Logo'}
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="hidden" />
        </label>
      </div>
      <p className="text-xs text-slate2-light mt-3">Appears on the marksheet, receipts and admit cards. PNG with a transparent background works best.</p>
    </div>
  );
}
