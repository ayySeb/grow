import * as store from './store.js';
import { todayIso } from './dates.js';
import { checkId, getCheck } from './model.js';

// A timer on a habit, like in Tage. While it runs or is paused the habit holds `timer: { day, start, ms }`:
// `start` is when it last started (null while paused), `ms` the time before that. It lives on the habit,
// so it syncs: start on the phone, stop on the PC. Stopping adds the minutes to that day's amount and
// counts the habit as done. At most one timer is active at a time.

// Habits measured in minutes get a timer.
export const timed = h => h?.mode === 'amount' && /^min/i.test(h.unit?.trim() ?? '');

export const elapsed = (t, now = Date.now()) => (t ? t.ms + (t.start ? now - t.start : 0) : 0);

export const activeHabit = () => store.all('habit').find(h => h.timer) ?? null;

// Another active timer is stopped and saved first; returns that habit and its minutes, if any.
export function startTimer(habitId) {
  const h = store.get(habitId);
  if (!h || h.timer?.start) return null;
  const other = activeHabit();
  const stopped = other && other.id !== habitId ? { habit: other, minutes: stopTimer(other.id) } : null;
  store.update(habitId, { timer: { day: h.timer?.day ?? todayIso(), start: Date.now(), ms: h.timer?.ms ?? 0 } });
  return stopped;
}

export function pauseTimer(habitId) {
  const t = store.get(habitId)?.timer;
  if (t?.start) store.update(habitId, { timer: { ...t, start: null, ms: elapsed(t) } });
}

export const discardTimer = habitId => store.update(habitId, { timer: null });

// Under half a minute is a tap by mistake, not practice. Returns the minutes added.
export function stopTimer(habitId) {
  const h = store.get(habitId);
  if (!h?.timer) return 0;
  const ms = elapsed(h.timer);
  const minutes = ms < 30_000 ? 0 : Math.max(1, Math.round(ms / 60_000));
  const day = h.timer.day;
  store.update(habitId, { timer: null });
  if (minutes) {
    const c = getCheck(habitId, day);
    store.put(checkId(habitId, day), 'check', {
      amount: null, intensity: 2, mini: false, note: '', ...c, habitId, date: day, amount: (c?.amount ?? 0) + minutes,
    });
  }
  return minutes;
}
