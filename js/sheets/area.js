import * as store from '../store.js';
import { esc, ICON } from '../ui.js';
import { byOrder } from '../model.js';
import { compute } from '../xp.js';
import { openSheet, blurOnEnter } from '../sheet.js';

// Rename an area, mark it as focus, and manage its skills. Archiving hides something but keeps its XP.

let id = null;

export function newArea() {
  const order = store.all('area').reduce((m, a) => Math.max(m, a.order ?? 0), 0) + 1;
  const a = store.add('area', { name: '', focus: false, order, archived: false });
  openArea(a.id);
}

export function openArea(areaId) {
  id = areaId;
  openSheet({ render, click, input, change, keydown, close });
  const title = document.querySelector('#sheet .g-title-input');
  if (!title.value) title.focus();
}

const skills = () => store.all('skill').filter(s => s.areaId === id).sort(byOrder);

function render(dlg) {
  const a = store.get(id);
  const active = skills().filter(s => !s.archived);
  const archived = skills().filter(s => s.archived);
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <textarea class="g-title-input" name="name" rows="1" placeholder="Bereich, z. B. Körper" enterkeyhint="done">${esc(a.name)}</textarea>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <label class="switch-row"><span>Fokus-Bereich: steht überall oben</span><input type="checkbox" class="switch" name="focus"${a.focus ? ' checked' : ''}></label>
      <section>
        <h3>Skills</h3>
        <p class="hint">Was genau willst du in diesem Bereich können? Zum Beispiel Ausdauer, Kraft, Schlaf.</p>
        <ul class="subs">${active.map(s => `<li data-skill="${s.id}"><span class="plus">${ICON.grid}</span>`
          + `<input name="skill-name" value="${esc(s.name)}" aria-label="Skill">`
          + `<button type="button" class="icon-btn sm" data-act="archive-skill" aria-label="Archivieren" title="Archivieren (XP bleiben)">${ICON.close}</button></li>`).join('')}
          <li class="add"><span class="plus">${ICON.plus}</span><input name="skill-add" placeholder="Skill hinzufügen" enterkeyhint="next"></li>
        </ul>
        ${archived.length ? `<details class="g-details"><summary>Archiviert (${archived.length})</summary><ul class="subs">${archived.map(s =>
          `<li data-skill="${s.id}"><span class="g-muted">${esc(s.name)}</span><button type="button" class="ghost-btn" data-act="restore-skill">Zurückholen</button></li>`).join('')}</ul></details>` : ''}
      </section>
    </div>
    <footer class="sheet-foot">
      <button type="button" class="ghost-btn" data-act="archive">${a.archived ? 'Wieder aktivieren' : 'Bereich archivieren'}</button>
      <button type="button" class="pill primary" data-act="close">Fertig</button>
    </footer>`;
}

const redraw = () => render(document.getElementById('sheet'));

function click(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const skillId = b.closest('[data-skill]')?.dataset.skill;
  switch (b.dataset.act) {
    case 'archive-skill':
      store.update(skillId, { archived: true });
      return redraw();
    case 'restore-skill':
      store.update(skillId, { archived: false });
      return redraw();
    case 'archive':
      store.update(id, { archived: !store.get(id).archived });
      return redraw();
  }
}

function input(e) {
  const el = e.target;
  if (el.name === 'name') store.update(id, { name: el.value.replace(/\n/g, ' ') });
  else if (el.name === 'skill-name') store.update(el.closest('[data-skill]').dataset.skill, { name: el.value });
}

function change(e) {
  if (e.target.name === 'focus') store.update(id, { focus: e.target.checked });
}

function keydown(e) {
  if (blurOnEnter(e)) return;
  const el = e.target;
  if (e.key === 'Enter' && el.name === 'skill-add' && el.value.trim() && !e.isComposing) {
    e.preventDefault();
    const order = skills().reduce((m, s) => Math.max(m, s.order ?? 0), 0) + 1;
    store.add('skill', { areaId: id, name: el.value.trim(), role: null, order, archived: false });
    redraw();
    document.querySelector('#sheet [name="skill-add"]').focus();
  }
}

// An area closed without a name and without XP was created by accident.
function close() {
  const a = store.get(id);
  if (a && !a.name.trim() && !compute().area[a.id] && !skills().length) store.remove(a.id);
}
