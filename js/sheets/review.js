import * as store from '../store.js';
import { REVIEWS, MOODS, XP } from '../rules.js';
import { periodLabel, periodRange, dayOf } from '../dates.js';
import { esc, ICON, num } from '../ui.js';
import { areas, questDoneAt, entryFilled } from '../model.js';
import { compute } from '../xp.js';
import { radar } from '../charts.js';
import { openSheet } from '../sheet.js';

// Day, week, month, quarter and year reviews share one sheet. Each is stored under "<type>:<key>".

let type = null;
let key = null;
const entryId = () => `${type}:${key}`;
const entry = () => store.get(entryId()) ?? { answers: {}, wheel: {} };
const save = patch => store.put(entryId(), 'entry', { type, key, ...patch });

export function openReview(id) {
  [type, key] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  openSheet({ render, click, input });
}

// What happened in a period, only the good parts: XP, reached milestones, firsts, finished quests.
export function summary(t, k) {
  const [from, to] = periodRange(t, k);
  const inside = d => d >= from && d <= to;
  const events = compute().events.filter(e => inside(e.day));
  return {
    xp: events.reduce((s, e) => s + e.total, 0),
    milestones: events.filter(e => e.source === 'milestone').map(e => e.label),
    moments: events.filter(e => e.source === 'moment' || e.source === 'bucket').map(e => e.label),
    quests: store.all('quest').filter(q => questDoneAt(q) && inside(dayOf(questDoneAt(q)))).map(q => q.title),
    learned: events.filter(e => e.source === 'learn').map(e => e.label),
  };
}

function summaryHtml() {
  const s = summary(type, key);
  const lines = [
    ...s.quests.map(t => `<li><b>Quest geschafft:</b> ${esc(t)}</li>`),
    ...s.milestones.map(t => `<li>${esc(t)}</li>`),
    ...s.moments.map(t => `<li><span class="g-muted">Erstes Mal:</span> ${esc(t)}</li>`),
    ...s.learned.map(t => `<li><span class="g-muted">Gelernt:</span> ${esc(t)}</li>`),
  ];
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  return `<div class="g-summary">
      <div class="g-summary-stats"><span><b>+${num(s.xp)}</b> XP</span><span>${count(s.milestones.length, 'Meilenstein', 'Meilensteine')}</span><span>${count(s.moments.length, 'Erstes Mal', 'Erste Male')}</span></div>
      ${lines.length ? `<ul class="g-summary-list">${lines.join('')}</ul>` : ''}
    </div>`;
}

// Quarter and year: the first and the last wheel inside the period, on top of each other.
function compareHtml() {
  const [from, to] = periodRange(type, key);
  const wheels = store.all('entry').filter(e => e.type === 'month' && Object.keys(e.wheel ?? {}).length)
    .filter(e => { const [a] = periodRange('month', e.key); return a >= from && a <= to; })
    .sort((a, b) => a.key.localeCompare(b.key));
  if (!wheels.length) return '<p class="hint">Sobald du im Monatsrückblick dein Lebensrad bewertest, siehst du hier, wie es sich verändert.</p>';
  const list = areas();
  const values = w => list.map(a => w.wheel[a.id] ?? 0);
  const series = wheels.length > 1 ? [{ values: values(wheels[0]), cls: 'g-old' }, { values: values(wheels.at(-1)) }] : [{ values: values(wheels[0]) }];
  return `<div class="g-radar-wrap">${radar(list.map(a => a.name), series, 10, 'Lebensrad im Vergleich')}</div>`
    + (wheels.length > 1 ? `<p class="g-radar-key"><span class="g-key g-old"></span>${periodLabel('month', wheels[0].key)}<span class="g-key"></span>${periodLabel('month', wheels.at(-1).key)}</p>` : '');
}

const question = (q, e) => `<label class="g-question"><span>${esc(q.text)}</span>`
  + `<textarea class="notes" name="answer" data-q="${q.id}" rows="2">${esc(e.answers?.[q.id] ?? '')}</textarea></label>`;

function render(dlg) {
  const cfg = REVIEWS[type];
  const e = entry();
  let body;
  if (type === 'day') {
    body = `
      <div class="seg g-moods">${MOODS.map((m, i) => `<button type="button" data-mood="${i + 1}" aria-pressed="${e.mood === i + 1}">${m}</button>`).join('')}</div>
      <textarea class="notes" name="text" placeholder="Ein Satz zu diesem Tag …">${esc(e.text ?? '')}</textarea>`;
  } else {
    const more = cfg.more ?? [];
    const opened = more.some(q => e.answers?.[q.id]?.trim());
    body = `
      ${summaryHtml()}
      ${cfg.compare ? `<section><h3>Lebensrad</h3>${compareHtml()}</section>` : ''}
      <section class="g-questions">${cfg.questions.map(q => question(q, e)).join('')}</section>
      ${more.length ? `<details class="g-details"${opened ? ' open' : ''}><summary>Mehr Fragen</summary><div class="g-questions">${more.map(q => question(q, e)).join('')}</div></details>` : ''}
      ${cfg.wheel ? `<section><h3>Lebensrad</h3><p class="hint">Wie zufrieden bist du gerade, 0 bis 10? Eine Momentaufnahme, kein Level.</p>
        <div class="g-wheel">${areas().map(a => { const v = e.wheel?.[a.id]; return `<label class="g-wheel-row"><span>${esc(a.name)}</span>`
          + `<input type="range" min="0" max="10" step="1" name="wheel" data-area="${a.id}" value="${v ?? 5}"${v == null ? ' class="unset"' : ''}>`
          + `<output>${v ?? '–'}</output></label>`; }).join('')}</div></section>` : ''}`;
  }
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <div class="g-sheet-heading"><h2>${cfg.label}</h2><span class="g-sub-line">${periodLabel(type, key)}</span></div>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      ${body}
      <p class="g-xp-line">${entryFilled(store.get(entryId())) ? `+${XP.review[type]} XP für Reflexion` : `Gibt ${XP.review[type]} XP, sobald du etwas schreibst`}</p>
    </div>
    <footer class="sheet-foot"><button type="button" class="pill primary" data-act="close">Fertig</button></footer>`;
}

function click(e) {
  const b = e.target.closest('[data-mood]');
  if (!b) return;
  const mood = +b.dataset.mood;
  save({ mood: entry().mood === mood ? null : mood });
  document.querySelectorAll('#sheet [data-mood]').forEach(x => x.setAttribute('aria-pressed', x === b && entry().mood === mood));
}

function input(e) {
  const el = e.target;
  if (el.name === 'text') save({ text: el.value });
  else if (el.name === 'answer') save({ answers: { ...entry().answers, [el.dataset.q]: el.value } });
  else if (el.name === 'wheel') {
    el.classList.remove('unset');
    el.nextElementSibling.textContent = el.value;
    save({ wheel: { ...entry().wheel, [el.dataset.area]: +el.value } });
  }
}
