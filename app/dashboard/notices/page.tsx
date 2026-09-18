import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NoticeUploadForm } from '@/components/NoticeUploadForm';

export default async function NoticesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.institute_id) redirect('/login');

  const canPost = ['institute_head', 'account', 'exam_head', 'super_admin'].includes(profile.role);

  const { data: notices } = await supabase
    .from('notices').select('*').eq('institute_id', profile.institute_id)
    .order('created_at', { ascending: false }).limit(30);

  const { data: classes } = await supabase.from('classes').select('id, name').eq('institute_id', profile.institute_id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Notices</h1>
        <p className="text-sm text-slate2-light mt-1">Publishing a notice notifies everyone in the chosen audience instantly.</p>
      </div>

      <NoticeUploadForm instituteId={profile.institute_id} classes={classes ?? []} canPost={canPost} />

      <div className="space-y-3">
        {(notices ?? []).map((n) => (
          <div key={n.id} className="card p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-ink">{n.title}</div>
              {n.description && <div className="text-sm text-slate2-light mt-1">{n.description}</div>}
              <div className="text-[11px] text-slate2-light mt-2">
                {new Date(n.created_at).toLocaleDateString()} · Audience: {n.target}
              </div>
            </div>
            {n.attachment_url && (
              <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="border border-line text-xs font-semibold px-3 py-1.5 rounded-sm hover:bg-paper whitespace-nowrap">⬇ PDF</a>
            )}
          </div>
        ))}
        {(notices ?? []).length === 0 && <div className="text-sm text-slate2-light">No notices published yet.</div>}
      </div>
    </div>
  );
}
