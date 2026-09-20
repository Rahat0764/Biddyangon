'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';

interface Hit { id: string; type: 'student' | 'teacher'; label: string; sub: string; href: string; }

export function GlobalSearch() {
  const supabase = createClient();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const [studentsRes, teachersRes] = await Promise.all([
        supabase.from('students').select('id, student_code, profiles(full_name)').ilike('student_code', `%${q}%`).limit(5),
        supabase.from('profiles').select('id, full_name, username').in('role', ['teacher', 'class_teacher']).ilike('full_name', `%${q}%`).limit(5),
      ]);
      const studentHits: Hit[] = (studentsRes.data ?? []).map((s: any) => ({
        id: s.id, type: 'student', label: s.profiles?.full_name ?? s.student_code, sub: `Student · ID ${s.student_code}`, href: `/dashboard/students`,
      }));
      const teacherHits: Hit[] = (teachersRes.data ?? []).map((t: any) => ({
        id: t.id, type: 'teacher', label: t.full_name, sub: `Teacher · ${t.username}`, href: `/dashboard/teachers`,
      }));
      setHits([...studentHits, ...teacherHits]);
      setLoading(false);
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="hidden md:block relative flex-1 max-w-[400px]" ref={ref}>
      <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 text-slate2-light text-sm">
        <Search size={15} className="text-slate2-light flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search students, teachers…"
          className="bg-transparent outline-none text-sm w-full text-ink"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-line rounded-DEFAULT shadow-xl z-40 content-fade max-h-80 overflow-y-auto">
          {loading && <div className="px-4 py-3 text-xs text-slate2-light">Searching…</div>}
          {!loading && hits.length === 0 && <div className="px-4 py-3 text-xs text-slate2-light">No matches for "{q}".</div>}
          {hits.map((h) => (
            <button
              key={h.type + h.id}
              onClick={() => { router.push(h.href); setOpen(false); setQ(''); }}
              className="w-full text-left px-4 py-2.5 hover:bg-paper transition-colors border-b border-line last:border-b-0"
            >
              <div className="text-sm font-semibold text-ink">{h.label}</div>
              <div className="text-[11px] text-slate2-light">{h.sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
