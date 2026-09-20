import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { toLocalISODate, formatBD } from '@/lib/date';

export default async function AttendancePage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const studentId = profile.role === 'student' ? profile.id : null;
  if (!studentId) {
    return <div className="card p-6 text-sm text-slate2-light">Attendance calendars are shown from the student's own account. A class-wide attendance sheet for staff to mark attendance is planned — see README.</div>;
  }

  // ?month=2026-09 drives which month is shown; defaults to the current month.
  const now = new Date();
  const [qy, qm] = (searchParams.month ?? '').split('-').map(Number);
  const year = qy && qm ? qy : now.getFullYear();
  const monthIndex = qy && qm ? qm - 1 : now.getMonth();

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);

  const { data: rows } = await supabase
    .from('attendance').select('date, status').eq('student_id', studentId)
    .gte('date', toLocalISODate(monthStart)).lte('date', toLocalISODate(monthEnd));

  const map = new Map((rows ?? []).map((r) => [r.date, r.status]));
  const days = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const iso = toLocalISODate(d);
    days.push({ date: iso, status: (map.get(iso) as any) ?? null });
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink mb-6">Attendance</h1>
      <div className="max-w-md">
        <AttendanceCalendar
          monthLabel={formatBD(monthStart, { month: 'long', year: 'numeric' })}
          days={days}
          prevHref={`/dashboard/attendance?month=${toLocalISODate(prevMonth).slice(0, 7)}`}
          nextHref={`/dashboard/attendance?month=${toLocalISODate(nextMonth).slice(0, 7)}`}
        />
      </div>
    </div>
  );
}
