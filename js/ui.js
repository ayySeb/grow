const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICON = {
  prev: svg('<path d="M15 6l-6 6 6 6"/>'),
  next: svg('<path d="M9 6l6 6-6 6"/>'),
  settings: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  quests: svg('<path d="M6 21V4"/><path d="M6 4h11l-2.5 4L17 12H6"/>'),
  today: svg('<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  character: svg('<path d="M12 3.5l8 5.8-3 9.7H7L4 9.3z"/><path d="M12 9l3.2 2.3-1.2 3.7h-4l-1.2-3.7z"/>'),
  journal: svg('<path d="M6 4h10a3 3 0 0 1 3 3v13H9a3 3 0 0 1-3-3z"/><path d="M6 17a3 3 0 0 1 3-3h10"/>'),
  more: svg('<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>'),
  edit: svg('<path d="M5 19h3.5L19 8.5 15.5 5 5 15.5z"/><path d="M13.5 7l3.5 3.5"/>'),
  spark: svg('<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M7 17l2-2M15 9l2-2"/>'),
  bulb: svg('<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  note: svg('<path d="M5 7h14M5 12h14M5 17h8"/>'),
  compass: svg('<circle cx="12" cy="12" r="8.5"/><path d="M15 9l-1.8 4.2L9 15l1.8-4.2z"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  book: svg('<path d="M4 5.5C6.5 4 9.5 4 12 5.5v14c-2.5-1.5-5.5-1.5-8 0z"/><path d="M20 5.5C17.5 4 14.5 4 12 5.5v14c2.5-1.5 5.5-1.5 8 0z"/>'),
  award: svg('<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>'),
  repeat: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
  grid: svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  print: svg('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>'),
  pause: svg('<path d="M9 5v14M15 5v14" stroke-width="2.5"/>'),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>'),
  camera: svg('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.5"/>'),
};

// A running clock: 754000 → "12:34", 3723000 → "1:02:03".
const pad = n => String(n).padStart(2, '0');
export function clock(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

// A habit timer's time (see timer.js): ticks while it runs, stands still while paused.
export function liveClock(t, cls = '') {
  if (!t.start) return `<span class="${cls}">${clock(t.ms)}</span>`;
  return `<span class="${cls}" data-base="${t.ms}" data-since="${t.start}">${clock(t.ms + Date.now() - t.start)}</span>`;
}

export function tick(root = document) {
  const now = Date.now();
  for (const el of root.querySelectorAll('[data-since]')) el.textContent = clock(+el.dataset.base + now - +el.dataset.since);
}
setInterval(tick, 1000);

const NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
export const num = n => NUM.format(n);

// Short message at the bottom of the screen, e.g. after a level-up.
const toastEl = document.getElementById('toast');
let toastTimer = null;
let toastAt = 0;
// Messages arriving together (a milestone and the level-up it caused) are shown together.
export function toast(html) {
  const together = !toastEl.hidden && Date.now() - toastAt < 300;
  toastAt = Date.now();
  toastEl.innerHTML = together ? `${html}<br>${toastEl.innerHTML}` : html;
  toastEl.hidden = false;
  toastEl.classList.remove('g-toast-in');
  void toastEl.offsetWidth;
  toastEl.classList.add('g-toast-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3600);
}
toastEl.addEventListener('click', () => (toastEl.hidden = true));

// A thin progress bar for a level: { into, need } from xp.levelOf.
export const bar = lv => `<span class="g-bar"><i style="width:${Math.min(100, (lv.into / lv.need) * 100).toFixed(1)}%"></i></span>`;
export const lvTag = lv => `<span class="g-lv">Lv ${lv.level}</span>`;
