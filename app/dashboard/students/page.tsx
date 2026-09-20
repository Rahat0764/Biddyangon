import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function StudentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, institute_id').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const { data: students } = await supabase
    .from('students')
    .select('student_code, roll, status, classes(name), sections(name), profiles(full_name, photo_url, phone)')
    .eq('institute_id', profile.institute_id)
    .order('student_code');

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Students</h1>
          <p className="text-sm text-slate2-light mt-1">{(students ?? []).length} students enrolled this session.</p>
        </div>
        <Link href="/dashboard/students/import" className="bg-indigo text-white text-sm font-semibold px-4 py-2.5 rounded-sm">⬆ Bulk Import (CSV)</Link>
      </div>

      <div className="scroll-x border border-line rounded-DEFAULT bg-white">
        <table>
          <thead><tr><th></th><th>Student</th><th>ID</th><th>Class</th><th>Roll</th><th>Phone</th><th>Status</th></tr></thead>
          <tbody>
            {(students ?? []).map((s: any) => (
              <tr key={s.student_code}>
                <td>
                  {s.profiles?.photo_url ? (
                    <img src={s.profiles.photo_url} className="w-8 h-8 rounded-full object-cover" alt={s.profiles?.full_name} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-tint flex items-center justify-center text-[10px] font-bold text-indigo-dark">
                      {(s.profiles?.full_name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="font-semibold">{s.profiles?.full_name ?? '—'}</td>
                <td className="font-mono">{s.student_code}</td>
                <td>{s.classes?.name ?? '—'} — {s.sections?.name ?? '—'}</td>
                <td>{s.roll ?? '—'}</td>
                <td>{s.profiles?.phone ?? '—'}</td>
                <td><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success capitalize">{s.status}</span></td>
              </tr>
            ))}
            {(students ?? []).length === 0 && <tr><td colSpan={7} className="text-slate2-light">No students yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
