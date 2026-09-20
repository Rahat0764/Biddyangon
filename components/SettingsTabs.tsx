'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  ['/dashboard/settings/institute', 'Branding'],
  ['/dashboard/settings/fees', 'Fee Types'],
  ['/dashboard/settings/grading', 'Grading Policy'],
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-line mb-6">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${pathname === href ? 'border-indigo text-indigo' : 'border-transparent text-slate2-light hover:text-ink'}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
