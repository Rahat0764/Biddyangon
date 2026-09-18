'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';
import { downloadReceiptPdf } from '@/lib/pdf/receipt';

interface FeeTypeOption { id: string; name: string; amount: number; }
interface FoundStudent {
  profileId: string; studentCode: string; name: string; className: string; sectionName: string; roll: string; phone: string;
}

export function RecordPaymentForm({
  instituteId, instituteName, instituteLogoUrl, feeTypes, recordedBy,
}: { instituteId: string; instituteName: string; instituteLogoUrl: string | null; feeTypes: FeeTypeOption[]; recordedBy: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [feeTypeId, setFeeTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  async function lookup() {
    if (!code.trim()) return;
    setSearching(true); setStudent(null);
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, roll, guardian_phone, classes(name), sections(name), profiles(full_name)')
      .eq('institute_id', instituteId).eq('student_code', code.trim()).maybeSingle();
    setSearching(false);
    if (error || !data) { toast('Not found', 'No student with that ID in this institute.', 'error'); return; }
    setStudent({
      profileId: data.id, studentCode: data.student_code, name: (data as any).profiles?.full_name ?? '—',
      className: (data as any).classes?.name ?? '—', sectionName: (data as any).sections?.name ?? '—',
      roll: String(data.roll ?? '—'), phone: data.guardian_phone ?? '—',
    });
  }

  function onFeeTypeChange(id: string) {
    setFeeTypeId(id);
    const ft = feeTypes.find((f) => f.id === id);
    if (ft) setAmount(String(ft.amount));
  }

  async function submit() {
    if (!student || !amount) { toast('Missing info', 'Look up a student and enter an amount.', 'error'); return; }
    setBusy(true);
    try {
      const { data: payment, error } = await supabase.from('payments').insert({
        institute_id: instituteId, student_id: student.profileId, fee_type_id: feeTypeId || null,
        amount: Number(amount), method, recorded_by: recordedBy,
      }).select().single();
      if (error) throw error;

      toast('Payment recorded', `৳${Number(amount).toLocaleString()} recorded for ${student.name}.`, 'success');

      const feeTypeName = feeTypes.find((f) => f.id === feeTypeId)?.name ?? 'Payment';
      downloadReceiptPdf({
        instituteName, instituteLogoUrl, receiptNo: payment.id.slice(0, 8).toUpperCase(),
        date: new Date(payment.created_at).toLocaleDateString(), studentId: student.studentCode, studentName: student.name,
        session: '2026', class: student.className, section: student.sectionName, roll: student.roll, contact: student.phone,
        lines: [{ particulars: feeTypeName, details: new Date(payment.created_at).toLocaleDateString(), amount: Number(amount), paid: Number(amount), due: 0 }],
      });

      setStudent(null); setCode(''); setAmount(''); setFeeTypeId('');
    } catch (e: any) {
      toast('Could not record payment', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 max-w-lg">
      <h3 className="font-semibold text-sm mb-4">Record a Payment</h3>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5">Student ID</label>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 244874" className="flex-1 border border-line rounded-sm px-3 py-2 text-sm font-mono" />
          <button onClick={lookup} disabled={searching} className="border border-line text-sm font-semibold px-3 py-2 rounded-sm hover:bg-paper">{searching ? '…' : 'Find'}</button>
        </div>
      </div>

      {student && (
        <div className="bg-paper rounded-sm px-3 py-2.5 mb-4 text-sm">
          <div className="font-semibold text-ink">{student.name}</div>
          <div className="text-xs text-slate2-light mt-0.5">{student.className} — {student.sectionName} · Roll {student.roll}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5">Fee Type</label>
          <select value={feeTypeId} onChange={(e) => onFeeTypeChange(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option value="">Custom</option>
            {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5">Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm">
            <option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option>
            <option value="nagad">Nagad</option><option value="card">Card</option>
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1.5">Amount (৳)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2 text-sm" />
      </div>

      <button disabled={busy || !student} onClick={submit} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-sm w-full">
        {busy ? 'Recording…' : 'Record Payment & Generate Receipt'}
      </button>
    </div>
  );
}
