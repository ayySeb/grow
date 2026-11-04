import * as store from './store.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Syncs items through Supabase, the same project and login as Tage. Each item is one row in grow_items
// holding the whole item as JSON. The newer updatedAt wins, here in store.applyRemote and on the server
// in a trigger (see supabase.sql). A sync run pulls everything changed since the last cursor, then uploads
// the local dirty items; a realtime channel brings in changes from other devices right away.

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
const TABLE = 'grow_items';
const PAGE = 500;

export const syncEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

let db = null;
let user = null;
let channel = null;
let status = 'idle'; // idle | syncing | error | offline
let lastSync = null;
let running = false;
let again = false;
let pushTimer = null;
const listeners = new Set();

export const onSyncChange = fn => listeners.add(fn);
export const syncInfo = () => ({ enabled: syncEnabled, ready: !!db, email: user?.email ?? null, status, lastSync });
// The signed-in client and user for photos and push (photos.js, push.js); null without an account.
export const account = () => (user ? { db, user } : null);

function setStatus(s) {
  status = s;
  listeners.forEach(fn => fn());
}

export async function initSync() {
  if (!syncEnabled) return;
  try {
    const { createClient } = await import(LIB);
    db = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    return setStatus('offline');
  }
  db.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    if (next?.id === user?.id) return;
    user = next;
    // Supabase asks not to await its own calls inside this callback.
    setTimeout(userChanged, 0);
  });
  store.subscribe(schedulePush);
  addEventListener('online', syncNow);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow());
  setInterval(syncNow, 60_000);
}

function userChanged() {
  channel?.unsubscribe();
  channel = null;
  setStatus('idle');
  if (!user) return;
  channel = db.channel(TABLE)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${user.id}` },
      ({ new: row }) => row?.data && store.applyRemote([row]))
    .subscribe();
  syncNow();
}

function schedulePush() {
  if (!user || !Object.keys(store.syncState().dirty).length) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 800);
}

// One run at a time; a request during a run triggers exactly one more run afterwards.
export async function syncNow() {
  if (!user) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  do {
    again = false;
    await run();
  } while (again);
  running = false;
}

async function run() {
  if (!navigator.onLine) return setStatus('offline');
  setStatus('syncing');
  try {
    await pull();
    await push();
    lastSync = new Date();
    setStatus('idle');
  } catch (e) {
    console.warn('Sync fehlgeschlagen', e);
    setStatus('error');
  }
}

async function pull() {
  let firstPull = !store.syncState().cursor;
  for (;;) {
    const cursor = store.syncState().cursor;
    let q = db.from(TABLE).select('id, data, updated_at, synced_at').order('synced_at').limit(PAGE);
    if (cursor) q = q.gt('synced_at', cursor);
    const { data, error } = await q;
    if (error) throw error;
    if (firstPull && data.length) store.dropUntouchedSeed();
    firstPull = false;
    store.applyRemote(data);
    if (data.length) store.setCursor(data.at(-1).synced_at);
    if (data.length < PAGE) return;
  }
}

async function push() {
  const rows = Object.keys(store.syncState().dirty)
    .map(store.rawItem)
    .filter(Boolean)
    .map(it => ({ id: it.id, user_id: user.id, kind: it.kind, data: it, updated_at: it.updatedAt }));
  for (let i = 0; i < rows.length; i += PAGE) {
    const batch = rows.slice(i, i + PAGE);
    const { error } = await db.from(TABLE).upsert(batch, { onConflict: 'user_id,id' });
    if (error) throw error;
    store.markPushed(batch.map(r => [r.id, r.updated_at]));
  }
}

// --- account -------------------------------------------------------------------

const MESSAGES = [
  [/invalid login credentials/i, 'E-Mail oder Passwort stimmt nicht.'],
  [/already registered/i, 'Dieses Konto gibt es schon. Melde dich an.'],
  [/at least \d+ characters/i, 'Das Passwort braucht mindestens 6 Zeichen.'],
  [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse.'],
  [/signups not allowed/i, 'Neue Konten sind für diese App deaktiviert.'],
  [/fetch/i, 'Keine Verbindung. Bist du online?'],
];
const message = e => MESSAGES.find(([re]) => re.test(e.message))?.[1] ?? e.message;

// Each returns null on success, otherwise a message to show.
export async function signIn(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });
  return error && message(error);
}

export async function signUp(email, password) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return message(error);
  return data.session ? null : 'Fast geschafft: Bestätige den Link in deiner E-Mail und melde dich dann an.';
}

// Local data stays on the device; the next sign-in pulls everything again.
export async function signOut() {
  await db.auth.signOut();
  store.setCursor(null);
}
