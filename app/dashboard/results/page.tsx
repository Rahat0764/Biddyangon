import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Marksheet } from '@/components/Marksheet';
import { computeResult } from '@/lib/gpa';
import type { MarkRow } from '@/lib/types';

export default async function ResultsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, institutes(name, logo_url, grading_policy)').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');

  // This page renders a single student's marksheet. Staff who manage exams
  // use the exam list (verify/publish flow) instead — see /dashboard/exams.
  if (['exam_head', 'account'].includes(profile.role)) redirect('/dashboard/exams');

  // For a parent, fall back to their first linked child; for a student, it's themself.
  let studentProfileId = profile.id;
  if (profile.role === 'parent') {
    const { data: link } = await supabase.from('parent_students').select('student_id').eq('parent_id', profile.id).limit(1).maybeSingle();
    if (!link) return <Empty text="No children are linked to this account yet." />;
    studentProfileId = link.student_id;
  }

  const { data: student } = await supabase
    .from('students').select('*, classes(name), sections(name), profiles(full_name, photo_url)')
    .eq('id', studentProfileId).single();

  const { data: result } = await supabase
    .from('results').select('*, exams(name)').eq('student_id', studentProfileId).eq('published', true)
    .order('published_at', { ascending: false }).limit(1).maybeSingle();

  if (!result || !student) return <Empty text="No published results yet. Check back after the exam department publishes them." />;

  const { data: marksRaw } = await supabase
    .from('marks').select('written, mcq, practical, total, subjects(id, name, code, full_marks)')
    .eq('exam_id', result.exam_id).eq('student_id', studentProfileId);

  const { data: subjectAssignments } = await supabase
    .from('student_subjects').select('subject_id, is_fourth_subject').eq('student_id', studentProfileId);

  const marks: MarkRow[] = (marksRaw ?? []).map((m: any) => ({
    subject: m.subjects,
    written: m.written, mcq: m.mcq, practical: m.practical, total: m.total,
    is_fourth_subject: (subjectAssignments ?? []).find((a) => a.subject_id === m.subjects.id)?.is_fourth_subject ?? false,
  }));

  const computed = computeResult(marks, (profile as any).institutes.grading_policy);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Results</h1>
        <p className="text-sm text-slate2-light mt-1">{(result as any).exams?.name}</p>
      </div>
      <Marksheet
        instituteName={(profile as any).institutes.name}
        instituteLogoUrl={(profile as any).institutes.logo_url}
        studentName={(student as any).profiles.full_name}
        studentPhotoUrl={(student as any).profiles.photo_url}
        studentCode={student.student_code}
        className={(student as any).classes?.name ?? '—'}
        sectionName={(student as any).sections?.name ?? '—'}
        roll={student.roll ?? '—'}
        session="2026"
        examName={(result as any).exams?.name ?? 'Examination'}
        publishedDate={result.published_at ? new Date(result.published_at).toLocaleDateString() : '—'}
        verificationCode={result.verification_code}
        result={computed}
      />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card p-8 text-center text-sm text-slate2-light">{text}</div>;
}
