'use client';
import { usePathname, useRouter } from 'next/navigation';
import { BrandMark } from './BrandMark';
import type { UserRole } from '@/lib/types';

const NAV: Record<UserRole, [string, string, string][]> = {
  super_admin: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/institutes', 'Institutes', '🏫'], ['/dashboard/audit', 'Audit Logs', '🧾']],
  institute_head: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/students', 'Students', '🧑‍🎓'], ['/dashboard/teachers', 'Teachers', '🎓'], ['/dashboard/classes', 'Classes & Sections', '📚'], ['/dashboard/notices', 'Notices', '📢'], ['/dashboard/settings/institute', 'Institute Settings', '⚙']],
  account: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/payments', 'Record Payment', '৳'], ['/dashboard/notices', 'Notices', '📢']],
  exam_head: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/exams', 'Exams', '📝'], ['/dashboard/results', 'Publish Results', '📣'], ['/dashboard/notices', 'Notices', '📢']],
  teacher: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/marks', 'Marks Entry', '✏'], ['/dashboard/notices', 'Notices', '📢']],
  class_teacher: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/classes', 'My Section', '📚'], ['/dashboard/marks', 'Marks Entry', '✏'], ['/dashboard/notices', 'Notices', '📢']],
  student: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/results', 'Results', '📄'], ['/dashboard/notices', 'Notices', '📢']],
  parent: [['/dashboard', 'Dashboard', '◆'], ['/dashboard/results', 'Results', '📄'], ['/dashboard/notices', 'Notices', '📢']],
};

export function Sidebar({ role, instituteName, open, onClose }: { role: UserRole; instituteName: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role] ?? NAV.student;

  return (
    <aside className={`fixed top-0 bottom-0 left-0 z-40 w-[246px] bg-ink text-white flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex items-center gap-2.5 p-[18px] border-b border-white/10">
        <BrandMark dark />
        <button className="ml-auto text-[#8B92B5] text-lg lg:hidden" onClick={onClose}>✕</button>
      </div>
      <div className="mx-[18px] mt-3.5 mb-1.5 text-[10.5px] uppercase tracking-wider text-[#6B7299] font-semibold">{instituteName}</div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2.5">
        {items.map(([href, label, icon]) => {
          const active = pathname === href;
          return (
            <div
              key={href}
              onClick={() => { router.push(href); onClose(); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[13.5px] font-medium mb-0.5 border-l-[2.5px] cursor-pointer transition-colors ${active ? 'bg-brass/15 text-white border-brass' : 'text-[#B7BBD9] border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <span className="w-[17px] text-center text-[15px] flex-shrink-0">{icon}</span>
              <span>{label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
