import * as store from '../store.js';
import { BADGES } from '../rules.js';
import { iso, startOfWeek, shortDate } from '../dates.js';
import { esc, ICON, num, bar, lvTag } from '../ui.js';
import { areas, skillsOf, questDone, checksOf, targetLabel, byOrder } from '../model.js';
import { compute, levelOf, characterLevel, targetLevel } from '../xp.js';
import { radar, heatmap, legend, sparkline } from '../charts.js';
import { openArea, newArea } from '../sheets/area.js';
import { openHabit } from '../sheets/habit.js';

// The character sheet: overall level, the wheel of areas, areas with their skills, XP heatmap,
// measured values, badges, rewards and how the self-rated life wheel changed.

function summary() {
  const c = compute();
  const quests = store.all('quest');
  const entries = store.all('entry');
  const skillLevels = store.all('skill').map(s => levelOf(c.target[s.id] ?? 0, 'skill').level);
  const list = areas();
  return {
    checks: c.events.filter(e => e.source === 'check').length,
    milestones: c.events.filter(e => e.source === 'milestone').length,
    moments: c.events.filter(e => e.source === 'moment').length,
    questsDone: quests.filter(questDone).length,
    mainDone: quests.filter(q => q.main && questDone(q)).length,
    bests: c.bests.size,
    maxSkill: Math.max(1, ...skillLevels),
    character: characterLevel().level,
    weekReviews: entries.filter(e => e.type === 'week' && Object.values(e.answers ?? {}).some(v => v?.trim())).length,
    wheels: entries.filter(e => e.type === 'month' && Object.keys(e.wheel ?? {}).length).length,
    learnDone: store.all('learn').filter(l => l.doneAt).length,
    bucketDone: store.all('bucket').filter(b => b.doneAt).length,
    areaCount: list.length,
    areasWithXp: list.filter(a => c.area[a.id] > 0).length,
  };
}

function hero() {
  const lv = characterLevel();
  const c = compute();
  const monday = iso(startOfWeek(new Date()));
  const week = Object.entries(c.byDay).filter(([d]) => d >= monday).reduce((s, [, v]) => s + v, 0);
  const s = summary();
  return `<div class="g-hero">
      <div class="g-hero-top"><span class="g-hero-label">Charakterlevel</span><b class="g-hero-level">${lv.level}</b></div>
      ${bar(lv)}
      <span class="g-meta">${num(lv.xp)} XP gesamt · noch ${num(lv.need - lv.into)} bis Level ${lv.level + 1}</span>
    </div>
    <div class="cards">
      <div class="card"><b>+${num(week)}</b><span>XP diese Woche</span></div>
      <div class="card"><b>${s.milestones}</b><span>${s.milestones === 1 ? 'Meilenstein' : 'Meilensteine'}</span></div>
      <div class="card"><b>${s.moments}</b><span>${s.moments === 1 ? 'Erstes Mal' : 'Erste Male'}</span></div>
    </div>`;
}

function wheel() {
  const list = areas();
  if (list.length < 3) return '';
  const c = compute();
  const lvls = list.map(a => levelOf(c.area[a.id] ?? 0, 'area').level);
  const max = Math.max(5, ...lvls);
  return `<div class="g-radar-wrap">${radar(list.map(a => a.name), [{ values: lvls }], max, 'Level pro Bereich')}</div>`;
}

function areaBlock(a) {
  const c = compute();
  const lv = levelOf(c.area[a.id] ?? 0, 'area');
  const skills = skillsOf(a.id);
  return `<li class="g-area">
      <button type="button" class="g-area-head" data-area="${a.id}">
        <span class="g-area-name">${a.focus ? '<span class="g-focus" title="Fokus">●</span>' : ''}${esc(a.name)}</span>
        ${lvTag(lv)}${bar(lv)}<span class="g-edit">${ICON.edit}</span>
      </button>
      ${skills.length ? `<ul class="g-skills">${skills.map(s => {
        const sl = levelOf(c.target[s.id] ?? 0, 'skill');
        return `<li><span>${esc(s.name)}</span>${lvTag(sl)}${bar(sl)}</li>`;
      }).join('')}</ul>` : ''}
    </li>`;
}

function measures() {
  const habits = store.all('habit').filter(h => h.mode === 'amount').sort(byOrder);
  const rows = habits.map(h => {
    const vals = checksOf(h.id).filter(c => c.amount > 0).map(c => c.amount);
    if (!vals.length) return '';
    return `<li><button type="button" class="g-measure" data-habit="${h.id}">
        <span class="g-measure-title">${esc(h.title)}<span class="g-meta">Bestwert ${num(Math.max(...vals))} ${esc(h.unit)} · zuletzt ${num(vals.at(-1))}</span></span>
        ${sparkline(vals.slice(-30))}</button></li>`;
  }).join('');
  return rows ? `<section class="g-sec"><h2 class="g-h">Messwerte</h2><ul class="g-measures">${rows}</ul></section>` : '';
}

function badges() {
  const s = summary();
  const earned = BADGES.filter(b => b.test(s));
  const moments = store.all('moment').filter(m => m.title.trim()).sort((a, b) => b.date.localeCompare(a.date));
  const items = [
    ...earned.map(b => `<li class="g-badge"><span class="g-badge-icon">${ICON.award}</span><b>${esc(b.title)}</b><span>${esc(b.text)}</span></li>`),
    ...moments.map(m => `<li class="g-badge g-badge-moment"><span class="g-badge-icon">${ICON.spark}</span><b>${esc(m.title)}</b><span>${shortDate(m.date)}</span></li>`),
  ];
  return `<section class="g-sec"><h2 class="g-h">Abzeichen</h2>
      ${items.length ? `<ul class="g-badges">${items.join('')}</ul>` : '<p class="hint">Dein erstes Abzeichen kommt mit dem ersten Haken, Meilenstein oder Ersten Mal.</p>'}
    </section>`;
}

function rewardTargets(selected) {
  const opt = (v, l) => `<option value="${v}"${v === selected ? ' selected' : ''}>${esc(l)}</option>`;
  let html = opt('character:', 'Charakterlevel');
  for (const a of areas()) {
    html += `<optgroup label="${esc(a.name)}">${opt(`area:${a.id}`, `${a.name} (Bereich)`)}${skillsOf(a.id).map(s => opt(`skill:${s.id}`, s.name)).join('')}</optgroup>`;
  }
  return html;
}

function rewards() {
  const list = store.all('reward').sort((a, b) => a.createdAt - b.createdAt);
  const label = r => (r.scope === 'character' ? 'Charakterlevel' : targetLabel(r.targetId));
  return `<section class="g-sec"><h2 class="g-h">Belohnungen</h2>
      <p class="hint">Gönn dir was, wenn ein Level erreicht ist.</p>
      ${list.length ? `<ul class="g-rewards">${list.map(r => {
        const reached = targetLevel(r.scope, r.targetId) >= r.level;
        return `<li class="${reached ? 'reached' : ''}" data-reward="${r.id}"><span class="g-reward-title">${esc(r.title)}</span>`
          + `<span class="g-meta">${esc(label(r))} Level ${r.level}${reached ? ' · erreicht' : ''}</span>`
          + `<button type="button" class="icon-btn sm" data-act="reward-delete" aria-label="Entfernen">${ICON.close}</button></li>`;
      }).join('')}</ul>` : ''}
      <form class="g-reward-form">
        <input name="title" placeholder="z. B. Neue Laufschuhe" required>
        <select name="target">${rewardTargets('character:')}</select>
        <input name="level" type="number" min="2" max="99" value="5" class="g-num" aria-label="Level">
        <button class="pill">Hinzufügen</button>
      </form>
    </section>`;
}

function wheelHistory() {
  const months = store.all('entry').filter(e => e.type === 'month' && Object.keys(e.wheel ?? {}).length).sort((a, b) => a.key.localeCompare(b.key));
  if (!months.length) return '';
  const list = areas();
  const values = e => list.map(a => e.wheel[a.id] ?? 0);
  const series = months.slice(-3).map((e, i, arr) => ({ values: values(e), cls: i < arr.length - 1 ? 'g-old' : '' }));
  return `<section class="g-sec"><h2 class="g-h">Lebensrad-Verlauf</h2>
      <p class="hint">Deine Zufriedenheit aus den Monatsrückblicken. Der kräftige Umriss ist der neueste Monat.</p>
      <div class="g-radar-wrap">${radar(list.map(a => a.name), series, 10, 'Lebensrad-Verlauf')}</div>
    </section>`;
}

export function render() {
  const values = compute().byDay;
  return `
    ${hero()}
    ${wheel()}
    <section class="g-sec">
      <div class="g-row-head"><h2 class="g-h">Bereiche und Skills</h2><button type="button" class="pill" data-act="new-area">${ICON.plus}Bereich</button></div>
      <ul class="g-areas">${areas().map(areaBlock).join('')}</ul>
      ${areas(true).some(a => a.archived) ? `<details class="g-details"><summary>Archivierte Bereiche</summary><ul class="g-areas">${areas(true).filter(a => a.archived).map(areaBlock).join('')}</ul></details>` : ''}
    </section>
    <section class="g-sec">
      <h2 class="g-h">XP der letzten 26 Wochen</h2>
      ${heatmap(values, { level: v => (!v ? 0 : v < 15 ? 1 : v < 40 ? 2 : v < 80 ? 3 : 4), format: v => `+${num(v)} XP` })}
      <div class="hm-foot"><span class="hm-caption">Tippe auf einen Tag</span>${legend()}</div>
    </section>
    ${measures()}
    ${badges()}
    ${rewards()}
    ${wheelHistory()}`;
}

export function after(view) {
  const scroller = view.querySelector('.hm-scroll');
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}

export function click(e) {
  const area = e.target.closest('[data-area]');
  if (area) return openArea(area.dataset.area);
  const habit = e.target.closest('[data-habit]');
  if (habit) return openHabit(habit.dataset.habit);
  const cell = e.target.closest('.hm-cell[data-day]');
  if (cell) return (e.currentTarget.querySelector('.hm-caption').textContent = cell.title);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'new-area') newArea();
  else if (act === 'reward-delete') store.remove(e.target.closest('[data-reward]').dataset.reward);
}

export function submit(e) {
  if (!e.target.matches('.g-reward-form')) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const [scope, targetId] = f.target.split(':');
  store.add('reward', { title: f.title.trim(), scope, targetId: targetId || null, level: Math.max(2, +f.level || 2) });
}

