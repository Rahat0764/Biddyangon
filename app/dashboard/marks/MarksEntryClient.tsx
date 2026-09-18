'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';

interface SubjectOpt { id: string; name: string; code: string; full_marks: number; class_id: string; classes?: { name: string } }
interface ExamOpt { id: string; name: string; class_id: string }
interface StudentMarkRow { studentId: string; name: string; code: string; written: string; mcq: string; status: string; }

export function MarksEntryClient({ instituteId, actorId, subjects, exams }: { instituteId: string; actorId: string; subjects: SubjectOpt[]; exams: ExamOpt[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [loading, setLoading] = useState(false);

  const subject = subjects.find((s) => s.id === subjectId);
  const examsForSubject = exams.filter((e) => !subject || e.class_id === subject.class_id);
  const written_max = subject ? Math.round(subject.full_marks * 0.7) : 70;
  const mcq_max = subject ? subject.full_marks - written_max : 30;

  useEffect(() => {
    if (!subject || !examId) { setRows([]); return; }
    setLoading(true);
    (async () => {
      const { data: students } = await supabase.from('students').select('id, student_code, profiles(full_name)').eq('class_id', subject.class_id);
      const { data: existing } = await supabase.from('marks').select('student_id, written, mcq, status').eq('exam_id', examId).eq('subject_id', subject.id);
      const map = new Map((existing ?? []).map((m) => [m.student_id, m]));
      setRows((students ?? []).map((s: any) => {
        const ex = map.get(s.id);
        return { studentId: s.id, name: s.profiles?.full_name ?? s.student_code, code: s.student_code, written: ex?.written?.toString() ?? '', mcq: ex?.mcq?.toString() ?? '', status: ex?.status ?? 'draft' };
      }));
      setLoading(false);
    })();
  }, [subjectId, examId]);

  function updateCell(studentId: string, field: 'written' | 'mcq', value: string) {
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)));
  }

  async function save(finalStatus: 'draft' | 'submitted') {
    if (!subject || !examId) return;
    const payload = rows.map((r) => ({
      institute_id: instituteId, exam_id: examId, student_id: r.studentId, subject_id: subject.id,
      written: r.written === '' ? null : Number(r.written), mcq: r.mcq === '' ? null : Number(r.mcq),
      status: finalStatus, submitted_by: actorId,
    }));
    const { error } = await supabase.from('marks').upsert(payload, { onConflict: 'exam_id,student_id,subject_id' });
    if (error) { toast('Could not save', error.message, 'error'); return; }
    setRows((rs) => rs.map((r) => ({ ...r, status: finalStatus })));
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
        <p className="text-sm text-slate2-light mt-1">Pick a subject you teach and an exam, then enter marks for every student in that class.</p>
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
                  <thead><tr><th>Student</th><th>Written ({written_max})</th><th>MCQ ({mcq_max})</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const total = (Number(r.written) || 0) + (Number(r.mcq) || 0);
                      const locked = r.status === 'verified' || r.status === 'published';
                      return (
                        <tr key={r.studentId}>
                          <td>{r.name}<div className="text-[11px] text-slate2-light font-mono">{r.code}</div></td>
                          <td><input type="number" min={0} max={written_max} value={r.written} disabled={locked} onChange={(e) => updateCell(r.studentId, 'written', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1.5 text-sm disabled:bg-paper" /></td>
                          <td><input type="number" min={0} max={mcq_max} value={r.mcq} disabled={locked} onChange={(e) => updateCell(r.studentId, 'mcq', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1.5 text-sm disabled:bg-paper" /></td>
                          <td className="font-semibold">{total || '—'}</td>
                          <td><span className="text-xs font-semibold capitalize">{r.status}</span></td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && <tr><td colSpan={5} className="text-slate2-light">No students found in this class.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button onClick={() => save('draft')} className="border border-line text-sm font-semibold px-4 py-2 rounded-sm hover:bg-paper">Save Draft</button>
                <button
                  onClick={() => { if (confirm('Submit marks? Once submitted you cannot freely edit them without an approved correction.')) save('submitted'); }}
                  className="bg-indigo text-white text-sm font-semibold px-4 py-2 rounded-sm"
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
