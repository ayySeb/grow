import * as store from '../store.js';
import { XP } from '../rules.js';
import { esc, ICON } from '../ui.js';
import { targetOptions } from '../model.js';
import { openSheet, blurOnEnter } from '../sheet.js';

// An "Erstes Mal" or a special experience: a one-off thing worth remembering, with XP and a badge.

let id = null;

export function newMoment(date, fields = {}) {
  const m = store.add('moment', { title: '', date, skillId: null, note: '', ...fields });
  openMoment(m.id);
}

export function openMoment(momentId) {
  id = momentId;
  openSheet({ render, input, change, click, keydown: blurOnEnter, close });
  const title = document.querySelector('#sheet .g-title-input');
  if (!title.value) title.focus();
}

function render(dlg) {
  const m = store.get(id);
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <span class="g-moment-icon">${ICON.spark}</span>
        <textarea class="g-title-input" name="title" rows="1" placeholder="Zum ersten Mal …" enterkeyhint="done">${esc(m.title)}</textarea>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <p class="hint">Erste Male und besondere Momente: erster Halbmarathon, erstes Konzert allein, erstes Gespräch auf Englisch. Gibt ${XP.moment} XP und ein Abzeichen.</p>
      <div class="fields">
        <label class="field"><span class="label">Datum</span><div class="ctrl"><input type="date" name="date" value="${m.date}"></div></label>
        <label class="field"><span class="label">Bereich</span><div class="ctrl"><select name="skillId">${targetOptions(m.skillId, 'Noch keiner')}</select></div></label>
      </div>
      <section><h3>Notiz</h3><textarea class="notes" name="note" placeholder="Wie war's?">${esc(m.note)}</textarea></section>
    </div>
    <footer class="sheet-foot">
      <button type="button" class="ghost-btn danger" data-act="delete">Löschen</button>
      <button type="button" class="pill primary" data-act="close">Fertig</button>
    </footer>`;
}

function input(e) {
  const el = e.target;
  if (el.name === 'title') store.update(id, { title: el.value.replace(/\n/g, ' ') });
  else if (el.name === 'note') store.update(id, { note: el.value });
}

function change(e) {
  const el = e.target;
  if (el.name === 'date' && el.value) store.update(id, { date: el.value });
  else if (el.name === 'skillId') store.update(id, { skillId: el.value || null });
}

function click(e) {
  if (e.target.closest('[data-act="delete"]')) {
    store.remove(id);
    document.getElementById('sheet').close();
  }
}

function close() {
  const m = store.get(id);
  if (m && !m.title.trim() && !m.note.trim()) store.remove(m.id);
}
