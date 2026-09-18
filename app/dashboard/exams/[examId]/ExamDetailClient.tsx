'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';
import { computeResult } from '@/lib/gpa';
import type { MarkRow } from '@/lib/types';

interface SubjectStat { id: string; name: string; code: string; is_optional: boolean; submitted: number; verified: number; total: number; }

export function ExamDetailClient({
  exam, instituteId, gradingPolicy, subjects, actorId,
}: { exam: any; instituteId: string; gradingPolicy: any; subjects: SubjectStat[]; actorId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [stats, setStats] = useState(subjects);
  const [status, setStatus] = useState(exam.status);
  const [publishing, setPublishing] = useState(false);

  const allVerified = stats.length > 0 && stats.every((s) => s.total > 0 && s.verified === s.total);

  async function verifySubject(subjectId: string) {
    const { error } = await supabase.from('marks').update({ status: 'verified', verified_by: actorId })
      .eq('exam_id', exam.id).eq('subject_id', subjectId).eq('status', 'submitted');
    if (error) { toast('Could not verify', error.message, 'error'); return; }
    setStats((ss) => ss.map((s) => (s.id === subjectId ? { ...s, verified: s.total, submitted: 0 } : s)));
    toast('Marks verified', 'This subject is ready for result publication.', 'success');
  }

  async function publishResults() {
    setPublishing(true);
    try {
      const { data: students } = await supabase.from('students').select('id, roll').eq('class_id', exam.class_id);
      if (!students || students.length === 0) throw new Error('No students found in this class.');

      for (const student of students) {
        const { data: marksRaw } = await supabase
          .from('marks').select('written, mcq, practical, total, subjects(id, name, code, full_marks)')
          .eq('exam_id', exam.id).eq('student_id', student.id);
        if (!marksRaw || marksRaw.length === 0) continue;

        const { data: assignments } = await supabase.from('student_subjects').select('subject_id, is_fourth_subject').eq('student_id', student.id);

        const marks: MarkRow[] = marksRaw.map((m: any) => ({
          subject: m.subjects, written: m.written, mcq: m.mcq, practical: m.practical, total: m.total,
          is_fourth_subject: (assignments ?? []).find((a) => a.subject_id === m.subjects.id)?.is_fourth_subject ?? false,
        }));

        const computed = computeResult(marks, gradingPolicy);

        await supabase.from('results').upsert({
          institute_id: instituteId, exam_id: exam.id, student_id: student.id,
          total_obtained: computed.totalObtained, total_full: computed.totalFull,
          gpa_without_4th: computed.gpaWithout4th, gpa_with_4th: computed.gpaWith4th,
          overall_grade: computed.overallGrade, result_status: computed.passed ? 'passed' : 'failed',
          published: true, published_at: new Date().toISOString(), published_by: actorId,
        }, { onConflict: 'exam_id,student_id' });
      }

      await supabase.from('exams').update({ status: 'published' }).eq('id', exam.id);
      setStatus('published');
      toast('Results published', `${exam.name} results are now live for students and guardians.`, 'success');
    } catch (e: any) {
      toast('Publish failed', e.message, 'error');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">{exam.name}</h1>
        <p className="text-sm text-slate2-light mt-1">{exam.classes?.name} · {exam.exam_type}</p>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-sm mb-3">Marks Verification</h3>
        <div className="scroll-x border border-line rounded-DEFAULT">
          <table>
            <thead><tr><th>Subject</th><th>Submitted</th><th>Verified</th><th></th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}{s.is_optional && <span className="text-slate2-light text-xs"> (optional)</span>}</td>
                  <td>{s.total === 0 ? <span className="text-slate2-light">No marks entered</span> : `${s.submitted + s.verified}/${s.total}`}</td>
                  <td>{s.total > 0 ? `${s.verified}/${s.total}` : '—'}</td>
                  <td>
                    {s.total > 0 && s.verified < s.total ? (
                      <button onClick={() => verifySubject(s.id)} className="border border-line text-xs font-semibold px-2.5 py-1 rounded-sm hover:bg-paper">Verify</button>
                    ) : s.total > 0 ? (
                      <span className="text-xs font-semibold text-success">✔ Verified</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Publish Results</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${status === 'published' ? 'bg-success-bg text-success' : 'bg-warn-bg text-warn'}`}>{status}</span>
        </div>
        <p className="text-xs text-slate2-light mb-4">All subjects must be verified first. Publishing computes each student's GPA (with and without the 4th subject) and makes it visible to students and guardians immediately.</p>
        <button
          disabled={!allVerified || publishing || status === 'published'}
          onClick={() => {
            if (confirm(`Publish ${exam.name}? Students and guardians will see it immediately.`)) publishResults();
          }}
          className="bg-brass disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-sm"
        >
          {publishing ? 'Publishing…' : status === 'published' ? '✔ Published' : '📣 Publish Result'}
        </button>
      </div>
    </div>
  );
}
