'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

interface ClassOption { id: string; name: string; }

export function NoticeUploadForm({ instituteId, classes, canPost }: { instituteId: string; classes: ClassOption[]; canPost: boolean }) {
  const supabase = createClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<'institute' | 'teachers' | 'students' | 'parents' | 'class'>('institute');
  const [classId, setClassId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canPost) return null;

  async function submit() {
    if (!title.trim()) { toast('Title required', 'Add a title before publishing this notice.', 'error'); return; }
    setBusy(true);
    try {
      let attachment_url: string | null = null;

      if (file) {
        const path = `${instituteId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { error: upErr } = await supabase.storage.from('notice-attachments').upload(path, file, { contentType: 'application/pdf' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('notice-attachments').getPublicUrl(path);
        attachment_url = pub.publicUrl;
      }

      const { error } = await supabase.from('notices').insert({
        institute_id: instituteId,
        title,
        description,
        attachment_url,
        target,
        target_class_id: target === 'class' ? classId || null : null,
      });
      if (error) throw error;

      toast('Notice published', 'Everyone in the target audience has been notified.', 'success');
      setTitle(''); setDescription(''); setFile(null); setTarget('institute'); setClassId('');
    } catch (e: any) {
      toast('Could not publish notice', e.message ?? 'Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-semibold text-sm mb-4">Publish a Notice</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="e.g. Annual Examination Routine Published" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Audience</label>
          <select value={target} onChange={(e) => setTarget(e.target.value as any)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option value="institute">Entire Institute</option>
            <option value="teachers">Teachers</option>
            <option value="students">Students</option>
            <option value="parents">Parents</option>
            <option value="class">Specific Class</option>
          </select>
        </div>
      </div>
      {target === 'class' && (
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full md:w-64 border border-line rounded-sm px-3 py-2 text-sm">
            <option value="">Select a class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-line rounded-sm px-3 py-2 text-sm" placeholder="Short summary shown in the notification" />
      </div>
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1.5">Attach PDF (optional)</label>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      <button disabled={busy} onClick={submit} className="bg-brass hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-sm">
        {busy ? 'Publishing…' : '📣 Publish Notice'}
      </button>
    </div>
  );
}
