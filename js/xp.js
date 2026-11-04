import * as store from './store.js';
import { XP, CURVES } from './rules.js';
import { dayOf } from './dates.js';
import { reflectionTarget, entryFilled } from './model.js';

// XP are never stored. They are worked out from what happened (checks, milestones, moments …), so they cannot
// drift, and nothing can ever be taken away: a quiet day simply adds nothing. Cached until the store changes.

let cache = null;
let cacheRev = -1;

export function levelOf(xp, curve) {
  const { base, growth } = CURVES[curve];
  let level = 1;
  let into = xp;
  let need = base;
  while (into >= need) {
    into -= need;
    level++;
    need = Math.round(base * (1 + growth * (level - 1)));
  }
  return { level, into, need, xp };
}

export const checkXp = c => Math.round((XP.habit[c.intensity] ?? XP.habit[2]) * (c.mini ? XP.miniFactor : 1));

// Every XP gain as an event: { day, xp, target, side, source, label }.
function collect() {
  const events = [];
  const bests = new Set();
  const habits = new Map(store.all('habit').map(h => [h.id, h]));
  const checks = store.all('check').filter(c => habits.has(c.habitId)).sort((a, b) => a.date.localeCompare(b.date));
  const best = {};
  for (const c of checks) {
    const h = habits.get(c.habitId);
    const base = { day: c.date, target: h.skillId, side: h.sideSkillId, label: h.title, habit: h.id };
    events.push({ ...base, xp: checkXp(c), source: 'check' });
    if (h.mode === 'amount' && c.amount > 0) {
      if (best[h.id] != null && c.amount > best[h.id]) {
        bests.add(c.id);
        events.push({ ...base, xp: XP.best, source: 'best', label: `Bestleistung: ${h.title}` });
      }
      best[h.id] = Math.max(best[h.id] ?? 0, c.amount);
    }
  }
  for (const q of store.all('quest')) {
    for (const m of q.milestones) {
      if (m.doneAt) events.push({ day: dayOf(m.doneAt), xp: XP.milestone[m.size] ?? XP.milestone.M, target: q.skillId, side: q.sideSkillId, source: 'milestone', label: m.text, quest: q.id });
    }
  }
  for (const m of store.all('moment')) if (m.title?.trim()) events.push({ day: m.date, xp: XP.moment, target: m.skillId, source: 'moment', label: m.title });
  for (const b of store.all('bucket')) if (b.doneAt) events.push({ day: dayOf(b.doneAt), xp: XP.moment, target: b.skillId, source: 'bucket', label: b.title });
  for (const l of store.all('learn')) if (l.doneAt) events.push({ day: dayOf(l.doneAt), xp: XP.learn, target: l.skillId, source: 'learn', label: l.title });
  const refl = reflectionTarget();
  for (const e of store.all('entry')) {
    if (entryFilled(e)) events.push({ day: dayOf(e.createdAt), xp: XP.review[e.type] ?? 0, target: refl, source: 'review', label: e.type });
  }
  return { events, bests };
}

export function compute() {
  if (cache && cacheRev === store.revision()) return cache;
  const { events, bests } = collect();
  const target = {};
  const byDay = {};
  let total = 0;
  for (const e of events) {
    const side = e.side && e.side !== e.target ? Math.round(e.xp * XP.sideFactor) : 0;
    e.total = e.xp + side;
    if (e.target) target[e.target] = (target[e.target] ?? 0) + e.xp;
    if (side) target[e.side] = (target[e.side] ?? 0) + side;
    byDay[e.day] = (byDay[e.day] ?? 0) + e.total;
    total += e.total;
  }
  // An area's XP: what went to it directly plus everything its skills earned.
  const area = {};
  for (const a of store.all('area')) area[a.id] = target[a.id] ?? 0;
  for (const s of store.all('skill')) if (area[s.areaId] != null) area[s.areaId] += target[s.id] ?? 0;
  cache = { events, bests, target, area, total, byDay };
  cacheRev = store.revision();
  return cache;
}

export const skillLevel = id => levelOf(compute().target[id] ?? 0, 'skill');
export const areaLevel = id => levelOf(compute().area[id] ?? 0, 'area');
export const characterLevel = () => levelOf(compute().total, 'character');

// The level of whatever a reward points at.
export function targetLevel(scope, id) {
  if (scope === 'character') return characterLevel().level;
  return scope === 'area' ? areaLevel(id).level : skillLevel(id).level;
}

// Snapshot of all levels, to notice level-ups after a change.
export function levels() {
  const c = compute();
  return {
    character: levelOf(c.total, 'character').level,
    skill: Object.fromEntries(store.all('skill').map(s => [s.id, levelOf(c.target[s.id] ?? 0, 'skill').level])),
    area: Object.fromEntries(store.all('area').map(a => [a.id, levelOf(c.area[a.id] ?? 0, 'area').level])),
    rewards: new Set(store.all('reward').filter(r => targetLevel(r.scope, r.targetId) >= r.level).map(r => r.id)),
  };
}
