import { SEED } from './rules.js';

// All data lives in one object: { items: { [id]: item }, settings, sync }. Every item has a `kind`:
// area, skill, habit, check, quest, moment, entry, bucket, learn, reward, vision.
// Deletes are soft (deleted: true) and every change bumps updatedAt, so sync can merge by last write.
// `sync.dirty` lists items changed since they were last uploaded, `sync.cursor` marks how far we have pulled.
//
// Most items get a random id. Items that exist at most once per thing get a fixed id, so two devices
// write the same row instead of creating duplicates: checks ("chk:<habit>:<day>"), reviews ("week:2026-11-02"),
// and the vision page ("vision").

const KEY = 'grow.v1';
export const DEFAULT_SETTINGS = { theme: 'auto', accent: 'graphite' };

const listeners = new Set();
let state;
let saveTimer = null;
let rev = 0;
let origin = 'local';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* unreadable storage: start fresh */ }
  return seed();
}

function normalize(s) {
  const items = s.items ?? {};
  const sync = s.sync ?? { cursor: null, dirty: Object.fromEntries(Object.keys(items).map(id => [id, true])) };
  return { items, settings: { ...DEFAULT_SETTINGS, ...s.settings }, sync };
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
addEventListener('pagehide', () => saveTimer && flush());

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}

function commit(from = 'local') {
  rev++;
  origin = from;
  persist();
  listeners.forEach(fn => fn());
}

export const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));
// Bumps on every change, so derived data (XP, levels) can be cached until the next one.
export const revision = () => rev;
// Whether the last change came from another device; level-up messages are only shown for own changes.
export const lastChangeWasRemote = () => origin === 'remote';

export const settings = () => state.settings;
export function setSettings(patch) {
  Object.assign(state.settings, patch);
  commit();
}

// --- items -------------------------------------------------------------------------

function make(kind, fields, id = crypto.randomUUID()) {
  const now = Date.now();
  return { id, kind, createdAt: now, updatedAt: now, ...fields };
}

// updatedAt always moves forward, even if another device's clock ran ahead of this one.
const bump = it => Math.max(Date.now(), it.updatedAt + 1);

export function get(id) {
  const it = state.items[id];
  return it && !it.deleted ? it : null;
}

export const all = kind => Object.values(state.items).filter(it => it.kind === kind && !it.deleted);

export function add(kind, fields) {
  const it = make(kind, fields);
  state.items[it.id] = it;
  state.sync.dirty[it.id] = true;
  commit();
  return it;
}

export function update(id, patch) {
  const it = state.items[id];
  if (!it) return;
  Object.assign(it, patch, { updatedAt: bump(it) });
  state.sync.dirty[id] = true;
  commit();
}

export const remove = id => update(id, { deleted: true });

// Writes an item with a fixed id: creates it, revives it if it was deleted, or merges the fields in.
export function put(id, kind, fields) {
  const it = state.items[id];
  if (it) Object.assign(it, fields, { deleted: false, updatedAt: bump(it) });
  else state.items[id] = make(kind, fields, id);
  state.sync.dirty[id] = true;
  commit();
}

// --- start content -------------------------------------------------------------------

function seed() {
  const items = {};
  const add = (kind, fields, id) => {
    const it = make(kind, { ...fields, seed: true }, id);
    items[it.id] = it;
    return it;
  };
  const targets = {};
  SEED.areas.forEach((a, i) => {
    const area = add('area', { name: a.name, focus: !!a.focus, order: i, archived: false });
    targets[a.name] = area.id;
    a.skills.forEach((s, j) => {
      const { name, role = null } = typeof s === 'string' ? { name: s } : s;
      targets[`${a.name}/${name}`] = add('skill', { areaId: area.id, name, role, order: j, archived: false }).id;
    });
  });
  const quests = {};
  SEED.quests.forEach((q, i) => {
    quests[q.title] = add('quest', {
      title: q.title, main: !!q.main, skillId: targets[q.skill] ?? null, sideSkillId: null, why: '', due: null,
      paused: false, order: i,
      milestones: q.milestones.map(([text, size]) => ({ id: crypto.randomUUID(), text, size, doneAt: null, proof: '' })),
    }).id;
  });
  SEED.habits.forEach((h, i) => add('habit', {
    title: h.title, skillId: targets[h.skill] ?? null, sideSkillId: null, rhythm: { days: [], times: 1, ...h.rhythm },
    mode: h.mode ?? 'check', unit: h.unit ?? '', avoid: !!h.avoid, mini: h.mini ?? '', questId: quests[h.quest] ?? null,
    archived: false, order: i,
  }));
  add('vision', { year1: '', year5: '', values: [], mottos: SEED.mottos }, 'vision');
  return normalize({ items });
}

state = load();

// --- backup ---------------------------------------------------------------------------

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const s = JSON.parse(json);
  if (!s || typeof s.items !== 'object') throw new Error('not a backup');
  const { items, settings } = normalize(s);
  for (const it of Object.values(items)) it.updatedAt = bump(it);
  state = { items, settings, sync: { cursor: state.sync.cursor, dirty: Object.fromEntries(Object.keys(items).map(id => [id, true])) } };
  commit();
}

// --- sync bookkeeping (used by sync.js) ---------------------------------------------------

export const syncState = () => state.sync;
export const rawItem = id => state.items[id] ?? null;

export function setCursor(cursor) {
  state.sync.cursor = cursor;
  persist();
}

// Takes rows from the server; a row only replaces the local item if it is newer.
export function applyRemote(rows) {
  let changed = false;
  for (const r of rows) {
    const local = state.items[r.id];
    if (local && local.updatedAt >= r.updated_at) continue;
    state.items[r.id] = r.data;
    delete state.sync.dirty[r.id];
    changed = true;
  }
  if (changed) commit('remote');
}

// Clears the dirty mark, unless the item changed again while the upload was running.
export function markPushed(pairs) {
  for (const [id, updatedAt] of pairs) if (state.items[id]?.updatedAt === updatedAt) delete state.sync.dirty[id];
  persist();
}

// A second device signing in to an account that already has data should not add its start content again.
export function dropUntouchedSeed() {
  for (const it of Object.values(state.items)) {
    if (!it.seed || it.updatedAt !== it.createdAt) continue;
    delete state.items[it.id];
    delete state.sync.dirty[it.id];
  }
  commit('remote');
}
