'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

interface SubjectOption { id: string; name: string; is_optional: boolean; }
interface StudentRow { id: string; name: string; code: string; assigned: string[]; fourthSubjectId: string | null; }

export function SubjectAssignPanel({
  instituteId, classId, subjects, initialStudents,
}: { instituteId: string; classId: string; subjects: SubjectOption[]; initialStudents: StudentRow[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [students, setStudents] = useState(initialStudents);
  const [bulkSubject, setBulkSubject] = useState('');
  const [busy, setBusy] = useState(false);

  const compulsory = subjects.filter((s) => !s.is_optional);
  const optional = subjects.filter((s) => s.is_optional);

  async function assignToWholeClass() {
    if (!bulkSubject) return;
    setBusy(true);
    const rows = students
      .filter((s) => !s.assigned.includes(bulkSubject))
      .map((s) => ({ institute_id: instituteId, student_id: s.id, subject_id: bulkSubject, is_fourth_subject: false }));
    if (rows.length > 0) {
      const { error } = await supabase.from('student_subjects').insert(rows);
      if (error) { toast('Could not assign subject', error.message, 'error'); setBusy(false); return; }
    }
    setStudents((ss) => ss.map((s) => ({ ...s, assigned: s.assigned.includes(bulkSubject) ? s.assigned : [...s.assigned, bulkSubject] })));
    toast('Subject assigned to class', `Given to everyone who didn't already have it.`, 'success');
    setBusy(false);
  }

  async function toggleIndividual(studentId: string, subjectId: string, has: boolean) {
    if (has) {
      const { error } = await supabase.from('student_subjects').delete().match({ student_id: studentId, subject_id: subjectId });
      if (error) { toast('Could not remove subject', error.message, 'error'); return; }
      setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, assigned: s.assigned.filter((x) => x !== subjectId), fourthSubjectId: s.fourthSubjectId === subjectId ? null : s.fourthSubjectId } : s));
    } else {
      const { error } = await supabase.from('student_subjects').insert({ institute_id: instituteId, student_id: studentId, subject_id: subjectId, is_fourth_subject: false });
      if (error) { toast('Could not assign subject', error.message, 'error'); return; }
      setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, assigned: [...s.assigned, subjectId] } : s));
    }
  }

  async function setFourthSubject(studentId: string, subjectId: string) {
    const { error } = await supabase.from('student_subjects')
      .update({ is_fourth_subject: false }).eq('student_id', studentId).eq('is_fourth_subject', true);
    if (!error && subjectId) {
      await supabase.from('student_subjects').update({ is_fourth_subject: true }).match({ student_id: studentId, subject_id: subjectId });
    }
    setStudents((ss) => ss.map((s) => s.id === studentId ? { ...s, fourthSubjectId: subjectId || null } : s));
    toast('4th subject set', 'Bonus GPA will use this subject.', 'success');
  }

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-sm mb-3">Assign a Subject to the Whole Class</h3>
        <p className="text-xs text-slate2-light mb-3">Gives every student in this class the subject at once. You can still remove or customize it per student below.</p>
        <div className="flex gap-3">
          <select value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} className="border border-line rounded-sm px-3 py-2 text-sm flex-1 max-w-xs">
            <option value="">Select a subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_optional ? ' (optional / 4th)' : ''}</option>)}
          </select>
          <button disabled={busy || !bulkSubject} onClick={assignToWholeClass} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">Assign to Class</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-3">Individual Assignment</h3>
        <p className="text-xs text-slate2-light mb-3">Tick subjects per student, and choose one optional subject as their 4th subject.</p>
        <div className="scroll-x border border-line rounded-DEFAULT">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                {subjects.map((s) => <th key={s.id}>{s.name}</th>)}
                <th>4th Subject</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id}>
                  <td className="font-semibold">{st.name}<div className="text-[11px] text-slate2-light font-normal">{st.code}</div></td>
                  {subjects.map((s) => {
                    const has = st.assigned.includes(s.id);
                    return (
                      <td key={s.id}>
                        <input type="checkbox" checked={has} onChange={() => toggleIndividual(st.id, s.id, has)} />
                      </td>
                    );
                  })}
                  <td>
                    <select
                      value={st.fourthSubjectId ?? ''}
                      onChange={(e) => setFourthSubject(st.id, e.target.value)}
                      className="border border-line rounded-sm px-2 py-1 text-xs"
                    >
                      <option value="">None</option>
                      {optional.filter((o) => st.assigned.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
