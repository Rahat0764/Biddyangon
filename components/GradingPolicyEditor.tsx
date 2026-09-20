'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';
import type { GradingPolicy } from '@/lib/types';

export function GradingPolicyEditor({ instituteId, initial }: { instituteId: string; initial: GradingPolicy }) {
  const supabase = createClient();
  const toast = useToast();
  const [scale, setScale] = useState(initial.scale);
  const [bonusCap, setBonusCap] = useState(initial.fourth_subject_bonus_cap);
  const [busy, setBusy] = useState(false);

  function updateBand(i: number, field: 'min' | 'grade' | 'point', value: string) {
    setScale((s) => s.map((b, idx) => idx === i ? { ...b, [field]: field === 'grade' ? value : Number(value) } : b));
  }

  async function save() {
    // A quick client-side sanity check before hitting the database — this
    // is the same "descending min, no gaps" rule the fixed grading engine
    // relies on, so a broken scale can't silently reintroduce the old bug.
    const sorted = [...scale].sort((a, b) => b.min - a.min);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].min <= sorted[i + 1].min) {
        toast('Invalid scale', 'Each band\'s minimum percentage must be strictly higher than the next one down.', 'error');
        return;
      }
    }
    setBusy(true);
    const policy = { scale: scale.map((b) => ({ ...b, max: 100 })), fourth_subject_bonus_cap: bonusCap };
    const { error } = await supabase.from('institutes').update({ grading_policy: policy }).eq('id', instituteId);
    setBusy(false);
    if (error) { toast('Could not save', error.message, 'error'); return; }
    toast('Grading policy saved', 'Applies to every exam published from now on.', 'success');
  }

  return (
    <div className="card p-5 max-w-2xl">
      <h3 className="font-semibold text-sm mb-2">Grading Scale</h3>
      <p className="text-xs text-slate2-light mb-4">A subject's percentage is matched against the highest "Minimum %" it clears — bands are checked from the top down, so there's no need to set an upper bound.</p>

      <div className="scroll-x border border-line rounded-DEFAULT mb-4">
        <table>
          <thead><tr><th>Minimum %</th><th>Grade</th><th>Grade Point</th></tr></thead>
          <tbody>
            {scale.map((band, i) => (
              <tr key={i}>
                <td><input type="number" value={band.min} onChange={(e) => updateBand(i, 'min', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1 text-sm" /></td>
                <td><input value={band.grade} onChange={(e) => updateBand(i, 'grade', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1 text-sm" /></td>
                <td><input type="number" step="0.5" value={band.point} onChange={(e) => updateBand(i, 'point', e.target.value)} className="w-20 border border-line rounded-sm px-2 py-1 text-sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-5 max-w-xs">
        <label className="block text-xs font-semibold mb-1.5">4th Subject Bonus Cap</label>
        <input type="number" step="0.1" value={bonusCap} onChange={(e) => setBonusCap(Number(e.target.value))} className="w-full border border-line rounded-sm px-3 py-2 text-sm" />
        <p className="text-[11px] text-slate2-light mt-1.5">The most GPA points an optional subject above 2.00 can add on top of the compulsory-subject average.</p>
      </div>

      <button disabled={busy} onClick={save} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">
        {busy ? 'Saving…' : 'Save Grading Policy'}
      </button>
    </div>
  );
}
