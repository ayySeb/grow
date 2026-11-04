const CACHE = 'grow-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/store.js', 'js/sync.js', 'js/config.js', 'js/rules.js', 'js/dates.js', 'js/ui.js', 'js/model.js',
  'js/xp.js', 'js/charts.js', 'js/sheet.js', 'js/settings.js', 'js/timer.js', 'js/photos.js', 'js/push.js',
  'js/views/quests.js', 'js/views/today.js', 'js/views/character.js', 'js/views/journal.js', 'js/views/more.js',
  'js/sheets/quest.js', 'js/sheets/habit.js', 'js/sheets/check.js', 'js/sheets/moment.js', 'js/sheets/area.js',
  'js/sheets/review.js', 'js/sheets/ideas.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'favicon.ico', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Tage lives on the same origin, so only grow's own old caches are cleared.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('grow-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first so updates show up right away; the cache only steps in when offline.
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Fonts and the Supabase library come from CDNs; cache them so the app also starts offline.
  const cdn = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);
  if (url.origin !== location.origin && !cdn) return;

  e.respondWith(
    fetch(request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))),
  );
});

// The Sunday reminder (see js/push.js). Tapping it opens grow, or brings an open window to the week review.
self.addEventListener('push', e => {
  const msg = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(msg.title ?? 'grow', {
    body: msg.body ?? '',
    tag: msg.tag ?? 'grow',
    icon: 'icons/icon-192.png',
    data: { url: msg.url ?? './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url ?? './', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => c.url.startsWith(self.registration.scope) && 'navigate' in c);
      return open ? open.navigate(url).then(c => c?.focus()) : self.clients.openWindow(url);
    }),
  );
});
