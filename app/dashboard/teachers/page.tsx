import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AddTeacherButton } from '@/components/AddTeacherButton';

export default async function TeachersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, institute_id').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, full_name, username, photo_url, phone, designation, role')
    .eq('institute_id', profile.institute_id)
    .in('role', ['teacher', 'class_teacher'])
    .order('full_name');

  const { data: subjects } = await supabase.from('subjects').select('teacher_id, name').eq('institute_id', profile.institute_id);
  const subjectsByTeacher = new Map<string, string[]>();
  (subjects ?? []).forEach((s) => {
    if (!s.teacher_id) return;
    subjectsByTeacher.set(s.teacher_id, [...(subjectsByTeacher.get(s.teacher_id) ?? []), s.name]);
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Teachers</h1>
          <p className="text-sm text-slate2-light mt-1">{(teachers ?? []).length} teaching staff at this institute.</p>
        </div>
        <AddTeacherButton />
      </div>

      <p className="text-xs text-slate2-light mb-5">Assigning a teacher to a subject happens from that class's Subjects page.</p>

      <div className="scroll-x border border-line rounded-DEFAULT bg-white">
        <table>
          <thead><tr><th></th><th>Teacher</th><th>Username</th><th>Role</th><th>Subjects</th><th>Phone</th></tr></thead>
          <tbody>
            {(teachers ?? []).map((t) => (
              <tr key={t.id}>
                <td>
                  {t.photo_url ? (
                    <img src={t.photo_url} className="w-8 h-8 rounded-full object-cover" alt={t.full_name} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-tint flex items-center justify-center text-[10px] font-bold text-indigo-dark">
                      {t.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="font-semibold">{t.full_name}<div className="text-[11px] text-slate2-light font-normal">{t.designation ?? ''}</div></td>
                <td className="font-mono">{t.username}</td>
                <td className="capitalize">{t.role.replace(/_/g, ' ')}</td>
                <td>{(subjectsByTeacher.get(t.id) ?? []).join(', ') || <span className="text-slate2-light">Not assigned</span>}</td>
                <td>{t.phone ?? '—'}</td>
              </tr>
            ))}
            {(teachers ?? []).length === 0 && <tr><td colSpan={6} className="text-slate2-light">No teachers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
