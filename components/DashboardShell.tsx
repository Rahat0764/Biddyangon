'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastProvider } from './ToastProvider';
import type { UserRole } from '@/lib/types';

export function DashboardShell({
  role, fullName, photoUrl, instituteName, mustChangePassword, children,
}: { role: UserRole; fullName: string; photoUrl: string | null; instituteName: string; mustChangePassword?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (mustChangePassword && pathname !== '/dashboard/change-password') {
      router.replace('/dashboard/change-password');
    }
  }, [mustChangePassword, pathname]);

  if (mustChangePassword && pathname !== '/dashboard/change-password') {
    return null; // avoid a flash of dashboard content before the redirect above fires
  }

  // BUG FIXED: the change-password page is a full-screen takeover (its own
  // dark background, centered card — see app/dashboard/change-password),
  // but it lives under app/dashboard so it was rendering INSIDE this shell
  // too — sidebar and topbar showing behind/around a page that assumes it
  // owns the whole viewport. Render it standalone instead.
  if (pathname === '/dashboard/change-password') {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar role={role} instituteName={instituteName} open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col lg:ml-[246px]">
          <Topbar name={fullName} role={role} photoUrl={photoUrl} onMenu={() => setOpen(true)} />
          <div className="p-4 md:p-6 flex-1 content-fade" key={pathname}>{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
