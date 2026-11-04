import * as store from '../store.js';
import { esc, ICON } from '../ui.js';
import { targetOptions, WEEKDAYS, byOrder } from '../model.js';
import { heatmap } from '../charts.js';
import { openSheet, blurOnEnter } from '../sheet.js';

let id = null;
const habit = () => store.get(id);

export function newHabit(fields = {}) {
  const order = store.all('habit').reduce((m, h) => Math.max(m, h.order ?? 0), 0) + 1;
  const h = store.add('habit', {
    title: '', skillId: null, sideSkillId: null, rhythm: { type: 'daily', days: [], times: 3 }, mode: 'check', unit: '',
    avoid: false, mini: '', questId: null, archived: false, order, ...fields,
  });
  openHabit(h.id);
}

export function openHabit(habitId) {
  id = habitId;
  openSheet({ render, click, input, change, keydown, close });
  const title = document.querySelector('#sheet .g-title-input');
  if (!title.value) title.focus();
}

function render(dlg) {
  const h = habit();
  const r = h.rhythm;
  const quests = store.all('quest').filter(q => !q.paused || q.id === h.questId).sort(byOrder);
  const values = {};
  for (const c of store.all('check')) if (c.habitId === h.id) values[c.date] = 1;
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <textarea class="g-title-input" name="title" rows="1" placeholder="Gewohnheit, z. B. Laufen" enterkeyhint="done">${esc(h.title)}</textarea>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <div class="seg">
        <button type="button" data-avoid="0" aria-pressed="${!h.avoid}">Etwas tun</button>
        <button type="button" data-avoid="1" aria-pressed="${!!h.avoid}">Etwas lassen</button>
      </div>
      <div class="fields">
        <label class="field"><span class="label">Bereich</span><div class="ctrl"><select name="skillId">${targetOptions(h.skillId, 'Noch keiner')}</select></div></label>
        <label class="field"><span class="label">Nebenbereich</span><div class="ctrl"><select name="sideSkillId">${targetOptions(h.sideSkillId, 'Keiner')}</select></div></label>
        <label class="field"><span class="label">Rhythmus</span><div class="ctrl">
          <select name="rhythm">
            <option value="daily"${r.type === 'daily' ? ' selected' : ''}>Täglich</option>
            <option value="days"${r.type === 'days' ? ' selected' : ''}>Bestimmte Wochentage</option>
            <option value="weekly"${r.type === 'weekly' ? ' selected' : ''}>X-mal pro Woche</option>
          </select></div></label>
        ${r.type === 'days' ? `<div class="field"><span class="label">Tage</span><div class="ctrl g-days">${WEEKDAYS.map((d, i) =>
          `<button type="button" class="chip${r.days.includes(i + 1) ? ' on' : ''}" data-day="${i + 1}">${d}</button>`).join('')}</div></div>` : ''}
        ${r.type === 'weekly' ? `<label class="field"><span class="label">Wie oft</span><div class="ctrl"><input type="number" name="times" min="1" max="7" value="${r.times}" class="g-num"><span class="g-hint-inline">× pro Woche</span></div></label>` : ''}
        <label class="field"><span class="label">Erfassen</span><div class="ctrl">
          <select name="mode">
            <option value="check"${h.mode === 'check' ? ' selected' : ''}>Nur abhaken</option>
            <option value="amount"${h.mode === 'amount' ? ' selected' : ''}>Mit Menge</option>
          </select>
          ${h.mode === 'amount' ? `<input name="unit" value="${esc(h.unit)}" placeholder="Einheit, z. B. km" class="g-unit">` : ''}
        </div></label>
        <label class="field"><span class="label">Quest</span><div class="ctrl"><select name="questId"><option value="">Keine</option>${quests.map(q =>
          `<option value="${q.id}"${q.id === h.questId ? ' selected' : ''}>${esc(q.title) || 'Ohne Titel'}</option>`).join('')}</select></div></label>
      </div>
      <section>
        <h3>Mini-Version</h3>
        <p class="hint">Die kleinste Form, die trotzdem zählt. Nach einer Pause schlägt grow sie dir vor.</p>
        <input class="g-input" name="mini" value="${esc(h.mini)}" placeholder="z. B. 1 Liegestütz, 2 Min Gitarre">
      </section>
      <section>
        <h3>Letzte 12 Wochen</h3>
        ${heatmap(values, { weeks: 12, level: v => (v ? 4 : 0), format: () => 'erledigt' })}
      </section>
    </div>
    <footer class="sheet-foot">
      <button type="button" class="ghost-btn danger" data-act="delete">Löschen</button>
      <button type="button" class="ghost-btn" data-act="archive">${h.archived ? 'Wieder aktivieren' : 'Archivieren'}</button>
      <button type="button" class="pill primary" data-act="close">Fertig</button>
    </footer>`;
}

const setRhythm = patch => store.update(id, { rhythm: { ...habit().rhythm, ...patch } });
const redraw = () => render(document.getElementById('sheet'));

function click(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const h = habit();
  if (b.dataset.avoid) {
    store.update(id, { avoid: b.dataset.avoid === '1' });
    return document.querySelectorAll('#sheet [data-avoid]').forEach(x => x.setAttribute('aria-pressed', x === b));
  }
  if (b.dataset.day) {
    const d = +b.dataset.day;
    const days = h.rhythm.days.includes(d) ? h.rhythm.days.filter(x => x !== d) : [...h.rhythm.days, d];
    setRhythm({ days });
    return b.classList.toggle('on');
  }
  if (b.dataset.act === 'archive') {
    store.update(id, { archived: !h.archived });
    return redraw();
  }
  if (b.dataset.act === 'delete') {
    const used = store.all('check').some(c => c.habitId === id);
    if (used && !confirm('Gewohnheit löschen? Ihre XP verschwinden mit. Archivieren behält sie.')) return;
    store.remove(id);
    document.getElementById('sheet').close();
  }
}

function input(e) {
  const el = e.target;
  if (el.name === 'title') store.update(id, { title: el.value.replace(/\n/g, ' ') });
  else if (el.name === 'mini') store.update(id, { mini: el.value });
  else if (el.name === 'unit') store.update(id, { unit: el.value });
}

function change(e) {
  const el = e.target;
  if (el.name === 'skillId' || el.name === 'sideSkillId' || el.name === 'questId') store.update(id, { [el.name]: el.value || null });
  else if (el.name === 'rhythm') {
    const days = el.value === 'days' && !habit().rhythm.days.length ? [1, 3, 5] : habit().rhythm.days;
    setRhythm({ type: el.value, days });
    redraw();
  } else if (el.name === 'times') setRhythm({ times: Math.min(7, Math.max(1, +el.value || 1)) });
  else if (el.name === 'mode') {
    store.update(id, { mode: el.value });
    redraw();
  }
}

const keydown = e => blurOnEnter(e);

function close() {
  const h = habit();
  if (h && !h.title.trim() && !store.all('check').some(c => c.habitId === h.id)) store.remove(h.id);
}

