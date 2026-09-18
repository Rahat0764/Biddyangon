import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClassSectionManager } from '@/components/ClassSectionManager';

export default async function ClassesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');

  const { data: session } = await supabase.from('academic_sessions').select('id').eq('institute_id', profile.institute_id).eq('is_current', true).maybeSingle();
  const sessionId = session?.id ?? '';

  const { data: classesRaw } = await supabase
    .from('classes').select('id, name, sections(id, name, class_teacher_id, profiles(full_name))')
    .eq('institute_id', profile.institute_id).order('display_order');

  const { data: teachersRaw } = await supabase
    .from('profiles').select('id, full_name').eq('institute_id', profile.institute_id).in('role', ['teacher', 'class_teacher']);

  const classes = (classesRaw ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    sections: (c.sections ?? []).map((s: any) => ({
      id: s.id, name: s.name, class_teacher_id: s.class_teacher_id, class_teacher_name: s.profiles?.full_name,
    })),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Classes &amp; Sections</h1>
        <p className="text-sm text-slate2-light mt-1">Add as many sections as each class needs, and assign a class teacher to each one.</p>
      </div>
      <ClassSectionManager
        instituteId={profile.institute_id}
        sessionId={sessionId}
        initialClasses={classes}
        teachers={teachersRaw ?? []}
      />
      <div className="mt-6 text-sm">
        <span className="text-slate2-light">Need to assign subjects to a class? </span>
        {classes.map((c: any) => (
          <a key={c.id} href={`/dashboard/classes/${c.id}/subjects`} className="text-indigo font-semibold mr-3">{c.name} subjects →</a>
        ))}
      </div>
    </div>
  );
}
