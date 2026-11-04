import * as store from '../store.js';
import { LEARN_TYPES, XP } from '../rules.js';
import { dayOf, shortDate, dayMonth } from '../dates.js';
import { esc, ICON, toast } from '../ui.js';
import { vision, setVision, targetOptions, targetLabel, areas, areaOf, questDone, questDoneAt, rhythmLabel, byOrder } from '../model.js';
import { compute } from '../xp.js';
import { openHabit, newHabit } from '../sheets/habit.js';
import { openSettings } from '../settings.js';

// "Mehr": a menu, plus the pages behind it (#vision, #bucket, #lernen, #portfolio, #gewohnheiten).
// Every page here is a plain view with tab "mehr".

const back = () => `<a class="g-back" href="#mehr">${ICON.prev}Mehr</a>`;

export const menu = {
  tab: 'mehr',
  render() {
    const rows = [
      ['#vision', ICON.compass, 'Vision und Werte', 'Wer willst du in 1 und 5 Jahren sein? Leitsätze'],
      ['#bucket', ICON.list, 'Bucket-Liste', 'Erlebnisse fürs Leben'],
      ['#lernen', ICON.book, 'Lernliste', 'Bücher, Kurse, Podcasts, Songs'],
      ['#portfolio', ICON.award, 'Können-Portfolio', 'Alles, was du erreicht hast, zum Exportieren'],
      ['#gewohnheiten', ICON.repeat, 'Gewohnheiten verwalten', 'Alle, auch archivierte'],
    ];
    return `<ul class="g-menu">${rows.map(([href, icon, title, sub]) =>
      `<li><a href="${href}">${icon}<span><b>${title}</b><span class="g-meta">${sub}</span></span>${ICON.next}</a></li>`).join('')}
      <li><button type="button" data-act="settings">${ICON.settings}<span><b>Einstellungen</b><span class="g-meta">Sync, Hell/Dunkel, Backup</span></span>${ICON.next}</button></li>
    </ul>`;
  },
  click(e) {
    if (e.target.closest('[data-act="settings"]')) openSettings();
  },
};

// --- vision ---------------------------------------------------------------------------

export const visionPage = {
  tab: 'mehr',
  render() {
    const v = vision();
    const list = (name, items, placeholder) => `<ul class="subs">${items.map((t, i) => `<li data-i="${i}">`
      + `<span class="plus">${ICON.spark}</span><input name="${name}" value="${esc(t)}" aria-label="Eintrag">`
      + `<button type="button" class="icon-btn sm" data-del="${name}" aria-label="Entfernen">${ICON.close}</button></li>`).join('')}
      <li class="add"><span class="plus">${ICON.plus}</span><input name="${name}-add" placeholder="${placeholder}" enterkeyhint="next"></li></ul>`;
    return `${back()}
      <h1 class="g-page-title">Vision und Werte</h1>
      <section class="g-sec"><h2 class="g-h">In einem Jahr</h2><textarea class="notes" name="year1" placeholder="Was kann ich in einem Jahr? Wie fühlt sich mein Alltag an?">${esc(v.year1)}</textarea></section>
      <section class="g-sec"><h2 class="g-h">In fünf Jahren</h2><textarea class="notes" name="year5" placeholder="Wer will ich in fünf Jahren sein?">${esc(v.year5)}</textarea></section>
      <section class="g-sec"><h2 class="g-h">Meine Werte</h2>${list('values', v.values, 'Wert hinzufügen, z. B. Neugier')}</section>
      <section class="g-sec"><h2 class="g-h">Leitsätze</h2><p class="hint">Einer davon steht jeden Tag über deinen Quests.</p>${list('mottos', v.mottos, 'Leitsatz hinzufügen')}</section>`;
  },
  input(e) {
    const el = e.target;
    if (el.name === 'year1' || el.name === 'year5') return setVision({ [el.name]: el.value });
    if (el.name === 'values' || el.name === 'mottos') {
      const items = [...vision()[el.name]];
      items[+el.closest('[data-i]').dataset.i] = el.value;
      setVision({ [el.name]: items });
    }
  },
  keydown(e) {
    const el = e.target;
    const m = el.name?.match(/^(values|mottos)-add$/);
    if (!m || e.key !== 'Enter' || !el.value.trim() || e.isComposing) return;
    e.preventDefault();
    setVision({ [m[1]]: [...vision()[m[1]], el.value.trim()] });
    el.value = '';
    return 'refocus';
  },
  click(e) {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const name = b.dataset.del;
    setVision({ [name]: vision()[name].filter((_, i) => i !== +b.closest('[data-i]').dataset.i) });
  },
};

// --- bucket list ---------------------------------------------------------------------------

export const bucketPage = {
  tab: 'mehr',
  render() {
    const items = store.all('bucket');
    const open = items.filter(b => !b.doneAt).sort(byOrder);
    const done = items.filter(b => b.doneAt).sort((a, b) => b.doneAt - a.doneAt);
    const row = b => `<li class="g-list-row${b.doneAt ? ' done' : ''}" data-item="${b.id}">
        <button type="button" class="check${b.doneAt ? ' on' : ''}" data-act="toggle" aria-label="Erlebt"></button>
        <input name="title" value="${esc(b.title)}" aria-label="Eintrag">
        <select name="skillId" class="g-mini-select" aria-label="Bereich">${targetOptions(b.skillId, 'Bereich …')}</select>
        ${b.doneAt ? `<span class="g-meta">${shortDate(dayOf(b.doneAt))}</span>` : ''}
        <button type="button" class="icon-btn sm" data-act="delete" aria-label="Entfernen">${ICON.close}</button>
      </li>`;
    return `${back()}
      <h1 class="g-page-title">Bucket-Liste</h1>
      <p class="hint">Was willst du in deinem Leben erleben? Ein abgehakter Punkt zählt als Erstes Mal und gibt ${XP.moment} XP.</p>
      <ul class="g-list">${open.map(row).join('')}
        <li class="g-list-add"><span class="plus">${ICON.plus}</span><input name="add" placeholder="Einmal im Leben …" enterkeyhint="next"></li></ul>
      ${done.length ? `<section class="g-sec"><h2 class="g-h">Erlebt</h2><ul class="g-list">${done.map(row).join('')}</ul></section>` : ''}`;
  },
  ...listHandlers('bucket', b => ({ doneAt: b.doneAt ? null : Date.now() }), b => !b.doneAt && toast(`<b>Erlebt!</b> +${XP.moment} XP`)),
};

// --- learning list ------------------------------------------------------------------------------

export const learnPage = {
  tab: 'mehr',
  render() {
    const items = store.all('learn');
    const group = (title, list) => (list.length ? `<section class="g-sec"><h2 class="g-h">${title}</h2><ul class="g-list">${list.map(row).join('')}</ul></section>` : '');
    const row = l => `<li class="g-list-row${l.doneAt ? ' done' : ''}" data-item="${l.id}">
        <button type="button" class="check${l.doneAt ? ' on' : ''}" data-act="toggle" aria-label="Abgeschlossen"></button>
        <input name="title" value="${esc(l.title)}" aria-label="Titel">
        <select name="type" class="g-mini-select" aria-label="Art">${LEARN_TYPES.map(t => `<option${t === l.type ? ' selected' : ''}>${t}</option>`).join('')}</select>
        ${l.doneAt ? '' : `<select name="status" class="g-mini-select" aria-label="Status"><option value="now"${l.status === 'now' ? ' selected' : ''}>Gerade</option><option value="later"${l.status !== 'now' ? ' selected' : ''}>Später</option></select>`}
        <select name="skillId" class="g-mini-select" aria-label="Bereich">${targetOptions(l.skillId, 'Bereich …')}</select>
        <button type="button" class="icon-btn sm" data-act="delete" aria-label="Entfernen">${ICON.close}</button>
      </li>`;
    const open = items.filter(l => !l.doneAt).sort(byOrder);
    return `${back()}
      <h1 class="g-page-title">Lernliste</h1>
      <p class="hint">Bücher, Kurse, Podcasts, Songs. Abgeschlossenes gibt ${XP.learn} XP und landet im Portfolio.</p>
      <ul class="g-list"><li class="g-list-add"><span class="plus">${ICON.plus}</span><input name="add" placeholder="Titel hinzufügen" enterkeyhint="next"></li></ul>
      ${group('Gerade dran', open.filter(l => l.status === 'now'))}
      ${group('Später', open.filter(l => l.status !== 'now'))}
      ${group('Abgeschlossen', items.filter(l => l.doneAt).sort((a, b) => b.doneAt - a.doneAt))}`;
  },
  ...listHandlers('learn', l => ({ doneAt: l.doneAt ? null : Date.now() }), l => !l.doneAt && toast(`<b>Abgeschlossen!</b> +${XP.learn} XP`), { type: 'Buch', status: 'later' }),
};

// Shared handlers for the two simple lists: add on Enter, edit in place, toggle done, delete.
function listHandlers(kind, toggle, after, defaults = {}) {
  return {
    click(e) {
      const b = e.target.closest('[data-act]');
      const id = b?.closest('[data-item]')?.dataset.item;
      if (!id) return;
      const it = store.get(id);
      if (b.dataset.act === 'toggle') {
        after(it);
        store.update(id, toggle(it));
      } else if (b.dataset.act === 'delete') store.remove(id);
    },
    input(e) {
      const id = e.target.closest('[data-item]')?.dataset.item;
      if (id && e.target.name === 'title') store.update(id, { title: e.target.value });
    },
    change(e) {
      const id = e.target.closest('[data-item]')?.dataset.item;
      const { name, value } = e.target;
      if (id && ['skillId', 'type', 'status'].includes(name)) store.update(id, { [name]: value || null });
    },
    keydown(e) {
      const el = e.target;
      if (el.name !== 'add' || e.key !== 'Enter' || !el.value.trim() || e.isComposing) return;
      e.preventDefault();
      const order = store.all(kind).reduce((m, x) => Math.max(m, x.order ?? 0), 0) + 1;
      store.add(kind, { title: el.value.trim(), skillId: null, doneAt: null, order, ...defaults });
      el.value = '';
      return 'refocus';
    },
  };
}

// --- portfolio ---------------------------------------------------------------------------------

// Everything reached, per area: milestones (as abilities), finished quests, firsts, finished learning.
function achievements() {
  const out = new Map();
  const push = (targetId, item) => {
    const a = areaOf(targetId);
    const key = a?.id ?? '';
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  };
  for (const q of store.all('quest')) {
    for (const m of q.milestones) if (m.doneAt) push(q.skillId, { kind: 'Kann', text: m.text, day: dayOf(m.doneAt), proof: m.proof });
    if (questDone(q)) push(q.skillId, { kind: 'Quest', text: q.title, day: dayOf(questDoneAt(q)) });
  }
  for (const m of store.all('moment')) if (m.title.trim()) push(m.skillId, { kind: 'Erstes Mal', text: m.title, day: m.date });
  for (const b of store.all('bucket')) if (b.doneAt) push(b.skillId, { kind: 'Erlebt', text: b.title, day: dayOf(b.doneAt) });
  for (const l of store.all('learn')) if (l.doneAt) push(l.skillId, { kind: l.type, text: l.title, day: dayOf(l.doneAt) });
  for (const list of out.values()) list.sort((a, b) => b.day.localeCompare(a.day));
  const order = [...areas(true).map(a => a.id), ''];
  return order.filter(id => out.has(id)).map(id => ({ area: id ? store.get(id).name : 'Ohne Bereich', items: out.get(id) }));
}

function portfolioText() {
  return achievements().map(g => `## ${g.area}\n${g.items.map(i => `- ${i.kind === 'Kann' ? '' : `${i.kind}: `}${i.text} (${dayMonth(i.day)} ${i.day.slice(0, 4)})${i.proof ? ` – ${i.proof}` : ''}`).join('\n')}`).join('\n\n');
}

export const portfolioPage = {
  tab: 'mehr',
  render() {
    const groups = achievements();
    return `${back()}
      <div class="g-row-head g-no-print"><h1 class="g-page-title">Können-Portfolio</h1>
        <div class="g-head-actions"><button type="button" class="ghost-btn" data-act="copy">${ICON.copy}Kopieren</button><button type="button" class="pill" data-act="print">${ICON.print}Drucken / PDF</button></div></div>
      <h1 class="g-print-only">Was ich kann</h1>
      ${groups.length ? groups.map(g => `<section class="g-sec"><h2 class="g-h">${esc(g.area)}</h2><ul class="g-portfolio">${g.items.map(i =>
        `<li><span class="g-pf-kind">${esc(i.kind)}</span><span class="g-pf-text">${esc(i.text)}${i.proof ? `<span class="g-meta">${esc(i.proof)}</span>` : ''}</span><span class="g-pf-date">${shortDate(i.day)} ${i.day.slice(2, 4)}</span></li>`).join('')}</ul></section>`).join('')
        : '<p class="hint">Hier sammelt sich alles, was du erreichst: Meilensteine, Quests, Erste Male, Gelerntes.</p>'}`;
  },
  click(e) {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'print') print();
    else if (act === 'copy') navigator.clipboard.writeText(portfolioText()).then(() => toast('Als Text kopiert'), () => toast('Kopieren ging nicht'));
  },
};

// --- habits -----------------------------------------------------------------------------------

export const habitsPage = {
  tab: 'mehr',
  render() {
    const habits = store.all('habit').sort(byOrder);
    const xp = {};
    for (const e of compute().events) if (e.habit) xp[e.habit] = (xp[e.habit] ?? 0) + e.total;
    const row = h => `<li><button type="button" class="g-link-row" data-habit="${h.id}">${ICON.repeat}<span class="g-side-main">`
      + `<span class="g-side-title">${h.avoid ? '<span class="g-avoid">Lassen</span>' : ''}${esc(h.title) || 'Ohne Titel'}</span>`
      + `<span class="g-meta">${esc([targetLabel(h.skillId), rhythmLabel(h.rhythm)].filter(Boolean).join(' · '))}</span></span>`
      + `<span class="g-count">${xp[h.id] ?? 0} XP</span></button></li>`;
    const active = habits.filter(h => !h.archived);
    const archived = habits.filter(h => h.archived);
    return `${back()}
      <div class="g-row-head"><h1 class="g-page-title">Gewohnheiten</h1><button type="button" class="pill" data-act="new">${ICON.plus}Gewohnheit</button></div>
      <ul class="g-linked">${active.map(row).join('')}</ul>
      ${archived.length ? `<section class="g-sec"><h2 class="g-h">Archiviert</h2><ul class="g-linked g-quiet">${archived.map(row).join('')}</ul></section>` : ''}`;
  },
  click(e) {
    const h = e.target.closest('[data-habit]');
    if (h) return openHabit(h.dataset.habit);
    if (e.target.closest('[data-act="new"]')) newHabit();
  },
};
