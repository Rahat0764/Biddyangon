// Local-date helpers. Never use `Date#toISOString().slice(0,10)` for a
// date-only value — in Bangladesh (UTC+6) that silently shifts the date
// back by a day for roughly a third of every 24-hour cycle, because
// toISOString() first converts to UTC. These format in the machine's
// local time instead, which is correct as long as the server runs with
// TZ=Asia/Dhaka (see vercel.json) or the value is only ever compared to
// other values produced the same way.
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatBD(d: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', ...opts });
}
