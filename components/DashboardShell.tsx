'use client';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastProvider } from './ToastProvider';
import type { UserRole } from '@/lib/types';

export function DashboardShell({
  role, fullName, photoUrl, instituteName, children,
}: { role: UserRole; fullName: string; photoUrl: string | null; instituteName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar role={role} instituteName={instituteName} open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col lg:ml-[246px]">
          <Topbar name={fullName} role={role} photoUrl={photoUrl} onMenu={() => setOpen(true)} />
          <div className="p-4 md:p-6 flex-1">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
