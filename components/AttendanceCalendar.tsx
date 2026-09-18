'use client';
// Mirrors the EximusEdu-style calendar: color-coded days + a summary pie chart.
const STATUS_COLOR: Record<string, string> = {
  present: '#4ADE80', absent: '#F87171', late: '#FB923C', leave: '#93C5FD', holiday: '#FDE68A',
};

interface DayRow { date: string; status: keyof typeof STATUS_COLOR | null; }

export function AttendanceCalendar({ monthLabel, days }: { monthLabel: string; days: DayRow[] }) {
  const counts: Record<string, number> = { present: 0, absent: 0, late: 0, leave: 0 };
  days.forEach((d) => { if (d.status && d.status in counts) counts[d.status]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const firstDow = new Date(days[0]?.date ?? Date.now()).getDay();
  const blanks = Array.from({ length: firstDow });

  let cum = 0;
  const slices = Object.entries(counts).map(([k, v]) => {
    const start = (cum / total) * 360; cum += v;
    const end = (cum / total) * 360;
    return { k, v, start, end, color: STATUS_COLOR[k] };
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <button className="text-slate2-light">&lt;</button>
        <div className="font-semibold text-sm">{monthLabel}</div>
        <button className="text-slate2-light">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-slate2-light mb-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => <div key={'b' + i} />)}
        {days.map((d) => (
          <div key={d.date} className="aspect-square rounded flex items-center justify-center text-xs font-medium"
            style={{ background: d.status ? STATUS_COLOR[d.status] + '55' : '#F5F6FA', color: '#10172A' }}>
            {new Date(d.date).getDate()}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px]">
        {Object.entries(STATUS_COLOR).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} /> <span className="capitalize">{k}</span></div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-5 text-sm">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-1.5">
            <span className="capitalize text-slate2-light">{k}</span><b>{v} ({Math.round((v / total) * 100)}%)</b>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 120 120" className="w-40 h-40 mx-auto mt-5">
        {slices.filter((s) => s.v > 0).map((s) => <PieSlice key={s.k} {...s} />)}
      </svg>
    </div>
  );
}

function PieSlice({ start, end, color }: { start: number; end: number; color: string }) {
  const cx = 60, cy = 60, r = 55;
  const toXY = (deg: number) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const [x1, y1] = toXY(start), [x2, y2] = toXY(end);
  const large = end - start > 180 ? 1 : 0;
  return <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={color} />;
}
