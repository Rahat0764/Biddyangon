'use client';
// Matches the reference receipt layout: logo top-left, institute name centered,
// receipt-number box top-right, student info grid, itemized fee table, amount in words.
import jsPDF from 'jspdf';
import { detectImageFormat } from './image-format';

interface FeeLine { particulars: string; details: string; amount: number; paid: number; due: number; }

export interface ReceiptData {
  instituteName: string;
  instituteLogoUrl: string | null;
  receiptNo: string;
  date: string;
  studentId: string;
  studentName: string;
  session: string;
  class: string;
  section: string;
  roll: string;
  contact: string;
  lines: FeeLine[];
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numberToWords(n: number): string {
  // BUG FIXED (confirmed: numberToWords(500.5) => "Five Hundred undefined").
  // A fractional remainder like 0.5 recursed back into this function, and
  // `Math.floor(0.5 / 100)` indexed ONES[0] which is the empty string for
  // some paths and undefined for others. Money-in-words is a whole-taka
  // convention here, so round to the nearest integer taka up front and
  // never feed a decimal into the recursive branches.
  const whole = Math.round(n);
  if (whole === 0) return 'Zero';
  if (whole < 0) return 'Minus ' + numberToWords(-whole);
  if (whole < 20) return ONES[whole];
  if (whole < 100) return TENS[Math.floor(whole / 10)] + (whole % 10 ? ' ' + ONES[whole % 10] : '');
  if (whole < 1000) return ONES[Math.floor(whole / 100)] + ' Hundred' + (whole % 100 ? ' ' + numberToWords(whole % 100) : '');
  if (whole < 100000) return numberToWords(Math.floor(whole / 1000)) + ' Thousand' + (whole % 1000 ? ' ' + numberToWords(whole % 1000) : '');
  return numberToWords(Math.floor(whole / 100000)) + ' Lakh' + (whole % 100000 ? ' ' + numberToWords(whole % 100000) : '');
}

export async function downloadReceiptPdf(r: ReceiptData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = r.instituteLogoUrl ? await urlToDataUrl(r.instituteLogoUrl) : null;

  if (logo) doc.addImage(logo, detectImageFormat(logo), 20, 14, 22, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(43, 58, 143);
  doc.text(r.instituteName, 105, 22, { align: 'center', maxWidth: 110 });
  doc.setFontSize(10); doc.setTextColor(107, 114, 146); doc.setFont('helvetica', 'normal');
  doc.text('Money Receipt', 105, 32, { align: 'center' });

  doc.setDrawColor(226, 229, 239); doc.rect(160, 14, 30, 14);
  doc.setFontSize(7.5); doc.setTextColor(107, 114, 146); doc.text('Receipt No.', 175, 19, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(16, 23, 42); doc.setFont('helvetica', 'bold');
  doc.text(r.receiptNo, 175, 25, { align: 'center' });

  doc.setDrawColor(16, 23, 42); doc.line(20, 40, 190, 40);

  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 146);
  let y = 48;
  const left: [string, string][] = [['Date', r.date], ['Session', r.session], ['ID', r.studentId], ['Name', r.studentName], ['Contact', r.contact]];
  const right: [string, string][] = [['Class', r.class], ['Section', r.section], ['Roll', r.roll]];
  left.forEach(([k, v], i) => { doc.text(k + ':', 24, y + i * 6); doc.setTextColor(16, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(v, 45, y + i * 6); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 146); });
  right.forEach(([k, v], i) => { doc.text(k + ':', 115, y + i * 6); doc.setTextColor(16, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(v, 140, y + i * 6); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 146); });

  y += left.length * 6 + 8;
  doc.setFillColor(43, 58, 143); doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(8.5); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('PARTICULARS', 23, y + 5.5); doc.text('DETAILS', 90, y + 5.5); doc.text('AMOUNT', 135, y + 5.5); doc.text('PAID', 160, y + 5.5); doc.text('DUE', 178, y + 5.5);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setTextColor(16, 23, 42);
  let totalAmount = 0, totalPaid = 0, totalDue = 0;
  r.lines.forEach((l) => {
    doc.setDrawColor(226, 229, 239); doc.line(20, y + 7, 190, y + 7);
    doc.text(l.particulars, 23, y + 5); doc.text(l.details, 90, y + 5);
    doc.text(String(l.amount), 138, y + 5); doc.text(String(l.paid), 163, y + 5); doc.text(String(l.due), 180, y + 5);
    totalAmount += l.amount; totalPaid += l.paid; totalDue += l.due;
    y += 7;
  });
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 90, y + 5); doc.text(String(totalAmount), 138, y + 5); doc.text(String(totalPaid), 163, y + 5); doc.text(String(totalDue), 180, y + 5);
  y += 16;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(16, 23, 42);
  doc.text(`Amount paid: Taka ${numberToWords(totalPaid)} Only.`, 20, y);
  y += 10;
  doc.setFontSize(8); doc.setTextColor(150, 155, 180);
  doc.text('This receipt is system-generated by বিদ্যাঙ্গন (Biddyangon).', 20, y);

  doc.save(`receipt-${r.receiptNo}.pdf`);
}
