import * as store from './store.js';
import { initSync } from './sync.js';
import { openSettings, applySettings } from './settings.js';
import { levels } from './xp.js';
import { ICON, esc, toast, liveClock, tick } from './ui.js';
import { targetLabel } from './model.js';
import { todayIso } from './dates.js';
import { activeHabit } from './timer.js';
import { openCheck, stopAndTell } from './sheets/check.js';
import { fillPhotos } from './photos.js';
import * as quests from './views/quests.js';
import * as today from './views/today.js';
import * as character from './views/character.js';
import * as journal from './views/journal.js';
import { menu, visionPage, bucketPage, learnPage, portfolioPage, habitsPage } from './views/more.js';
import { openReview } from './sheets/review.js';

// Hash routing between the views. Each view has render() and optional click / input / change / keydown /
// submit handlers; `tab` names the tab it belongs to (pages under "Mehr").

const VIEWS = {
  quests, heute: today, charakter: character, journal, mehr: menu,
  vision: visionPage, bucket: bucketPage, lernen: learnPage, portfolio: portfolioPage, gewohnheiten: habitsPage,
};
const TABS = [['quests', 'Quests'], ['heute', 'Heute'], ['charakter', 'Charakter'], ['journal', 'Journal'], ['mehr', 'Mehr']];
const TAB_ICON = { quests: 'quests', heute: 'today', charakter: 'character', journal: 'journal', mehr: 'more' };

const view = document.getElementById('view');
let pending = false;
let shownDay = todayIso();

const route = () => {
  const name = location.hash.slice(1);
  return VIEWS[name] ? name : 'quests';
};
const current = () => VIEWS[route()];

function render() {
  pending = false;
  const name = route();
  const v = VIEWS[name];
  view.innerHTML = v.render();
  v.after?.(view);
  fillPhotos(view);
  const tab = v.tab ?? name;
  document.querySelectorAll('[data-tab]').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
  document.body.dataset.view = name;
}

// Re-render on every change, except while something in the view is being typed into; then on leaving it.
const typing = () => {
  const a = document.activeElement;
  return a && view.contains(a) && a.matches('textarea, select, input:not([type="checkbox"]):not([type="range"])');
};
function refresh() {
  if (typing()) pending = true;
  else render();
}
view.addEventListener('focusout', () => setTimeout(() => pending && !typing() && render(), 0));

for (const type of ['click', 'input', 'change', 'keydown', 'submit']) {
  view.addEventListener(type, e => {
    const result = current()[type]?.(e, render);
    // A list added an entry on Enter: show it now and keep typing in the same field.
    if (result === 'refocus') {
      const name = e.target.name;
      render();
      view.querySelector(`[name="${name}"]`)?.focus();
    }
  });
}

// Reviews can be opened from anywhere (banners, journal).
document.addEventListener('click', e => {
  const r = e.target.closest('[data-review]');
  if (r) openReview(r.dataset.review);
});

// --- level-ups ----------------------------------------------------------------------

let known = levels();
function watchLevels() {
  const now = levels();
  const before = known;
  known = now;
  if (store.lastChangeWasRemote()) return;
  const lines = [];
  if (now.character > before.character) lines.push(`<b>Charakterlevel ${now.character}</b>`);
  for (const [id, lv] of Object.entries(now.area)) if (lv > (before.area[id] ?? 1)) lines.push(`${esc(targetLabel(id))} ist jetzt <b>Level ${lv}</b>`);
  for (const [id, lv] of Object.entries(now.skill)) if (lv > (before.skill[id] ?? 1)) lines.push(`${esc(targetLabel(id))} ist jetzt <b>Level ${lv}</b>`);
  for (const id of now.rewards) if (!before.rewards.has(id)) lines.push(`Belohnung freigeschaltet: <b>${esc(store.get(id).title)}</b>`);
  if (lines.length) toast(lines.slice(0, 3).join('<br>'));
}

// --- timer bar ----------------------------------------------------------------------------
// While a habit timer is going, a bar at the bottom shows it on every screen, with a stop button.

const dock = document.getElementById('dock');
function renderDock() {
  const h = activeHabit();
  dock.hidden = !h;
  document.body.classList.toggle('has-dock', !!h);
  if (!h) return;
  dock.innerHTML = `<button type="button" class="dock-main" data-open="${h.id}"><span class="pulse${h.timer.start ? '' : ' paused'}"></span>`
    + `<span class="dock-title">${esc(h.title) || 'Ohne Titel'}</span>${liveClock(h.timer, 'dock-time')}</button>`
    + `<button type="button" class="icon-btn sm dock-stop" data-stop="${h.id}" aria-label="Timer stoppen und eintragen" title="Stoppen und eintragen">${ICON.stop}</button>`;
  tick(dock);
}

dock.addEventListener('click', e => {
  const stop = e.target.closest('[data-stop]');
  const open = e.target.closest('[data-open]');
  if (stop) stopAndTell(stop.dataset.stop);
  else if (open) openCheck(open.dataset.open, store.get(open.dataset.open).timer.day);
});

// --- start ------------------------------------------------------------------------------

function nav() {
  const link = ([id, label]) => `<a href="#${id}" data-tab="${id}">${ICON[TAB_ICON[id]]}<span>${label}</span></a>`;
  document.getElementById('tabs').innerHTML = TABS.map(link).join('');
  document.getElementById('bottomTabs').innerHTML = TABS.map(link).join('');
}

// Pick up a new day when the app stays open over midnight or comes back from the background.
function checkDay() {
  if (shownDay === todayIso()) return;
  shownDay = todayIso();
  today.resetDate();
  refresh();
}
setInterval(checkDay, 60_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkDay());

document.querySelectorAll('[data-icon]').forEach(b => (b.innerHTML = ICON[b.dataset.icon]));
document.getElementById('settingsBtn').onclick = openSettings;
addEventListener('hashchange', () => {
  render();
  scrollTo(0, 0);
});
applySettings();
nav();
store.subscribe(watchLevels);
store.subscribe(refresh);
store.subscribe(renderDock);
render();
renderDock();
initSync();

// The Sunday reminder opens grow with ?review=week:2026-11-02.
const review = new URLSearchParams(location.search).get('review');
if (review) {
  history.replaceState(null, '', location.pathname + (location.hash || '#heute'));
  if (/^week:\d{4}-\d{2}-\d{2}$/.test(review)) openReview(review);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
