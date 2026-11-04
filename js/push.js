import { account } from './sync.js';

// The Sunday reminder for the week review, as web push. This device subscribes with the public key of the
// edge function "grow-push" and saves the subscription in grow_push_subs (one row per device). A cron job
// calls the function every hour; it sends one message on Sunday from 18:00 local time, only if that week's
// review is not written yet, and never a second one that week (see supabase/functions/grow-push).

const FN = 'grow-push';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const subscription = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await subscription()) ? 'on' : 'off';
}

const bytes = b64 => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Each returns null on success, otherwise a message to show.
export async function enablePush() {
  const acc = account();
  if (!acc) return 'Melde dich zuerst an, damit die Erinnerung ankommt.';
  if (await Notification.requestPermission() !== 'granted') return 'Ohne Erlaubnis für Mitteilungen geht es nicht.';
  try {
    const { data, error } = await acc.db.functions.invoke(FN, { method: 'GET' });
    if (error || !data?.publicKey) throw error ?? new Error('no key');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(data.publicKey) });
    const { endpoint, keys } = sub.toJSON();
    const { error: saveError } = await acc.db.from('grow_push_subs').upsert({
      user_id: acc.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, { onConflict: 'user_id,endpoint' });
    if (saveError) {
      await sub.unsubscribe();
      throw saveError;
    }
    return null;
  } catch (e) {
    console.warn('Push-Anmeldung fehlgeschlagen', e);
    return 'Hat nicht geklappt. Bist du online?';
  }
}

export async function disablePush() {
  const sub = await subscription();
  if (!sub) return null;
  const acc = account();
  if (acc) await acc.db.from('grow_push_subs').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
  return null;
}

// Sends a sample message to this account's devices right away.
export async function testPush() {
  const acc = account();
  const { data, error } = await acc.db.functions.invoke(FN, { body: { test: true } });
  return error || !data?.sent ? 'Die Probe kam nicht durch.' : null;
}
