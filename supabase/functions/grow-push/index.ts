// Edge function "grow-push": the Sunday reminder for the week review (see js/push.js).
//   GET                       → { publicKey } so a device can subscribe
//   POST {}                   → called every hour by a cron job (see supabase.sql): sends one message per device
//                               on Sunday from 18:00 local time, if that week's review is not written yet
//   POST { test: true }       → with a user's token: a sample message to that user's devices right away
// JWT verification is off, because the cron job calls it without a token. That is safe: a reminder goes out
// at most once per week and device (last_week), so extra calls send nothing.
// The VAPID keys are made on the first call and kept in grow_push_keys, which only this function can read.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const HOUR = 18;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function keys() {
  const read = () => db.from('grow_push_keys').select('public_key, private_key').eq('id', 1).maybeSingle();
  let { data } = await read();
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    await db.from('grow_push_keys').upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { ignoreDuplicates: true });
    ({ data } = await read());
  }
  webpush.setVapidDetails('mailto:grow@ayyseb.github.io', data!.public_key, data!.private_key);
  return data!;
}

type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string; tz: string; last_week: string | null };

// Local weekday, hour and the Monday of the local week, e.g. { sunday: true, hour: 18, week: '2026-11-02' }.
function local(tz: string, now = new Date()) {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]));
  } catch {
    return local('Europe/Berlin', now);
  }
  const day = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  const back = (day.getUTCDay() + 6) % 7;
  const monday = new Date(day.getTime() - back * 864e5).toISOString().slice(0, 10);
  return { sunday: parts.weekday === 'Sun', hour: +parts.hour, week: monday };
}

// Same rule as entryFilled in js/model.js.
async function written(userId: string, week: string) {
  const { data } = await db.from('grow_items').select('data').eq('user_id', userId).eq('id', `week:${week}`).maybeSingle();
  const e = data?.data;
  if (!e || e.deleted) return false;
  return Object.values(e.answers ?? {}).some(v => typeof v === 'string' && v.trim()) || Object.keys(e.wheel ?? {}).length > 0;
}

async function send(sub: Sub, msg: Record<string, string>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), { TTL: 6 * 3600 });
    return true;
  } catch (e) {
    // The device unsubscribed or the browser dropped it.
    if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('grow_push_subs').delete().eq('user_id', sub.user_id).eq('endpoint', sub.endpoint);
    else console.error('push failed', e?.statusCode, e?.body ?? e);
    return false;
  }
}

async function remind() {
  const { data: subs } = await db.from('grow_push_subs').select('*');
  let sent = 0;
  for (const sub of (subs ?? []) as Sub[]) {
    const t = local(sub.tz);
    if (!t.sunday || t.hour < HOUR || sub.last_week === t.week) continue;
    await db.from('grow_push_subs').update({ last_week: t.week }).eq('user_id', sub.user_id).eq('endpoint', sub.endpoint);
    if (await written(sub.user_id, t.week)) continue;
    if (await send(sub, {
      title: 'Zeit für deinen Wochenrückblick',
      body: 'Was kannst du jetzt besser als letzte Woche?',
      tag: `week:${t.week}`,
      url: `./?review=week:${t.week}`,
    })) sent++;
  }
  return sent;
}

async function test(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: 'not signed in' }, 401);
  const { data: subs } = await db.from('grow_push_subs').select('*').eq('user_id', user.id);
  let sent = 0;
  for (const sub of (subs ?? []) as Sub[]) {
    if (await send(sub, { title: 'grow', body: 'So sieht die Sonntags-Erinnerung aus.', tag: 'test', url: './#heute' })) sent++;
  }
  return json({ sent });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { public_key } = await keys();
  if (req.method === 'GET') return json({ publicKey: public_key });
  const body = await req.json().catch(() => ({}));
  if (body.test) return test(req);
  return json({ sent: await remind() });
});
