import * as store from '../store.js';
import { QUEST_IDEAS } from '../rules.js';
import { esc, ICON } from '../ui.js';
import { areas } from '../model.js';
import { openSheet } from '../sheet.js';
import { newQuest, milestone } from './quest.js';

// Quest suggestions per area, from rules.js. Taking one creates a side quest with its milestones.

export function openIdeas() {
  openSheet({ render, click });
}

function render(dlg) {
  const groups = areas().filter(a => QUEST_IDEAS[a.name]?.length);
  dlg.innerHTML = `
    <div class="sheet-body">
      <div class="sheet-top">
        <h2>Quest-Ideen</h2>
        <button type="button" class="icon-btn" data-act="close" aria-label="Schließen">${ICON.close}</button>
      </div>
      <p class="hint">Nimm, was dich reizt. Alles lässt sich danach anpassen.</p>
      ${groups.map(a => `<section><h3>${esc(a.name)}</h3><div class="g-ideas">${QUEST_IDEAS[a.name].map((idea, i) =>
        `<button type="button" class="g-idea" data-area="${a.id}" data-idea="${i}"><b>${esc(idea.title)}</b>`
        + `<span>${idea.milestones.map(esc).join(' → ')}</span></button>`).join('')}</div></section>`).join('')}
    </div>`;
}

function click(e) {
  const b = e.target.closest('[data-idea]');
  if (!b) return;
  const area = store.get(b.dataset.area);
  const idea = QUEST_IDEAS[area.name][+b.dataset.idea];
  newQuest({ title: idea.title, skillId: area.id, milestones: idea.milestones.map(t => milestone(t)) });
}
