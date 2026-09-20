'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';

interface Notif { id: string; title: string; body: string | null; read_at: string | null; created_at: string; }

export function NotificationBell() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read_at).length;

  async function load() {
    const { data } = await supabase.from('notifications').select('id, title, body, read_at, created_at').order('created_at', { ascending: false }).limit(20);
    setNotifs(data ?? []);
    setLoaded(true);
  }

  // Load once on mount so the unread badge is accurate without opening the
  // panel — no realtime subscription here (that's a documented next step),
  // just a fetch-on-mount plus a light poll so the count doesn't go stale
  // during a long session.
  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markRead(id: string) {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async function markAllRead() {
    const unread = notifs.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    setNotifs((ns) => ns.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!loaded) load(); }}
        className="relative w-9 h-9 rounded-full border border-line bg-white flex items-center justify-center text-slate2 hover:bg-paper"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-line rounded-DEFAULT shadow-xl z-40 content-fade">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-indigo font-semibold">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate2-light">No notifications yet.</div>}
            {notifs.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 hover:bg-paper transition-colors ${!n.read_at ? 'bg-indigo-tint/40' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-indigo mt-1.5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink">{n.title}</div>
                    {n.body && <div className="text-[11px] text-slate2-light mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-slate2-light mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
