// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A plain count ('12186' or 62) as '12,186' or '62'. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Milliseconds until a deadline (negative once it has passed). */
export function msLeft(iso) {
  return new Date(iso).getTime() - Date.now();
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Colour class for a deadline: urgent under 24h, soon under 3 days, else calm. */
export function timeLeftClass(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  if (ms <= 86400000) return 'urgent';
  if (ms <= 3 * 86400000) return 'soon';
  return 'calm';
}

/** '1 entry' / '62 entries'. */
export function entries(n) {
  return `${num(n)} ${Number(n) === 1 ? 'entry' : 'entries'}`;
}
