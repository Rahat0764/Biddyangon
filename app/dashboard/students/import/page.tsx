'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import { bulkCreateStudents, type StudentCsvRow, type BulkImportRowResult } from '@/app/actions/users';
import { useToast } from '@/components/ToastProvider';

const TEMPLATE = 'Student ID,Name,DOB,Gender,Class,Section,Roll,Father Name,Father Mobile,Mother Name,Mother Mobile,Blood Group\n244874,Rafiul Islam,2011-03-14,Male,Class 10,A,12,Md. Kamrul Islam,+8801711223344,Shirin Akter,+8801711223345,B+\n';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImportPage() {
  const toast = useToast();
  const [rows, setRows] = useState<StudentCsvRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<BulkImportRowResult[] | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResults(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const errors: string[] = [];
        const parsed: StudentCsvRow[] = (res.data as any[]).map((r, i) => {
          const studentId = (r['Student ID'] ?? '').trim();
          const name = (r['Name'] ?? '').trim();
          if (!studentId) errors.push(`Row ${i + 2}: missing Student ID`);
          if (!name) errors.push(`Row ${i + 2}: missing Name`);
          return {
            studentId, name,
            dob: (r['DOB'] ?? '').trim(),
            gender: (r['Gender'] ?? '').trim(),
            className: (r['Class'] ?? '').trim(),
            section: (r['Section'] ?? '').trim(),
            roll: (r['Roll'] ?? '').trim(),
            fatherName: (r['Father Name'] ?? '').trim(),
            fatherPhone: (r['Father Mobile'] ?? '').trim(),
            motherName: (r['Mother Name'] ?? '').trim(),
            motherPhone: (r['Mother Mobile'] ?? '').trim(),
            bloodGroup: (r['Blood Group'] ?? '').trim(),
          };
        });
        setRows(parsed);
        setFileErrors(errors);
      },
    });
  }

  async function runImport() {
    setImporting(true);
    const res = await bulkCreateStudents(rows);
    setImporting(false);
    setResults(res);
    const successCount = res.filter((r) => r.success).length;
    toast(
      successCount === res.length ? 'Import complete' : 'Import finished with some errors',
      `${successCount} of ${res.length} students created.`,
      successCount === res.length ? 'success' : 'info'
    );
  }

  function downloadCredentials() {
    if (!results) return;
    const lines = ['Student ID,Username,Temporary Password'];
    results.filter((r) => r.success).forEach((r) => lines.push(`${r.studentId},${r.username},${r.tempPassword}`));
    downloadCsv('student-credentials.csv', lines.join('\n'));
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs text-slate2-light mb-1"><Link href="/dashboard/students" className="hover:text-ink">Students</Link> / Bulk Import</div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Bulk Import Students</h1>
        <p className="text-sm text-slate2-light mt-1">Upload a CSV, preview it, then create every account in one go. A username and temporary password are generated for each student.</p>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="border border-line rounded-sm px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-paper">
            Choose CSV File
            <input type="file" accept=".csv" onChange={onFile} className="hidden" />
          </label>
          <button onClick={() => downloadCsv('biddyangon-student-import-template.csv', TEMPLATE)} className="text-xs font-semibold text-indigo">⬇ Download template</button>
        </div>
        <p className="text-[11px] text-slate2-light">Columns: Student ID, Name, DOB, Gender, Class, Section, Roll, Father Name, Father Mobile, Mother Name, Mother Mobile, Blood Group. Class/Section names must match ones you've already created exactly, or those two fields are left blank.</p>
      </div>

      {fileErrors.length > 0 && (
        <div className="card p-4 mb-6 bg-danger-bg border-danger/30 text-sm text-danger">
          {fileErrors.length} row(s) have problems and will be skipped: {fileErrors.slice(0, 5).join('; ')}{fileErrors.length > 5 ? '…' : ''}
        </div>
      )}

      {rows.length > 0 && !results && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Preview — {rows.length} students</h3>
            <button disabled={importing} onClick={runImport} className="bg-indigo disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-sm">
              {importing ? 'Importing…' : `Import ${rows.length} Students`}
            </button>
          </div>
          <div className="scroll-x border border-line rounded-DEFAULT max-h-96 overflow-y-auto">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Section</th><th>Roll</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i}><td className="font-mono">{r.studentId}</td><td>{r.name}</td><td>{r.className}</td><td>{r.section}</td><td>{r.roll}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Import Results</h3>
            <button onClick={downloadCredentials} className="border border-line text-sm font-semibold px-3 py-1.5 rounded-sm hover:bg-paper">⬇ Download Credential Sheet</button>
          </div>
          <div className="scroll-x border border-line rounded-DEFAULT">
            <table>
              <thead><tr><th>ID</th><th>Status</th><th>Username</th><th>Message</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.studentId}>
                    <td className="font-mono">{r.studentId}</td>
                    <td>{r.success ? <span className="text-success font-semibold text-xs">✔ Created</span> : <span className="text-danger font-semibold text-xs">✕ Failed</span>}</td>
                    <td className="font-mono">{r.username ?? '—'}</td>
                    <td className="text-xs text-slate2-light">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
