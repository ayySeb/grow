import * as store from './store.js';
import { iso, parse, addDays, startOfWeek, isoWeekday, todayIso, periodKey, dayOf } from './dates.js';
import { esc } from './ui.js';

// Lookups shared by views and sheets. A "target" is what XP goes to: a skill, or an area directly ("Allgemein").

export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt;

// Focus areas first, then in their own order.
export const areas = (withArchived = false) =>
  store.all('area').filter(a => withArchived || !a.archived).sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0) || byOrder(a, b));

export const skillsOf = (areaId, keep = null) =>
  store.all('skill').filter(s => s.areaId === areaId && (!s.archived || s.id === keep)).sort(byOrder);

export function areaOf(targetId) {
  const t = targetId && store.get(targetId);
  if (!t) return null;
  return t.kind === 'area' ? t : store.get(t.areaId);
}

export function targetLabel(id) {
  const t = id && store.get(id);
  if (!t) return '';
  if (t.kind === 'area') return t.name;
  const a = store.get(t.areaId);
  return a ? `${a.name} · ${t.name}` : t.name;
}

// <option>s for a target picker: every area with "Allgemein" plus its skills.
export function targetOptions(selected, noneLabel) {
  let html = noneLabel ? `<option value="">${esc(noneLabel)}</option>` : '';
  for (const a of areas(true)) {
    if (a.archived && a.id !== selected && !skillsOf(a.id).some(s => s.id === selected)) continue;
    const opt = (id, label) => `<option value="${id}"${id === selected ? ' selected' : ''}>${esc(label)}</option>`;
    html += `<optgroup label="${esc(a.name)}">${opt(a.id, `${a.name} allgemein`)}${skillsOf(a.id, selected).map(s => opt(s.id, s.name)).join('')}</optgroup>`;
  }
  return html;
}

export const reflectionTarget = () => store.all('skill').find(s => s.role === 'reflection')?.id ?? null;

export const vision = () => store.get('vision') ?? { year1: '', year5: '', values: [], mottos: [] };
export const setVision = patch => store.put('vision', 'vision', patch);

// --- habits -----------------------------------------------------------------------------

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const checkId = (habitId, date) => `chk:${habitId}:${date}`;
export const getCheck = (habitId, date) => store.get(checkId(habitId, date));

export function rhythmLabel(r) {
  if (r.type === 'days') return r.days.length ? r.days.slice().sort().map(d => WEEKDAYS[d - 1]).join(', ') : 'Keine Tage gewählt';
  if (r.type === 'weekly') return `${r.times}× pro Woche`;
  return 'Täglich';
}

export const dueOn = (h, date) => h.rhythm.type !== 'days' || h.rhythm.days.includes(isoWeekday(parse(date)));

export function weekCount(habitId, date) {
  const monday = startOfWeek(parse(date));
  let n = 0;
  for (let i = 0; i < 7; i++) if (getCheck(habitId, iso(addDays(monday, i)))) n++;
  return n;
}

export function checksOf(habitId) {
  return store.all('check').filter(c => c.habitId === habitId).sort((a, b) => a.date.localeCompare(b.date));
}

// True after a pause, when the mini version is worth offering. Never says how long the pause was.
export function resting(h, days) {
  const last = checksOf(h.id).at(-1)?.date ?? dayOf(h.createdAt);
  return parse(todayIso()) - parse(last) >= days * 864e5;
}

// --- quests -------------------------------------------------------------------------------

export const questDone = q => q.milestones.length > 0 && q.milestones.every(m => m.doneAt);
export const nextMilestone = q => q.milestones.find(m => !m.doneAt) ?? null;
export const questDoneAt = q => (questDone(q) ? Math.max(...q.milestones.map(m => m.doneAt)) : null);

// --- reviews --------------------------------------------------------------------------------

export function entryFilled(e) {
  if (!e) return false;
  if (e.type === 'day') return !!e.text?.trim();
  return Object.values(e.answers ?? {}).some(v => v?.trim()) || Object.keys(e.wheel ?? {}).length > 0;
}

// Reviews worth a gentle hint today: the week from Saturday to Monday, the month around its end, and so on.
// Only ones not written yet; nothing piles up, an old period simply drops out.
export function dueReviews(d = new Date()) {
  const out = [];
  const wd = isoWeekday(d);
  if (wd >= 6) out.push(['week', periodKey('week', d)]);
  else if (wd === 1) out.push(['week', periodKey('week', addDays(d, -7))]);
  const dom = d.getDate();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  if (dom >= last - 1) out.push(['month', periodKey('month', d)]);
  else if (dom <= 3) out.push(['month', periodKey('month', lastMonth)]);
  const m = d.getMonth();
  if (m % 3 === 2 && dom >= last - 1) out.push(['quarter', periodKey('quarter', d)]);
  else if (m % 3 === 0 && dom <= 7) out.push(['quarter', periodKey('quarter', lastMonth)]);
  if (m === 11 && dom >= 27) out.push(['year', periodKey('year', d)]);
  else if (m === 0 && dom <= 7) out.push(['year', String(d.getFullYear() - 1)]);
  return out.filter(([type, key]) => !entryFilled(store.get(`${type}:${key}`)));
}
