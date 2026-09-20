'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

interface FeeType { id: string; name: string; amount: number; frequency: string; }

export function FeeTypesManager({ instituteId, initial }: { instituteId: string; initial: FeeType[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [feeTypes, setFeeTypes] = useState(initial);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim() || !amount) { toast('Missing info', 'Name and amount are required.', 'error'); return; }
    setBusy(true);
    const { data, error } = await supabase.from('fee_types').insert({ institute_id: instituteId, name: name.trim(), amount: Number(amount), frequency }).select().single();
    setBusy(false);
    if (error) { toast('Could not add fee type', error.message, 'error'); return; }
    setFeeTypes((f) => [...f, data]);
    setName(''); setAmount('');
    toast('Fee type added', `${data.name} — ৳${Number(data.amount).toLocaleString()} (${data.frequency}).`, 'success');
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this fee type? Existing payments already recorded against it are unaffected.')) return;
    const { error } = await supabase.from('fee_types').delete().eq('id', id);
    if (error) { toast('Could not remove', error.message, 'error'); return; }
    setFeeTypes((f) => f.filter((x) => x.id !== id));
  }

  return (
    <div className="card p-5 max-w-2xl">
      <h3 className="font-semibold text-sm mb-4">Fee Types</h3>
      <div className="scroll-x border border-line rounded-DEFAULT mb-5">
        <table>
          <thead><tr><th>Name</th><th>Amount</th><th>Frequency</th><th></th></tr></thead>
          <tbody>
            {feeTypes.map((f) => (
              <tr key={f.id}>
                <td className="font-semibold">{f.name}</td>
                <td>৳{Number(f.amount).toLocaleString()}</td>
                <td className="capitalize">{f.frequency}</td>
                <td><button onClick={() => remove(f.id)} className="text-xs text-danger font-semibold">Remove</button></td>
              </tr>
            ))}
            {feeTypes.length === 0 && <tr><td colSpan={4} className="text-slate2-light">No fee types yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Tuition" className="border border-line rounded-sm px-3 py-2 text-sm col-span-1" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount ৳" className="border border-line rounded-sm px-3 py-2 text-sm" />
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="border border-line rounded-sm px-3 py-2 text-sm">
          <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option><option value="per exam">Per exam</option>
        </select>
      </div>
      <button disabled={busy} onClick={add} className="mt-3 bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">+ Add Fee Type</button>
    </div>
  );
}
