import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SubjectAssignPanel } from '@/components/SubjectAssignPanel';

export default async function ClassSubjectsPage({ params }: { params: { classId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');

  const { data: classRow } = await supabase.from('classes').select('id, name').eq('id', params.classId).single();
  const { data: subjects } = await supabase.from('subjects').select('id, name, is_optional').eq('class_id', params.classId);
  const { data: students } = await supabase.from('students').select('id, student_code, profiles(full_name)').eq('class_id', params.classId);
  const { data: assignments } = await supabase.from('student_subjects').select('student_id, subject_id, is_fourth_subject').eq('institute_id', profile.institute_id);

  const initialStudents = (students ?? []).map((s: any) => {
    const mine = (assignments ?? []).filter((a) => a.student_id === s.id);
    return {
      id: s.id,
      name: s.profiles?.full_name ?? s.student_code,
      code: s.student_code,
      assigned: mine.map((a) => a.subject_id),
      fourthSubjectId: mine.find((a) => a.is_fourth_subject)?.subject_id ?? null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">{classRow?.name} — Subject Assignment</h1>
        <p className="text-sm text-slate2-light mt-1">Assign subjects to the whole class at once, or customize per student — including the optional 4th subject.</p>
      </div>
      <SubjectAssignPanel
        instituteId={profile.institute_id}
        classId={params.classId}
        subjects={subjects ?? []}
        initialStudents={initialStudents}
      />
    </div>
  );
}
