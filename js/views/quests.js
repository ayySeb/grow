import * as store from '../store.js';
import { daysBetween, todayIso } from '../dates.js';
import { esc, ICON } from '../ui.js';
import { targetLabel, questDone, nextMilestone, questDoneAt, vision, byOrder, areaOf } from '../model.js';
import { newQuest, openQuest, toggleMilestone } from '../sheets/quest.js';
import { openIdeas } from '../sheets/ideas.js';

// Start screen: a motto, the main quests with their next step, then side quests.

function motto() {
  const list = vision().mottos.filter(m => m.trim());
  if (!list.length) return '';
  const i = daysBetween('2026-01-01', todayIso()) % list.length;
  return `<p class="g-motto">${esc(list[(i + list.length) % list.length])}</p>`;
}

// Focus areas first, then the quest's own order.
const rank = q => (areaOf(q.skillId)?.focus ? 0 : 1);
const sorted = list => list.sort((a, b) => rank(a) - rank(b) || byOrder(a, b));

function steps(q) {
  return `<span class="g-steps" aria-hidden="true">${q.milestones.map(m => `<i${m.doneAt ? ' class="on"' : ''}></i>`).join('')}</span>`;
}

function nextHtml(q) {
  const m = nextMilestone(q);
  if (!m) return q.milestones.length ? '' : '<p class="g-next g-muted">Noch keine Meilensteine. Tippe, um welche anzulegen.</p>';
  return `<div class="g-next"><button type="button" class="check" data-ms="${m.id}" aria-label="Meilenstein erreicht"></button><span>${esc(m.text)}</span></div>`;
}

function mainCard(q) {
  const done = q.milestones.filter(m => m.doneAt).length;
  return `<article class="g-quest" data-quest="${q.id}">
      <div class="g-quest-meta"><span>${esc(targetLabel(q.skillId))}</span>${q.milestones.length ? `<span class="g-count">${done}/${q.milestones.length}</span>` : ''}</div>
      <h3 class="g-quest-title">${esc(q.title) || 'Ohne Titel'}</h3>
      ${q.milestones.length ? steps(q) : ''}
      ${nextHtml(q)}
    </article>`;
}

function sideRow(q) {
  const m = nextMilestone(q);
  const done = q.milestones.filter(x => x.doneAt).length;
  return `<li class="g-side" data-quest="${q.id}">
      ${m ? `<button type="button" class="check" data-ms="${m.id}" aria-label="Nächsten Meilenstein erreicht"></button>` : '<span class="g-check-space"></span>'}
      <div class="g-side-main"><span class="g-side-title">${esc(q.title) || 'Ohne Titel'}</span>
        <span class="g-meta">${m ? esc(m.text) : 'Noch keine Meilensteine'}</span></div>
      ${q.milestones.length ? `<span class="g-count">${done}/${q.milestones.length}</span>` : ''}
    </li>`;
}

export function render() {
  const all = store.all('quest');
  const active = all.filter(q => !q.paused && !questDone(q));
  const main = sorted(active.filter(q => q.main));
  const side = sorted(active.filter(q => !q.main));
  const paused = all.filter(q => q.paused && !questDone(q)).sort(byOrder);
  const done = all.filter(questDone).sort((a, b) => questDoneAt(b) - questDoneAt(a));
  return `
    ${motto()}
    <div class="g-row-head">
      <h2 class="g-h">Hauptquests</h2>
      <div class="g-head-actions">
        <button type="button" class="ghost-btn" data-act="ideas">${ICON.bulb}Ideen</button>
        <button type="button" class="pill" data-act="new">${ICON.plus}Quest</button>
      </div>
    </div>
    ${main.length ? `<div class="g-quests">${main.map(mainCard).join('')}</div>`
      : '<p class="hint">Noch keine Hauptquest. Mach eine Quest im Quest-Sheet zur Hauptquest, dann steht sie hier oben.</p>'}
    <section class="g-sec">
      <h2 class="g-h">Nebenquests</h2>
      ${side.length ? `<ul class="g-sides">${side.map(sideRow).join('')}</ul>` : '<p class="hint">Keine Nebenquests gerade.</p>'}
    </section>
    ${paused.length ? `<details class="g-details"><summary>Pausiert (${paused.length})</summary><ul class="g-sides">${paused.map(sideRow).join('')}</ul></details>` : ''}
    ${done.length ? `<details class="g-details"><summary>Geschafft (${done.length})</summary><ul class="g-sides g-done-list">${done.map(sideRow).join('')}</ul></details>` : ''}`;
}

export function click(e) {
  const ms = e.target.closest('[data-ms]');
  if (ms) return toggleMilestone(ms.closest('[data-quest]').dataset.quest, ms.dataset.ms);
  const q = e.target.closest('[data-quest]');
  if (q) return openQuest(q.dataset.quest);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'new') newQuest({ main: !store.all('quest').some(x => x.main && !x.paused && !questDone(x)) });
  else if (act === 'ideas') openIdeas();
}
