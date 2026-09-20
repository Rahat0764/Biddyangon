'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, School, ScrollText, Users, GraduationCap, BookOpen, Megaphone,
  Settings, Banknote, ClipboardList, PenLine, CalendarDays, FileText,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { UserRole } from '@/lib/types';

const ICONS = {
  dashboard: LayoutDashboard, institutes: School, audit: ScrollText, students: Users,
  teachers: GraduationCap, classes: BookOpen, notices: Megaphone, settings: Settings,
  payments: Banknote, exams: ClipboardList, publish: Megaphone, marks: PenLine,
  attendance: CalendarDays, results: FileText,
} as const;
type IconKey = keyof typeof ICONS;

const NAV: Record<UserRole, [string, string, IconKey][]> = {
  super_admin: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/institutes', 'Institutes', 'institutes'], ['/dashboard/audit', 'Audit Logs', 'audit']],
  institute_head: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/students', 'Students', 'students'], ['/dashboard/teachers', 'Teachers', 'teachers'], ['/dashboard/classes', 'Classes & Sections', 'classes'], ['/dashboard/notices', 'Notices', 'notices'], ['/dashboard/settings/institute', 'Settings', 'settings']],
  account: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/payments', 'Record Payment', 'payments'], ['/dashboard/notices', 'Notices', 'notices']],
  exam_head: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/exams', 'Exams', 'exams'], ['/dashboard/results', 'Publish Results', 'publish'], ['/dashboard/notices', 'Notices', 'notices']],
  teacher: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/marks', 'Marks Entry', 'marks'], ['/dashboard/notices', 'Notices', 'notices']],
  class_teacher: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/classes', 'My Section', 'classes'], ['/dashboard/marks', 'Marks Entry', 'marks'], ['/dashboard/notices', 'Notices', 'notices']],
  student: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/attendance', 'Attendance', 'attendance'], ['/dashboard/results', 'Results', 'results'], ['/dashboard/notices', 'Notices', 'notices']],
  parent: [['/dashboard', 'Dashboard', 'dashboard'], ['/dashboard/results', 'Results', 'results'], ['/dashboard/notices', 'Notices', 'notices']],
};

export function Sidebar({ role, instituteName, open, onClose }: { role: UserRole; instituteName: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.student;

  return (
    <aside className={`fixed top-0 bottom-0 left-0 z-40 w-[246px] bg-ink text-white flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex items-center gap-2.5 p-[18px] border-b border-white/10">
        <BrandMark dark />
        <button className="ml-auto text-[#8B92B5] text-lg lg:hidden" onClick={onClose} aria-label="Close menu">✕</button>
      </div>
      <div className="mx-[18px] mt-3.5 mb-1.5 text-[10.5px] uppercase tracking-wider text-[#6B7299] font-semibold truncate">{instituteName}</div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2.5">
        {items.map(([href, label, iconKey]) => {
          const active = pathname === href;
          const IconComp = ICONS[iconKey];
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13.5px] font-medium mb-0.5 border-l-[2.5px] transition-colors ${active ? 'bg-brass/15 text-white border-brass' : 'text-[#B7BBD9] border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <IconComp size={16} strokeWidth={2} className="flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
