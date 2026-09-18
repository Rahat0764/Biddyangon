'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

// Used for student, teacher and department-head profile photos alike.
export function PhotoUpload({ instituteId, profileId, currentPhotoUrl }: { instituteId: string; profileId: string; currentPhotoUrl: string | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${instituteId}/${profileId}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('student-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('student-photos').getPublicUrl(path);
      const { error } = await supabase.from('profiles').update({ photo_url: pub.publicUrl }).eq('id', profileId);
      if (error) throw error;
      setPreview(pub.publicUrl + '?t=' + Date.now());
      toast('Photo updated', 'This photo now appears on the dashboard and marksheet.', 'success');
    } catch (e: any) {
      toast('Upload failed', e.message ?? 'Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full border border-line overflow-hidden bg-paper flex items-center justify-center">
        {preview ? <img src={preview} className="w-full h-full object-cover" alt="photo" /> : <span className="text-[10px] text-slate2-light">No photo</span>}
      </div>
      <label className="border border-line rounded-sm px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-paper">
        {busy ? 'Uploading…' : 'Change Photo'}
        <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="hidden" />
      </label>
    </div>
  );
}
