import * as store from './store.js';
import { checkId } from './model.js';
import { iso, addDays, todayIso, dayOf } from './dates.js';

// Health data from the phone app grow-health (Health Connect: Samsung Health, watch, Sleep Cycle).
// It writes one row per day into the Supabase table health_days; grow only reads it.
// Habits can be linked to a value ("Schlaf ≥ 7 h") and then check themselves. Nothing is ever taken away:
// a missing value does nothing, and a check the user removed by hand is never added again.

const KEY = 'grow.health.v1';
const DAYS_BACK = 60;     // how much history to load
const AUTO_DAYS = 14;     // how far back automatic checks are filled in

let days = {};
try { days = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { days = {}; }
const listeners = new Set();

export const onHealth = fn => listeners.add(fn);
export const healthDay = date => days[date] ?? null;
export const hasHealth = () => Object.keys(days).length > 0;

// What a habit can be linked to. value(day) returns a number or null.
const runKm = d => {
  const runs = (d.exercises ?? []).filter(e => e.type === 'Laufen' || e.type === 'Laufband');
  return runs.length ? runs.reduce((s, e) => s + (e.km ?? 0), 0) : null;
};
export const METRICS = {
  sleep:    { label: 'Schlaf', unit: 'h', min: 7, step: 0.5, value: d => (d.sleep?.asleep != null ? d.sleep.asleep / 60 : null) },
  steps:    { label: 'Schritte', unit: 'Schritte', min: 8000, step: 500, value: d => d.steps ?? null },
  training: { label: 'Training', unit: 'Min', min: 20, step: 5, value: d => d.exerciseMinutes ?? null },
  run:      { label: 'Laufen', unit: 'km', min: 1, step: 0.5, value: runKm },
};

export function metricValue(metric, date) {
  const d = healthDay(date);
  const m = METRICS[metric];
  return d && m ? m.value(d) : null;
}

// Loads the last weeks from Supabase. Called by sync after each run and on realtime changes.
export async function pullHealth(db) {
  const since = iso(addDays(new Date(), -DAYS_BACK));
  const { data, error } = await db.from('health_days').select('day, data').gte('day', since).order('day');
  if (error) throw error;
  const next = {};
  for (const r of data) next[r.day] = r.data;
  if (JSON.stringify(next) === JSON.stringify(days)) return;
  days = next;
  try { localStorage.setItem(KEY, JSON.stringify(days)); } catch { /* storage full */ }
  autoCheck();
  listeners.forEach(fn => fn());
}

export function clearHealth() {
  days = {};
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach(fn => fn());
}

const round = (x, step) => Math.round(x / step) * step;

// Checks linked habits for the days health data exists. Only adds, never changes or removes.
export function autoCheck() {
  const today = todayIso();
  const from = iso(addDays(new Date(), -AUTO_DAYS));
  for (const h of store.all('habit')) {
    const link = h.health;
    if (h.archived || h.avoid || !link?.metric || !METRICS[link.metric]) continue;
    const created = dayOf(h.createdAt);
    for (const date of Object.keys(days)) {
      if (date < from || date > today || date < created) continue;
      const id = checkId(h.id, date);
      if (store.rawItem(id)) continue;   // already checked, or removed on purpose
      const v = metricValue(link.metric, date);
      if (v == null || v <= 0 || v < (link.min ?? 0)) continue;
      store.put(id, 'check', {
        habitId: h.id, date, intensity: 2, mini: false, note: '', auto: 'health',
        amount: h.mode === 'amount' ? round(v, METRICS[link.metric].step === 500 ? 1 : 0.1) : null,
      });
    }
  }
}

// --- display helpers ------------------------------------------------------------------------

export const hm = mins => `${Math.floor(mins / 60)} h ${String(Math.round(mins % 60)).padStart(2, '0')}`;
export const clock = isoLocal => (isoLocal ? isoLocal.slice(11, 16) : '');
export const fmtNum = n => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 1 });
