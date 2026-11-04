import * as store from '../store.js';
import { XP, SIZES } from '../rules.js';
import { esc, ICON, toast } from '../ui.js';
import { targetOptions, targetLabel, questDone, byOrder } from '../model.js';
import { openSheet, blurOnEnter } from '../sheet.js';
import { openHabit, newHabit } from './habit.js';

let id = null;
const quest = () => store.get(id);

export function newQuest(fields = {}) {
  const order = store.all('quest').reduce((m, q) => Math.max(m, q.order ?? 0), 0) + 1;
  const q = store.add('quest', {
    title: '', main: false, skillId: null, sideSkillId: null, why: '', due: null, paused: false, order, milestones: [], ...fields,
  });
  openQuest(q.id);
}

export function openQuest(questId) {
  id = questId;
  openSheet({ render, click, input, change, keydown, close });
  const title = document.querySelector('#sheet .g-title-input');
  if (!title.value) title.focus();
}

export const milestone = (text, size = 'M') => ({ id: crypto.randomUUID(), text, size, doneAt: null, proof: '' });

// Ticks a milestone off (or back on) and tells about the XP and a finished quest.
export function toggleMilestone(questId, msId) {
  const q = store.get(questId);
  const m = q?.milestones.find(x => x.id === msId);
  if (!m) return;
  const doneAt = m.doneAt ? null : Date.now();
  store.update(q.id, { milestones: q.milestones.map(x => (x.id === msId ? { ...x, doneAt } : x)) });
  if (!doneAt) return;
  const after = store.get(q.id);
  toast(questDone(after)
    ? `<b>Quest geschafft:</b> ${esc(after.title)}`
    : `<b>+${XP.milestone[m.size] ?? XP.milestone.M} XP</b> · ${esc(targetLabel(q.skillId) || 'Meilenstein')}`);
}

function render(dlg) {
  const q = quest();
  const habits = store.all('habit').filter(h => !h.archived).sort(byOrder);
  const linked = habits.filter(h => h.questId === q.id);
  const free = habits.filter(h => h.questId !== q.id);
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <textarea class="g-title-input" name="title" rows="1" placeholder="Quest, z. B. Halbmarathon laufen" enterkeyhint="done">${esc(q.title)}</textarea>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <div class="seg">
        <button type="button" data-main="1" aria-pressed="${!!q.main}">Hauptquest</button>
        <button type="button" data-main="0" aria-pressed="${!q.main}">Nebenquest</button>
      </div>
      <div class="fields">
        <label class="field"><span class="label">Bereich</span><div class="ctrl"><select name="skillId">${targetOptions(q.skillId, 'Noch keiner')}</select></div></label>
        <label class="field"><span class="label">Nebenbereich</span><div class="ctrl"><select name="sideSkillId">${targetOptions(q.sideSkillId, 'Keiner')}</select></div></label>
        <label class="field"><span class="label">Zieldatum<small>optional, ohne Druck</small></span><div class="ctrl"><input type="date" name="due" value="${q.due ?? ''}"></div></label>
      </div>
      <section><h3>Warum?</h3><textarea class="notes" name="why" placeholder="Warum ist mir das wichtig? Wer bin ich, wenn ich das kann?">${esc(q.why)}</textarea></section>
      <section>
        <h3>Meilensteine</h3>
        <p class="hint">Als Können formulieren: „Kann 10 km am Stück laufen“, nicht „10× joggen“.</p>
        <ul class="g-ms-list">${q.milestones.map(msRow).join('')}
          <li class="add"><span class="plus">${ICON.plus}</span><input name="ms-add" placeholder="Kann …" aria-label="Meilenstein hinzufügen" enterkeyhint="next"></li>
        </ul>
      </section>
      <section>
        <h3>Gewohnheiten dazu</h3>
        <ul class="g-linked">${linked.map(h => `<li><button type="button" class="g-link-row" data-habit="${h.id}">${ICON.repeat}<span>${esc(h.title) || 'Ohne Titel'}</span></button>`
          + `<button type="button" class="icon-btn sm" data-unlink="${h.id}" aria-label="Verknüpfung lösen">${ICON.close}</button></li>`).join('')}</ul>
        <div class="row">
          ${free.length ? `<select class="g-select" name="link"><option value="">Gewohnheit verknüpfen …</option>${free.map(h => `<option value="${h.id}">${esc(h.title)}</option>`).join('')}</select>` : ''}
          <button type="button" class="pill" data-act="new-habit">${ICON.plus}Neue Gewohnheit</button>
        </div>
      </section>
    </div>
    <footer class="sheet-foot">
      <button type="button" class="ghost-btn danger" data-act="delete">Löschen</button>
      <button type="button" class="ghost-btn" data-act="pause">${q.paused ? 'Fortsetzen' : 'Pausieren'}</button>
      <button type="button" class="pill primary" data-act="close">Fertig</button>
    </footer>`;
}

function msRow(m) {
  const sizes = Object.keys(SIZES).map(k => `<option value="${k}"${m.size === k ? ' selected' : ''}>${k} · ${XP.milestone[k]} XP</option>`).join('');
  return `<li class="g-ms${m.doneAt ? ' done' : ''}" data-ms="${m.id}">
      <div class="g-ms-line">
        <button type="button" class="check${m.doneAt ? ' on' : ''}" data-act="ms-done" aria-label="Erreicht"></button>
        <input name="ms-text" value="${esc(m.text)}" aria-label="Meilenstein" enterkeyhint="next">
        <select name="ms-size" class="g-size-select" aria-label="Größe">${sizes}</select>
        <button type="button" class="icon-btn sm" data-act="ms-delete" aria-label="Entfernen">${ICON.close}</button>
      </div>
      ${m.doneAt || m.proof ? `<input class="g-proof" name="ms-proof" value="${esc(m.proof)}" placeholder="Beweis: Was zeigt, dass du es kannst? (Zeit, Link, Notiz)">` : ''}
    </li>`;
}

const patchMs = (msId, patch) => {
  const q = quest();
  store.update(q.id, { milestones: q.milestones.map(m => (m.id === msId ? { ...m, ...patch } : m)) });
};

function click(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const q = quest();
  const msId = b.closest('[data-ms]')?.dataset.ms;
  if (b.dataset.main) {
    store.update(q.id, { main: b.dataset.main === '1' });
    return document.querySelectorAll('#sheet [data-main]').forEach(x => x.setAttribute('aria-pressed', x === b));
  }
  if (b.dataset.habit) return openHabit(b.dataset.habit);
  if (b.dataset.unlink) {
    store.update(b.dataset.unlink, { questId: null });
    return render(document.getElementById('sheet'));
  }
  switch (b.dataset.act) {
    case 'ms-done':
      toggleMilestone(q.id, msId);
      return render(document.getElementById('sheet'));
    case 'ms-delete':
      store.update(q.id, { milestones: q.milestones.filter(m => m.id !== msId) });
      return render(document.getElementById('sheet'));
    case 'new-habit': return newHabit({ questId: q.id, skillId: q.skillId });
    case 'pause':
      store.update(q.id, { paused: !q.paused });
      return render(document.getElementById('sheet'));
    case 'delete':
      if (q.milestones.some(m => m.doneAt) && !confirm('Quest löschen? Die XP ihrer Meilensteine verschwinden mit. Pausieren behält sie.')) return;
      store.remove(q.id);
      return document.getElementById('sheet').close();
  }
}

function input(e) {
  const el = e.target;
  const msId = el.closest('[data-ms]')?.dataset.ms;
  if (el.name === 'title') store.update(id, { title: el.value.replace(/\n/g, ' ') });
  else if (el.name === 'why') store.update(id, { why: el.value });
  else if (el.name === 'ms-text') patchMs(msId, { text: el.value });
  else if (el.name === 'ms-proof') patchMs(msId, { proof: el.value });
}

function change(e) {
  const el = e.target;
  if (el.name === 'skillId' || el.name === 'sideSkillId') store.update(id, { [el.name]: el.value || null });
  else if (el.name === 'due') store.update(id, { due: el.value || null });
  else if (el.name === 'ms-size') patchMs(el.closest('[data-ms]').dataset.ms, { size: el.value });
  else if (el.name === 'link' && el.value) {
    store.update(el.value, { questId: id });
    render(document.getElementById('sheet'));
  }
}

function keydown(e) {
  if (blurOnEnter(e)) return;
  const el = e.target;
  if (e.key !== 'Enter' || e.isComposing) return;
  if (el.name === 'ms-add' && el.value.trim()) {
    e.preventDefault();
    const q = quest();
    store.update(q.id, { milestones: [...q.milestones, milestone(el.value.trim())] });
    render(document.getElementById('sheet'));
    document.querySelector('#sheet [name="ms-add"]').focus();
  } else if (el.name === 'ms-text') {
    e.preventDefault();
    document.querySelector('#sheet [name="ms-add"]').focus();
  }
}

// A quest closed without a title or milestones was opened by accident.
function close() {
  const q = quest();
  if (q && !q.title.trim() && !q.milestones.length && !q.why.trim()) store.remove(q.id);
}
