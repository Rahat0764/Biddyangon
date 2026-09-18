'use client';
// Exports the marksheet exactly as requested:
//  - No "Biddyangon" branding in the PDF itself — only the institute's own identity.
//  - Institute name at the top, institute logo top-left, student photo top-right.
//  - Detailed subject table, GPA shown both with and without the 4th subject.
import jsPDF from 'jspdf';
import type { ComputedResult } from '@/lib/gpa';

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadMarksheetPdf(props: {
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
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { result } = props;

  const [logoData, photoData] = await Promise.all([
    props.instituteLogoUrl ? urlToDataUrl(props.instituteLogoUrl) : Promise.resolve(null),
    props.studentPhotoUrl ? urlToDataUrl(props.studentPhotoUrl) : Promise.resolve(null),
  ]);

  // ---- Header ----
  if (logoData) doc.addImage(logoData, 'JPEG', 20, 14, 22, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(16, 23, 42);
  doc.text(props.instituteName, 105, 22, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(107, 114, 146);
  doc.text('ACADEMIC MARKSHEET', 105, 28, { align: 'center' });
  doc.text(props.examName, 105, 33, { align: 'center' });
  if (photoData) {
    doc.setDrawColor(226, 229, 239);
    doc.rect(168, 13, 22, 22);
    doc.addImage(photoData, 'JPEG', 168, 13, 22, 22);
  }
  doc.setDrawColor(16, 23, 42); doc.setLineWidth(0.5); doc.line(20, 40, 190, 40);

  // ---- Student info ----
  doc.setFontSize(10); doc.setTextColor(16, 23, 42);
  let y = 49;
  const info: [string, string][] = [
    ['Student Name', props.studentName], ['Student ID', props.studentCode],
    ['Class', `${props.className} — Section ${props.sectionName}`], ['Roll', String(props.roll)],
    ['Session', props.session], ['Result', result.passed ? 'PASSED' : 'FAILED'],
  ];
  info.forEach(([k, v], i) => {
    const col = i % 2 === 0 ? 24 : 110;
    if (i % 2 === 0 && i > 0) y += 7;
    doc.setTextColor(107, 114, 146); doc.setFont('helvetica', 'normal'); doc.text(k, col, y);
    doc.setTextColor(16, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(v, col, y + 5);
  });
  y += 14;

  // ---- Subject table ----
  doc.setFillColor(245, 246, 250); doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(8.5); doc.setTextColor(107, 114, 146); doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', 23, y + 5.5); doc.text('CODE', 95, y + 5.5); doc.text('FULL', 115, y + 5.5);
  doc.text('OBTAINED', 135, y + 5.5); doc.text('GRADE', 162, y + 5.5); doc.text('POINT', 178, y + 5.5);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setTextColor(16, 23, 42);
  result.subjects.forEach((s) => {
    doc.setDrawColor(226, 229, 239); doc.line(20, y + 8, 190, y + 8);
    doc.text(s.name + (s.isFourthSubject ? ' (4th)' : ''), 23, y + 5.5);
    doc.text(s.code, 95, y + 5.5);
    doc.text(String(s.fullMarks), 115, y + 5.5);
    doc.text(String(s.obtained), 138, y + 5.5);
    doc.text(s.grade, 163, y + 5.5);
    doc.text(s.point.toFixed(2), 178, y + 5.5);
    y += 8;
  });
  y += 8;
  doc.setDrawColor(200, 204, 224); doc.line(20, y, 190, y); y += 9;

  // ---- Totals & dual GPA ----
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`Total Marks: ${result.totalObtained} / ${result.totalFull}`, 20, y);
  y += 9;
  doc.setFontSize(9); doc.setTextColor(107, 114, 146); doc.setFont('helvetica', 'normal');
  doc.text('GPA without 4th subject', 20, y);
  doc.text('GPA with 4th subject', 100, y);
  y += 7;
  doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 23, 42);
  doc.text(result.gpaWithout4th.toFixed(2), 20, y);
  doc.setTextColor(43, 58, 143);
  doc.text(result.gpaWith4th.toFixed(2), 100, y);
  y += 12;

  doc.setFontSize(8); doc.setTextColor(150, 155, 180); doc.setFont('helvetica', 'normal');
  doc.text(`Published: ${props.publishedDate} · Verification code: ${props.verificationCode}`, 20, y);

  doc.save(`marksheet-${props.studentCode}.pdf`);
}
