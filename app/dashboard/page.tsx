import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PersonHero } from '@/components/PersonHero';

export default async function DashboardHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, institutes(name, logo_url)').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const instituteId = profile.institute_id;
  const instituteName = (profile as any).institutes?.name ?? 'Biddyangon';

  let heroFields: { label: string; value: string }[] = [{ label: 'Role', value: profile.role.replace(/_/g, ' ') }, { label: 'Username', value: profile.username }];
  let body: React.ReactNode = null;

  if (profile.role === 'student') {
    const { data: studentRow } = await supabase.from('students').select('*, classes(name), sections(name)').eq('id', profile.id).single();
    const { data: latestResult } = await supabase.from('results').select('*').eq('student_id', profile.id).eq('published', true).order('published_at', { ascending: false }).limit(1).maybeSingle();
    heroFields = [
      { label: 'Class', value: `${studentRow?.classes?.name ?? '—'} — ${studentRow?.sections?.name ?? '—'}` },
      { label: 'Roll', value: String(studentRow?.roll ?? '—') },
      { label: 'GPA', value: latestResult ? Number(latestResult.gpa_with_4th).toFixed(2) : '—' },
    ];
    body = (
      <div className="card p-5 max-w-lg">
        <h3 className="font-semibold text-sm mb-2">Latest Result</h3>
        {latestResult ? (
          <p className="text-sm text-slate2-light">Your most recent published result is ready to view.<Link href="/dashboard/results" className="text-indigo font-semibold ml-1">View marksheet →</Link></p>
        ) : (
          <p className="text-sm text-slate2-light">No results have been published yet.</p>
        )}
      </div>
    );
  }

  else if (profile.role === 'parent') {
    const { data: link } = await supabase.from('parent_students').select('student_id, profiles(full_name)').eq('parent_id', profile.id).limit(1).maybeSingle();
    heroFields = [{ label: 'Linked Child', value: (link as any)?.profiles?.full_name ?? 'None linked yet' }];
    body = <QuickLinks links={[['View Result', '/dashboard/results'], ['Notices', '/dashboard/notices']]} />;
  }

  else if (profile.role === 'super_admin') {
    const { count: instituteCount } = await supabase.from('institutes').select('id', { count: 'exact', head: true });
    const { count: userCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    heroFields = [{ label: 'Institutes', value: String(instituteCount ?? 0) }, { label: 'Total Users', value: String(userCount ?? 0) }];
    body = (
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard label="Institutes" value={String(instituteCount ?? 0)} />
        <StatCard label="Total Users (platform-wide)" value={String(userCount ?? 0)} />
        <div className="card p-4 flex items-center"><Link href="/dashboard/institutes" className="text-indigo text-sm font-semibold">Manage Institutes →</Link></div>
      </div>
    );
  }

  else if (instituteId) {
    const { count: studentCount } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId);
    const { count: teacherCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).in('role', ['teacher', 'class_teacher']);

    if (profile.role === 'institute_head') {
      heroFields = [{ label: 'Students', value: String(studentCount ?? 0) }, { label: 'Teachers', value: String(teacherCount ?? 0) }];
      body = (
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label="Total Students" value={String(studentCount ?? 0)} />
          <StatCard label="Total Teachers" value={String(teacherCount ?? 0)} />
          <StatCard label="Institute" value={instituteName} />
        </div>
      );
    }

    else if (profile.role === 'account') {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthPayments } = await supabase.from('payments').select('amount').eq('institute_id', instituteId).gte('created_at', startOfMonth.toISOString());
      const monthTotal = (monthPayments ?? []).reduce((a, p) => a + Number(p.amount), 0);
      heroFields = [{ label: 'Collected This Month', value: `৳${monthTotal.toLocaleString()}` }, { label: 'Payments Logged', value: String((monthPayments ?? []).length) }];
      body = (
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard label="Collected This Month" value={`৳${monthTotal.toLocaleString()}`} />
          <div className="card p-4 flex items-center"><Link href="/dashboard/payments" className="text-indigo text-sm font-semibold">Record a Payment →</Link></div>
        </div>
      );
    }

    else if (profile.role === 'exam_head') {
      const { count: draftExams } = await supabase.from('exams').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).neq('status', 'published');
      const { count: publishedExams } = await supabase.from('exams').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).eq('status', 'published');
      heroFields = [{ label: 'Exams In Progress', value: String(draftExams ?? 0) }, { label: 'Published', value: String(publishedExams ?? 0) }];
      body = (
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard label="Exams In Progress" value={String(draftExams ?? 0)} />
          <div className="card p-4 flex items-center"><Link href="/dashboard/exams" className="text-indigo text-sm font-semibold">Manage Exams →</Link></div>
        </div>
      );
    }

    else if (profile.role === 'teacher' || profile.role === 'class_teacher') {
      const { count: subjectCount } = await supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).eq('teacher_id', profile.id);
      heroFields = [{ label: 'Subjects Assigned', value: String(subjectCount ?? 0) }];
      body = (
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard label="Subjects Assigned To You" value={String(subjectCount ?? 0)} />
          <div className="card p-4 flex items-center"><Link href="/dashboard/marks" className="text-indigo text-sm font-semibold">Enter Marks →</Link></div>
        </div>
      );
    }
  }

  return (
    <div>
      <PersonHero photoUrl={profile.photo_url} name={profile.full_name} subtitle={`${instituteName} · ${profile.username}`} fields={heroFields} />
      {body}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate2-light font-semibold">{label}</div>
      <div className="font-serif text-2xl text-ink mt-2 font-semibold">{value}</div>
    </div>
  );
}

function QuickLinks({ links }: { links: [string, string][] }) {
  return (
    <div className="card p-4 flex gap-5">
      {links.map(([label, href]) => <Link key={href} href={href} className="text-indigo text-sm font-semibold">{label} →</Link>)}
    </div>
  );
}
