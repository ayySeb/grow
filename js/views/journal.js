import * as store from '../store.js';
import { REVIEWS, MOODS } from '../rules.js';
import { periodKey, periodLabel, periodRange, monthName, parse } from '../dates.js';
import { esc } from '../ui.js';
import { entryFilled } from '../model.js';
import { reviewBanners } from './today.js';

// Everything written: day sentences, week, month, quarter and year reviews, newest first, grouped by month.

const TYPES = ['week', 'month', 'quarter', 'year'];
const KIND = { day: 'Tag', week: 'Woche', month: 'Monat', quarter: 'Quartal', year: 'Jahr' };

function preview(e) {
  if (e.type === 'day') return e.text;
  const cfg = REVIEWS[e.type];
  const qs = [...cfg.questions, ...(cfg.more ?? [])];
  const first = qs.find(q => e.answers?.[q.id]?.trim());
  if (first) return e.answers[first.id];
  return Object.keys(e.wheel ?? {}).length ? 'Lebensrad bewertet' : '';
}

function entryRow(e) {
  const mood = e.type === 'day' && e.mood ? `<span class="g-mood-tag" data-mood="${e.mood}">${MOODS[e.mood - 1]}</span>` : '';
  const when = e.type === 'day' ? periodLabel('day', e.key) : `${REVIEWS[e.type].label} · ${periodLabel(e.type, e.key)}`;
  return `<li><button type="button" class="g-entry${e.type === 'day' ? '' : ' g-entry-review'}" data-review="${e.id}">
      <span class="g-entry-when">${esc(when)}${mood}</span>
      <span class="g-entry-text">${esc(preview(e))}</span>
    </button></li>`;
}

export function render() {
  const entries = store.all('entry').filter(e => entryFilled(e) || e.mood)
    .map(e => ({ e, start: periodRange(e.type, e.key)[0] }))
    .sort((a, b) => b.start.localeCompare(a.start) || (a.e.type === 'day') - (b.e.type === 'day'));
  let html = '';
  let month = '';
  for (const { e, start } of entries) {
    const m = start.slice(0, 7);
    if (m !== month) {
      if (month) html += '</ul>';
      month = m;
      html += `<h3 class="g-subhead">${monthName(parse(start))} ${start.slice(0, 4)}</h3><ul class="g-entries">`;
    }
    html += entryRow(e);
  }
  if (month) html += '</ul>';
  return `
    ${reviewBanners()}
    <div class="g-row-head"><h2 class="g-h">Rückblick schreiben</h2></div>
    <div class="g-review-btns">${TYPES.map(t => `<button type="button" class="g-review-btn" data-review="${t}:${periodKey(t)}">`
      + `<b>${KIND[t]}</b><span>${esc(periodLabel(t, periodKey(t)))}</span></button>`).join('')}</div>
    <section class="g-sec">
      <h2 class="g-h">Journal</h2>
      ${html || '<p class="hint">Noch leer. Ein Satz am Tag reicht, unter „Heute“.</p>'}
    </section>`;
}

