import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExamDetailClient } from './ExamDetailClient';

export default async function ExamDetailPage({ params }: { params: { examId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*, institutes(name, grading_policy)').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['exam_head', 'institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const { data: exam } = await supabase.from('exams').select('*, classes(id, name)').eq('id', params.examId).single();
  if (!exam) redirect('/dashboard/exams');

  const { data: subjects } = await supabase.from('subjects').select('id, name, code, is_optional').eq('class_id', exam.class_id);

  const subjectStats = await Promise.all((subjects ?? []).map(async (s) => {
    const { count: submitted } = await supabase.from('marks').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id).eq('subject_id', s.id).eq('status', 'submitted');
    const { count: verified } = await supabase.from('marks').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id).eq('subject_id', s.id).eq('status', 'verified');
    const { count: total } = await supabase.from('marks').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id).eq('subject_id', s.id);
    return { ...s, submitted: submitted ?? 0, verified: verified ?? 0, total: total ?? 0 };
  }));

  return (
    <ExamDetailClient
      exam={exam}
      instituteId={profile.institute_id}
      gradingPolicy={(profile as any).institutes.grading_policy}
      subjects={subjectStats}
      actorId={profile.id}
    />
  );
}
