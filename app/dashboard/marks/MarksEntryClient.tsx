'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';

interface SubjectOpt {
  id: string; name: string; code: string; full_marks: number;
  theory_marks: number | null; mcq_marks: number | null; practical_marks: number | null;
  class_id: string; classes?: { name: string };
}
interface ExamOpt { id: string; name: string; class_id: string }
interface StudentMarkRow {
  studentId: string; name: string; code: string;
  written: string; mcq: string; practical: string;
  status: string; touched: boolean; // touched = has a saved row OR the teacher edited it this session
}

export function MarksEntryClient({ instituteId, actorId, subjects, exams }: { instituteId: string; actorId: string; subjects: SubjectOpt[]; exams: ExamOpt[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const subject = subjects.find((s) => s.id === subjectId);
  const examsForSubject = exams.filter((e) => !subject || e.class_id === subject.class_id);

  // BUG FIXED: this used to be hardcoded 70/30 regardless of the subject.
  // The schema has always had theory_marks/mcq_marks/practical_marks per
  // subject — now we actually use them, and fall back to a 70/30 split
  // only when a subject hasn't had those configured.
  const writtenMax = subject?.theory_marks ?? (subject ? Math.round(subject.full_marks * 0.7) : 70);
  const mcqMax = subject?.mcq_marks ?? (subject ? subject.full_marks - writtenMax : 30);
  const practicalMax = subject?.practical_marks ?? 0;
  const hasPractical = practicalMax > 0;

  useEffect(() => {
    if (!subject || !examId) { setRows([]); return; }
    setLoading(true);
    (async () => {
      // BUG FIXED: this used to load every student in the class, regardless
      // of whether they were actually assigned this subject. For an
      // optional/4th subject, that meant a mark row (often 0) got created
      // for students who never took it — and computeResult() then failed
      // them for a subject they weren't even enrolled in. We now only load
      // students with a student_subjects row for this exact subject.
      const { data: assigned } = await supabase
        .from('student_subjects')
        .select('student_id, students!inner(student_code, class_id, profiles(full_name))')
        .eq('subject_id', subject.id);

      const relevant = (assigned ?? []).filter((a: any) => a.students?.class_id === subject.class_id);

      const { data: existing } = await supabase
        .from('marks').select('student_id, written, mcq, practical, status')
        .eq('exam_id', examId).eq('subject_id', subject.id);
      const map = new Map((existing ?? []).map((m) => [m.student_id, m]));

      setRows(relevant.map((a: any) => {
        const ex = map.get(a.student_id);
        return {
          studentId: a.student_id,
          name: a.students?.profiles?.full_name ?? a.students?.student_code,
          code: a.students?.student_code,
          written: ex?.written?.toString() ?? '',
          mcq: ex?.mcq?.toString() ?? '',
          practical: ex?.practical?.toString() ?? '',
          status: ex?.status ?? 'draft',
          touched: !!ex,
        };
      }));
      setLoading(false);
    })();
  }, [subjectId, examId]);

  function updateCell(studentId: string, field: 'written' | 'mcq' | 'practical', rawValue: string) {
    const max = field === 'written' ? writtenMax : field === 'mcq' ? mcqMax : practicalMax;
    // Client-side range guard — the authoritative check still happens in
    // the database via a CHECK constraint (see security_patch.sql), since
    // a client-side check alone can always be bypassed from devtools.
    let value = rawValue;
    if (value !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) value = String(Math.max(0, Math.min(max, n)));
    }
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, [field]: value, touched: true } : r)));
  }

  async function save(finalStatus: 'draft' | 'submitted') {
    if (!subject || !examId) return;
    setSaving(true);

    // BUG FIXED: previously every row (including untouched blanks and
    // already-verified rows) was upserted on every save. That meant (a)
    // phantom zero-mark rows got created for students the teacher never
    // touched, and (b) re-saving after a subject was verified silently
    // reset it back to draft/submitted, undoing the exam department's work.
    const editable = rows.filter((r) => r.touched && r.status !== 'verified' && r.status !== 'published');
    const skippedLocked = rows.some((r) => r.touched && (r.status === 'verified' || r.status === 'published'));

    if (editable.length === 0) {
      toast('Nothing to save', 'Enter at least one mark first.', 'info');
      setSaving(false);
      return;
    }

    const payload = editable.map((r) => ({
      institute_id: instituteId, exam_id: examId, student_id: r.studentId, subject_id: subject.id,
      written: r.written === '' ? null : Number(r.written),
      mcq: r.mcq === '' ? null : Number(r.mcq),
      practical: hasPractical ? (r.practical === '' ? null : Number(r.practical)) : null,
      status: finalStatus, submitted_by: actorId,
    }));
    const { error } = await supabase.from('marks').upsert(payload, { onConflict: 'exam_id,student_id,subject_id' });
    setSaving(false);
    if (error) { toast('Could not save', error.message, 'error'); return; }

    setRows((rs) => rs.map((r) => (editable.some((e) => e.studentId === r.studentId) ? { ...r, status: finalStatus } : r)));
    if (skippedLocked) toast('Some marks were locked', 'Rows already verified were left untouched.', 'info');
    toast(
      finalStatus === 'draft' ? 'Draft saved' : 'Marks submitted',
      finalStatus === 'draft' ? 'Not visible to students yet.' : 'Sent to the Exam Department for verification.',
      finalStatus === 'draft' ? 'info' : 'success'
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Marks Entry</h1>
        <p className="text-sm text-slate2-light mt-1">Pick a subject you teach and an exam. Only students actually assigned this subject are listed.</p>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Subject</label>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setExamId(''); }} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
              <option value="">Select a subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.classes?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Exam</label>
            <select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={!subjectId} className="w-full border border-line rounded-sm px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Select an exam</option>
              {examsForSubject.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
        {subjects.length === 0 && <p className="text-xs text-slate2-light mt-3">No subjects are assigned to you yet — ask your Institute Head to assign one.</p>}
      </div>

      {subject && examId && (
        <div className="card p-5">
          {loading ? (
            <p className="text-sm text-slate2-light">Loading students…</p>
          ) : (
            <>
              <div className="scroll-x border border-line rounded-DEFAULT mb-5">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Written ({writtenMax})</th>
                      <th>MCQ ({mcqMax})</th>
                      {hasPractical && <th>Practical ({practicalMax})</th>}
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const hasAnyMark = r.written !== '' || r.mcq !== '' || r.practical !== '';
                      const total = (Number(r.written) || 0) + (Number(r.mcq) || 0) + (Number(r.practical) || 0);
                      const locked = r.status === 'verified' || r.status === 'published';
                      return (
                        <tr key={r.studentId}>
                          <td>{r.name}<div className="text-[11px] text-slate2-light font-mono">{r.code}</div></td>
                          <td><input type="number" min={0} max={writtenMax} value={r.written} disabled={locked} onChange={(e) => updateCell(r.studentId, 'written', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1.5 text-sm disabled:bg-paper transition-colors" /></td>
                          <td><input type="number" min={0} max={mcqMax} value={r.mcq} disabled={locked} onChange={(e) => updateCell(r.studentId, 'mcq', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1.5 text-sm disabled:bg-paper transition-colors" /></td>
                          {hasPractical && <td><input type="number" min={0} max={practicalMax} value={r.practical} disabled={locked} onChange={(e) => updateCell(r.studentId, 'practical', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1.5 text-sm disabled:bg-paper transition-colors" /></td>}
                          {/* BUG FIXED: `total || '—'` used to show '—' for a genuine 0 mark, same as an empty row. Now distinguished by hasAnyMark. */}
                          <td className="font-semibold">{hasAnyMark ? total : '—'}</td>
                          <td><span className="text-xs font-semibold capitalize">{r.status}</span></td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && <tr><td colSpan={hasPractical ? 6 : 5} className="text-slate2-light">No students are assigned this subject yet — assign it from the class's Subjects page first.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button disabled={saving} onClick={() => save('draft')} className="border border-line text-sm font-semibold px-4 py-2 rounded-sm hover:bg-paper disabled:opacity-50 transition-colors">Save Draft</button>
                <button
                  disabled={saving}
                  onClick={() => { if (window.confirm('Submit marks? Once submitted you cannot freely edit them without an approved correction.')) save('submitted'); }}
                  className="bg-indigo text-white text-sm font-semibold px-4 py-2 rounded-sm disabled:opacity-50 transition-colors"
                >
                  Submit Marks
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
