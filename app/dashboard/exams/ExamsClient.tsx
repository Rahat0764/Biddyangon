'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ExamCreateForm } from '@/components/ExamCreateForm';

export function ExamsClient({ instituteId, sessionId, classes, initialExams }: { instituteId: string; sessionId: string; classes: { id: string; name: string }[]; initialExams: any[] }) {
  const [exams, setExams] = useState(initialExams);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Examinations</h1>
        <p className="text-sm text-slate2-light mt-1">Create an exam, then teachers enter marks against it. Open an exam to verify and publish.</p>
      </div>

      <ExamCreateForm instituteId={instituteId} sessionId={sessionId} classes={classes} onCreated={(row) => setExams((e) => [row, ...e])} />

      <div className="scroll-x border border-line rounded-DEFAULT bg-white">
        <table>
          <thead><tr><th>Exam</th><th>Class</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td className="font-semibold">{e.name}</td>
                <td>{e.classes?.name ?? '—'}</td>
                <td>{e.exam_type}</td>
                <td><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-tint text-indigo-dark capitalize">{e.status}</span></td>
                <td><Link href={`/dashboard/exams/${e.id}`} className="text-indigo text-xs font-semibold">Open →</Link></td>
              </tr>
            ))}
            {exams.length === 0 && <tr><td colSpan={5} className="text-slate2-light">No exams yet — create one above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
