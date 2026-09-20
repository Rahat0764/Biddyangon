import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MarksEntryClient } from './MarksEntryClient';

export default async function MarksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['teacher', 'class_teacher', 'institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  // Subjects this teacher is assigned to (institute_head/super_admin see every subject).
  let subjectsQuery = supabase.from('subjects').select('id, name, code, full_marks, theory_marks, mcq_marks, practical_marks, class_id, classes(name)').eq('institute_id', profile.institute_id);
  if (profile.role === 'teacher' || profile.role === 'class_teacher') subjectsQuery = subjectsQuery.eq('teacher_id', profile.id);
  const { data: subjects } = await subjectsQuery;

  const { data: exams } = await supabase.from('exams').select('id, name, class_id').eq('institute_id', profile.institute_id).neq('status', 'published');

  return <MarksEntryClient instituteId={profile.institute_id} actorId={profile.id} subjects={subjects ?? []} exams={(exams as any) ?? []} />;
}
