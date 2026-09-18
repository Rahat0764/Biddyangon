'use client';
import { downloadReceiptPdf } from '@/lib/pdf/receipt';

interface DueLine { particulars: string; details: string; amount: number; }
interface PaymentRow { id: string; date: string; no: string; amount: number; }

export function FeesView({
  instituteName, instituteLogoUrl, studentName, studentId, session, className, sectionName, roll, contact,
  dues, payments,
}: {
  instituteName: string; instituteLogoUrl: string | null; studentName: string; studentId: string;
  session: string; className: string; sectionName: string; roll: string; contact: string;
  dues: DueLine[]; payments: PaymentRow[];
}) {
  const totalDue = dues.reduce((a, d) => a + d.amount, 0);

  function downloadReceipt(p: PaymentRow) {
    downloadReceiptPdf({
      instituteName, instituteLogoUrl, receiptNo: p.no, date: p.date,
      studentId, studentName, session, class: className, section: sectionName, roll, contact,
      lines: [{ particulars: 'Payment', details: p.date, amount: p.amount, paid: p.amount, due: 0 }],
    });
  }

  return (
    <div>
      {totalDue > 0 && (
        <div className="bg-danger-bg border border-danger/20 rounded-DEFAULT p-4 flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-danger font-semibold uppercase tracking-wide">Total Due</div>
            <div className="font-serif text-2xl font-semibold text-danger mt-0.5">৳{totalDue.toLocaleString()}</div>
          </div>
          <button className="bg-success text-white text-sm font-semibold px-5 py-2.5 rounded-full">💰 Pay Now</button>
        </div>
      )}

      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-sm mb-3">Dues</h3>
        <div className="scroll-x border border-line rounded-DEFAULT">
          <table>
            <thead><tr><th>#</th><th>Account</th><th>Details</th><th>Due</th></tr></thead>
            <tbody>
              {dues.map((d, i) => (
                <tr key={i}><td>{i + 1}</td><td>{d.particulars}</td><td>{d.details}</td><td className="font-semibold text-danger">৳{d.amount.toLocaleString()}</td></tr>
              ))}
              {dues.length === 0 && <tr><td colSpan={4} className="text-success font-semibold">No outstanding dues 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-3">Payments</h3>
        <div className="scroll-x border border-line rounded-DEFAULT">
          <table>
            <thead><tr><th>Date</th><th>Receipt No.</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td><td className="font-mono">{p.no}</td><td>৳{p.amount.toLocaleString()}</td>
                  <td><button onClick={() => downloadReceipt(p)} className="border border-line text-xs font-semibold px-2.5 py-1 rounded-sm hover:bg-paper">⬇ Receipt</button></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="text-slate2-light">No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
