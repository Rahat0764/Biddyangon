'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';

interface SubjectStat { id: string; name: string; code: string; is_optional: boolean; submitted: number; verified: number; total: number; }

export function ExamDetailClient({
  exam, subjects, actorId,
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
    // BUG FIXED: this used to loop over every student in the browser, firing
    // several sequential requests per student (marks, assignments, upsert).
    // For 40+ students that's 100+ round trips, it wasn't wrapped in a
    // transaction, GPA was computed with client-supplied data, and a
    // mid-loop failure (closed tab, dropped connection) left half the class
    // published and half not. Publishing now calls a single Postgres
    // function (publish_exam_results, in security_patch.sql) that does the
    // whole class in one atomic transaction, re-checks that every mark is
    // verified and that the caller is actually authorized, and computes
    // GPA server-side — the browser can no longer influence the numbers.
    const { data, error } = await supabase.rpc('publish_exam_results', { p_exam_id: exam.id });
    setPublishing(false);
    if (error) {
      toast('Publish failed', error.message, 'error');
      return;
    }
    setStatus('published');
    toast('Results published', `${exam.name} results are now live for ${data ?? 0} students.`, 'success');
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
