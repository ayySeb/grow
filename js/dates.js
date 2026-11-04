// Dates are passed around as local ISO day strings ("2026-11-04"), which sort and compare as plain strings.
const pad = n => String(n).padStart(2, '0');

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => iso(new Date());
export const dayOf = ms => iso(new Date(ms));

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

// 1 = Monday … 7 = Sunday
export const isoWeekday = d => ((d.getDay() + 6) % 7) + 1;

// Rounded so that daylight saving days (23 or 25 hours) still count as one day.
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

export function weekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}

const format = opts => {
  const f = new Intl.DateTimeFormat('de-DE', opts);
  return d => f.format(d).replace('.', '');
};
export const monthName = format({ month: 'long' });
export const monthShort = format({ month: 'short' });
export const weekdayLong = format({ weekday: 'long' });
export const longDate = s => new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(parse(s));
export const shortDate = s => new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(parse(s));
export const dayMonth = s => new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(parse(s));

// --- review periods: day "2026-11-04", week "2026-11-02" (its Monday), month "2026-11", quarter "2026-Q4", year "2026"

export function periodKey(type, d = new Date()) {
  const y = d.getFullYear();
  switch (type) {
    case 'day': return iso(d);
    case 'week': return iso(startOfWeek(d));
    case 'month': return `${y}-${pad(d.getMonth() + 1)}`;
    case 'quarter': return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    default: return String(y);
  }
}

export function periodRange(type, key) {
  switch (type) {
    case 'day': return [key, key];
    case 'week': return [key, iso(addDays(parse(key), 6))];
    case 'month': {
      const [y, m] = key.split('-').map(Number);
      return [`${key}-01`, iso(new Date(y, m, 0))];
    }
    case 'quarter': {
      const [y, q] = key.split('-Q').map(Number);
      return [iso(new Date(y, (q - 1) * 3, 1)), iso(new Date(y, q * 3, 0))];
    }
    default: return [`${key}-01-01`, `${key}-12-31`];
  }
}

export function periodLabel(type, key) {
  const [a, b] = periodRange(type, key);
  switch (type) {
    case 'day': return longDate(key);
    case 'week': return `KW ${weekNumber(parse(key))} · ${shortDate(a)} – ${shortDate(b)}`;
    case 'month': return `${monthName(parse(a))} ${a.slice(0, 4)}`;
    case 'quarter': return `${key.slice(5)} ${key.slice(0, 4)}`;
    default: return key;
  }
}

// The period before the one `key` names.
export function previousPeriod(type, key) {
  const [a] = periodRange(type, key);
  return periodKey(type, addDays(parse(a), -1));
}
