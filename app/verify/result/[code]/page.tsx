import { createClient } from '@/lib/supabase/server';
import { BrandMark } from '@/components/BrandMark';

// Public page — no auth required. Shows only safe, minimal verification info (spec §37/§87).
export default async function VerifyResultPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: result } = await supabase
    .from('results').select('published, result_status, exams(name), institutes(name)')
    .eq('verification_code', params.code).maybeSingle();

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-5">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center">
        <div className="flex justify-center mb-5"><BrandMark /></div>
        {result && result.published ? (
          <>
            <div className="text-success text-3xl mb-2">✓</div>
            <div className="font-serif text-lg font-semibold text-ink">Result Verified</div>
            <div className="text-sm text-slate2-light mt-2">{(result as any).institutes?.name}</div>
            <div className="text-sm text-slate2-light">{(result as any).exams?.name}</div>
            <div className="text-xs text-slate2-light mt-3">Status: <b className="text-ink capitalize">{result.result_status}</b></div>
          </>
        ) : (
          <>
            <div className="text-danger text-3xl mb-2">✕</div>
            <div className="font-serif text-lg font-semibold text-ink">Not Found</div>
            <div className="text-sm text-slate2-light mt-2">This verification code does not match any published result.</div>
          </>
        )}
      </div>
    </div>
  );
}
