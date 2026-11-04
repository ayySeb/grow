import * as store from '../store.js';
import { INTENSITY } from '../rules.js';
import { longDate } from '../dates.js';
import { esc, ICON, num } from '../ui.js';
import { checkId, getCheck, targetLabel } from '../model.js';
import { checkXp } from '../xp.js';
import { openSheet } from '../sheet.js';
import { openHabit } from './habit.js';

// One check = one habit on one day, with optional amount, intensity, mini flag and a note.

let habitId = null;
let date = null;

const blank = { amount: null, intensity: 2, mini: false, note: '' };

export function setCheck(hId, d, fields) {
  store.put(checkId(hId, d), 'check', { habitId: hId, date: d, ...fields });
}

export function quickCheck(hId, d, fields = {}) {
  setCheck(hId, d, { ...blank, ...fields });
}

export const uncheck = (hId, d) => store.remove(checkId(hId, d));

export function openCheck(hId, d, { focusAmount = false } = {}) {
  habitId = hId;
  date = d;
  openSheet({ render, click, input, change, keydown });
  if (focusAmount) document.querySelector('#sheet [name="amount"]')?.focus();
}

function render(dlg) {
  const h = store.get(habitId);
  const c = getCheck(habitId, date);
  const v = { ...blank, ...c };
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <button type="button" class="check big${c ? ' on' : ''}" data-act="done" aria-label="Erledigt"></button>
        <div class="g-sheet-heading">
          <h2>${h.avoid ? 'Gelassen: ' : ''}${esc(h.title) || 'Ohne Titel'}</h2>
          <span class="g-sub-line">${longDate(date)}${targetLabel(h.skillId) ? ` · ${esc(targetLabel(h.skillId))}` : ''}</span>
        </div>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <div class="fields">
        ${h.mode === 'amount' ? `<label class="field"><span class="label">Menge</span><div class="ctrl"><input type="number" inputmode="decimal" step="any" min="0" name="amount" class="g-num" value="${v.amount ?? ''}" placeholder="0"><span class="g-hint-inline">${esc(h.unit)}</span></div></label>` : ''}
        <div class="field"><span class="label">Intensität</span><div class="ctrl"><div class="seg g-seg-inline">${INTENSITY.map(([k, l]) =>
          `<button type="button" data-intensity="${k}" aria-pressed="${v.intensity === k}">${l}</button>`).join('')}</div></div></div>
        ${h.mini ? `<label class="field g-switch-field"><span class="label">Mini-Version</span><div class="ctrl"><span class="g-hint-inline">${esc(h.mini)}</span><input type="checkbox" class="switch" name="mini"${v.mini ? ' checked' : ''}></div></label>` : ''}
      </div>
      <section><h3>Notiz</h3><textarea class="notes" name="note" placeholder="Wie lief's? Mit wem? Was war anders?">${esc(v.note)}</textarea></section>
      <p class="g-xp-line">${c ? `+${checkXp(v)} XP` : `Abhaken gibt ${checkXp(v)} XP`}${c && h.mode === 'amount' && c.amount ? ` · ${num(c.amount)} ${esc(h.unit)}` : ''}</p>
    </div>
    <footer class="sheet-foot">
      <button type="button" class="ghost-btn" data-act="edit">Gewohnheit bearbeiten</button>
      <button type="button" class="pill primary" data-act="close">Fertig</button>
    </footer>`;
}

const redraw = () => render(document.getElementById('sheet'));

// Any detail entered counts as having done it.
const save = patch => setCheck(habitId, date, { ...blank, ...getCheck(habitId, date), ...patch });

function click(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.intensity) {
    save({ intensity: +b.dataset.intensity });
    return redraw();
  }
  if (b.dataset.act === 'done') {
    if (getCheck(habitId, date)) uncheck(habitId, date);
    else quickCheck(habitId, date);
    return redraw();
  }
  if (b.dataset.act === 'edit') openHabit(habitId);
}

function input(e) {
  const el = e.target;
  if (el.name === 'note') save({ note: el.value });
  else if (el.name === 'amount') {
    save({ amount: el.value === '' ? null : Math.max(0, parseFloat(el.value.replace(',', '.')) || 0) });
    document.querySelector('#sheet .check.big').classList.add('on');
  }
}

function change(e) {
  if (e.target.name === 'mini') {
    save({ mini: e.target.checked });
    redraw();
  } else if (e.target.name === 'amount') redraw();
}

function keydown(e) {
  if (e.key === 'Enter' && e.target.name === 'amount') {
    e.preventDefault();
    e.target.blur();
  }
}
