'use client';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

export function Topbar({ name, role, photoUrl, onMenu }: { name: string; role: string; photoUrl?: string | null; onMenu: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const initials = (name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="h-[62px] bg-white border-b border-line flex items-center gap-3.5 px-5 sticky top-0 z-30">
      <button className="lg:hidden text-lg text-ink" onClick={onMenu}><Menu size={20} /></button>
      <GlobalSearch />
      <div className="flex-1" />
      <div className="flex items-center gap-2 pr-1">
        <NotificationBell />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-line">
          {photoUrl ? (
            <img src={photoUrl} className="w-7 h-7 rounded-full object-cover" alt={name} />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo text-white flex items-center justify-center text-[11px] font-bold">
              {initials}
            </div>
          )}
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-semibold text-ink">{name}</div>
            <div className="text-[10.5px] text-slate2-light capitalize">{role.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <button onClick={logout} className="text-slate2-light text-xs hover:text-danger ml-1">Log out</button>
      </div>
    </div>
  );
}
