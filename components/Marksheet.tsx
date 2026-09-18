'use client';
import type { ComputedResult } from '@/lib/gpa';
import { downloadMarksheetPdf } from '@/lib/pdf/marksheet';

interface Props {
  instituteName: string;
  instituteLogoUrl: string | null;
  studentName: string;
  studentPhotoUrl: string | null;
  studentCode: string;
  className: string;
  sectionName: string;
  roll: number | string;
  session: string;
  examName: string;
  publishedDate: string;
  verificationCode: string;
  result: ComputedResult;
}

export function Marksheet(props: Props) {
  const { result } = props;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => downloadMarksheetPdf(props)}
          className="inline-flex items-center gap-2 bg-indigo hover:bg-indigo-dark text-white text-sm font-semibold px-4 py-2.5 rounded-sm"
        >
          ⬇ Download MarkSheet PDF
        </button>
      </div>

      <div className="card max-w-2xl mx-auto p-7">
        {/* Header: logo left, institute name centered, student photo right */}
        <div className="flex items-start justify-between border-b-2 border-ink pb-4 mb-5 gap-4">
          <div className="w-16 h-16 flex-shrink-0">
            {props.instituteLogoUrl ? (
              <img src={props.instituteLogoUrl} className="w-16 h-16 object-contain" alt="logo" />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-line flex items-center justify-center text-slate2-light text-xs text-center">LOGO</div>
            )}
          </div>
          <div className="flex-1 text-center pt-1">
            <div className="font-serif text-lg font-semibold text-ink">{props.instituteName}</div>
            <div className="text-[11px] uppercase tracking-[.12em] text-slate2-light mt-1">Academic MarkSheet</div>
            <div className="text-xs text-slate2-light mt-0.5">{props.examName}</div>
          </div>
          <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-line">
            {props.studentPhotoUrl ? (
              <img src={props.studentPhotoUrl} className="w-16 h-16 object-cover" alt={props.studentName} />
            ) : (
              <div className="w-16 h-16 bg-paper flex items-center justify-center text-slate2-light text-xs">Photo</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-sm mb-5">
          <Info label="Student Name" value={props.studentName} />
          <Info label="Student ID" value={props.studentCode} mono />
          <Info label="Class" value={`${props.className} — Section ${props.sectionName}`} />
          <Info label="Roll" value={String(props.roll)} />
          <Info label="Session" value={props.session} />
          <Info label="Result" value={result.passed ? 'PASSED' : 'FAILED'} highlight={result.passed ? 'success' : 'danger'} />
        </div>

        <div className="scroll-x border border-line rounded-DEFAULT">
          <table>
            <thead><tr><th>Subject</th><th>Code</th><th>Full</th><th>Obtained</th><th>Grade</th><th>Point</th></tr></thead>
            <tbody>
              {result.subjects.map((s) => (
                <tr key={s.subjectId}>
                  <td>{s.name}{s.isFourthSubject && <span className="text-slate2-light text-xs"> (4th subject)</span>}</td>
                  <td className="font-mono">{s.code}</td>
                  <td>{s.fullMarks}</td>
                  <td>{s.obtained}</td>
                  <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.grade === 'F' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>{s.grade}</span></td>
                  <td>{s.point.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-end mt-6 pt-4 border-t border-dashed border-line">
          <div>
            <div className="text-sm"><b>Total: {result.totalObtained} / {result.totalFull}</b></div>
            <div className="flex gap-6 mt-2">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2-light">GPA without 4th subject</div>
                <div className="font-serif text-xl font-semibold text-ink">{result.gpaWithout4th.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-slate2-light">GPA with 4th subject</div>
                <div className="font-serif text-xl font-semibold text-indigo">{result.gpaWith4th.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate2-light mt-3">Published: {props.publishedDate} · Verification code: {props.verificationCode}</div>
          </div>
          <div className="w-16 h-16 border border-line rounded-sm flex items-center justify-center text-[9px] text-slate2-light text-center">QR<br />VERIFY</div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'success' | 'danger' }) {
  return (
    <div>
      <span className="text-slate2-light text-xs">{label}</span>
      <div className={`font-semibold ${mono ? 'font-mono' : ''} ${highlight === 'success' ? 'text-success' : highlight === 'danger' ? 'text-danger' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
