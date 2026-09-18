'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

interface ClassOption { id: string; name: string; }

export function ExamCreateForm({ instituteId, sessionId, classes, onCreated }: { instituteId: string; sessionId: string; classes: ClassOption[]; onCreated: (row: any) => void }) {
  const supabase = createClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [examType, setExamType] = useState('Half-Yearly');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !classId) { toast('Missing info', 'Name and class are required.', 'error'); return; }
    setBusy(true);
    const { data, error } = await supabase.from('exams').insert({
      institute_id: instituteId, session_id: sessionId || null, class_id: classId, name, exam_type: examType, status: 'draft',
    }).select('*, classes(name)').single();
    setBusy(false);
    if (error) { toast('Could not create exam', error.message, 'error'); return; }
    toast('Exam created', `${data.name} is ready. Teachers can now enter marks.`, 'success');
    onCreated(data);
    setName(''); setClassId(''); setOpen(false);
  }

  if (!open) return <button onClick={() => setOpen(true)} className="bg-indigo text-white text-sm font-semibold px-4 py-2.5 rounded-sm">+ Create Exam</button>;

  return (
    <div className="card p-5 mb-6 max-w-lg">
      <h3 className="font-semibold text-sm mb-4">Create Exam</h3>
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1.5">Exam Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Examination 2026" className="w-full border border-line rounded-sm px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option value="">Select</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option>Class Test</option><option>Monthly Exam</option><option>Half-Yearly</option><option>Model Test</option><option>Annual Examination</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={submit} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">{busy ? 'Creating…' : 'Create Exam'}</button>
        <button onClick={() => setOpen(false)} className="border border-line text-sm font-semibold px-4 py-2 rounded-sm">Cancel</button>
      </div>
    </div>
  );
}
