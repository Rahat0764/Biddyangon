import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';

export default async function AttendancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const studentId = profile.role === 'student' ? profile.id : null;
  if (!studentId) {
    return <div className="card p-6 text-sm text-slate2-light">Attendance calendars are shown from the student's own account. Staff can mark attendance from the class attendance sheet.</div>;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: rows } = await supabase
    .from('attendance').select('date, status').eq('student_id', studentId)
    .gte('date', monthStart.toISOString().slice(0, 10)).lte('date', monthEnd.toISOString().slice(0, 10));

  const map = new Map((rows ?? []).map((r) => [r.date, r.status]));
  const days = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, status: (map.get(iso) as any) ?? null });
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink mb-6">Attendance</h1>
      <div className="max-w-md">
        <AttendanceCalendar monthLabel={monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} days={days} />
      </div>
    </div>
  );
}
