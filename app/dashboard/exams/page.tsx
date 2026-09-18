import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExamsClient } from './ExamsClient';

export default async function ExamsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');
  if (!['exam_head', 'institute_head', 'super_admin'].includes(profile.role)) redirect('/dashboard');

  const { data: exams } = await supabase.from('exams').select('*, classes(name)').eq('institute_id', profile.institute_id).order('created_at', { ascending: false });
  const { data: classes } = await supabase.from('classes').select('id, name').eq('institute_id', profile.institute_id);
  const { data: session } = await supabase.from('academic_sessions').select('id').eq('institute_id', profile.institute_id).eq('is_current', true).maybeSingle();

  return (
    <ExamsClient
      instituteId={profile.institute_id}
      sessionId={session?.id ?? ''}
      classes={classes ?? []}
      initialExams={exams ?? []}
    />
  );
}
