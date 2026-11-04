import * as store from '../store.js';
import { MOODS, PAUSE_DAYS } from '../rules.js';
import { iso, parse, addDays, todayIso, weekdayLong, dayMonth } from '../dates.js';
import { esc, ICON, num, liveClock } from '../ui.js';
import { timed } from '../timer.js';
import { targetLabel, dueOn, weekCount, getCheck, resting, rhythmLabel, byOrder, dueReviews } from '../model.js';
import { compute, checkXp } from '../xp.js';
import { REVIEWS } from '../rules.js';
import { periodLabel } from '../dates.js';
import { quickCheck, uncheck, openCheck, startAndTell } from '../sheets/check.js';
import { newHabit } from '../sheets/habit.js';
import { newMoment, openMoment } from '../sheets/moment.js';

// Habits for one day (today by default, earlier days can be filled in), the day's sentence and mood, and firsts.

let date = todayIso();
export const resetDate = () => (date = todayIso());

export function reviewBanners() {
  return dueReviews().map(([type, key]) => `<button type="button" class="g-banner" data-review="${type}:${key}">`
    + `<span>${ICON.journal}</span><span><b>Zeit für deinen ${REVIEWS[type].label}</b><span class="g-meta">${periodLabel(type, key)}</span></span>${ICON.next}</button>`).join('');
}

// Minute habits get a play button; a timer that is already going shows its time and opens the check.
function timerButton(h) {
  if (!timed(h)) return '';
  if (h.timer?.day === date) {
    return `<button type="button" class="g-timer${h.timer.start ? ' on' : ''}" data-act="open" aria-label="Timer öffnen">${liveClock(h.timer)}</button>`;
  }
  if (date !== todayIso() || h.timer) return '';
  return `<button type="button" class="icon-btn sm g-timer-start" data-act="timer" aria-label="Timer starten" title="Timer starten">${ICON.play}</button>`;
}

function row(h) {
  const c = getCheck(h.id, date);
  const meta = [targetLabel(h.skillId)];
  if (h.rhythm.type === 'weekly') meta.push(`${weekCount(h.id, date)} von ${h.rhythm.times} diese Woche`);
  else if (h.rhythm.type === 'days') meta.push(rhythmLabel(h.rhythm));
  if (c?.amount) meta.push(`${num(c.amount)} ${h.unit}`);
  if (c?.mini) meta.push('Mini');
  if (c?.note?.trim()) meta.push(ICON.note);
  if (compute().bests.has(c?.id)) meta.push('<b class="g-best">Bestleistung</b>');
  const mini = !c && date === todayIso() && h.mini && resting(h, PAUSE_DAYS)
    ? `<button type="button" class="chip g-mini" data-act="mini" title="Mini-Version abhaken">Mini: ${esc(h.mini)}</button>` : '';
  return `<li class="g-habit${c ? ' done' : ''}" data-habit="${h.id}">
      <button type="button" class="check${c ? ' on' : ''}" data-act="check" aria-label="${c ? 'Nicht erledigt' : 'Erledigt'}"></button>
      <button type="button" class="g-habit-main" data-act="open">
        <span class="g-habit-title">${h.avoid ? '<span class="g-avoid">Lassen</span>' : ''}${esc(h.title) || 'Ohne Titel'}</span>
        <span class="g-meta">${meta.filter(Boolean).map(m => (m.startsWith('<') ? m : esc(m))).join('<i class="g-dot">·</i>')}</span>
      </button>
      ${mini}
      ${timerButton(h)}
      ${c ? `<span class="g-xp">+${checkXp(c)}</span>` : ''}
    </li>`;
}

export function render() {
  const today = todayIso();
  if (date > today) date = today;
  const habits = store.all('habit').filter(h => !h.archived).sort(byOrder);
  const due = habits.filter(h => dueOn(h, date));
  const other = habits.filter(h => !dueOn(h, date));
  const xp = compute().byDay[date] ?? 0;
  const entry = store.get(`day:${date}`);
  const moments = store.all('moment').filter(m => m.date === date && m.title.trim());
  const label = date === today ? 'Heute' : date === iso(addDays(new Date(), -1)) ? 'Gestern' : weekdayLong(parse(date));
  return `
    <div class="g-daynav">
      <button type="button" class="icon-btn" data-act="prev" aria-label="Tag davor">${ICON.prev}</button>
      <div class="g-daynav-label"><b>${label}</b><span>${dayMonth(date)}</span></div>
      <button type="button" class="icon-btn" data-act="next" aria-label="Tag danach"${date >= today ? ' disabled' : ''}>${ICON.next}</button>
      ${date !== today ? '<button type="button" class="pill" data-act="today">Heute</button>' : ''}
      <span class="g-dayxp">${xp ? `+${num(xp)} XP` : ''}</span>
    </div>
    ${date === today ? reviewBanners() : ''}
    <section class="g-sec">
      <h2 class="g-h">Gewohnheiten</h2>
      ${due.length ? `<ul class="g-habits">${due.map(row).join('')}</ul>` : '<p class="hint">Für diesen Tag ist nichts geplant.</p>'}
      ${other.length ? `<h3 class="g-subhead">Heute nicht dran, geht aber trotzdem</h3><ul class="g-habits g-quiet">${other.map(row).join('')}</ul>` : ''}
      <button type="button" class="g-add" data-act="new-habit">${ICON.plus}Gewohnheit</button>
    </section>
    <section class="g-sec">
      <h2 class="g-h">Tagessatz</h2>
      <div class="seg g-moods" role="group" aria-label="Stimmung">${MOODS.map((m, i) =>
        `<button type="button" data-mood="${i + 1}" aria-pressed="${entry?.mood === i + 1}">${m}</button>`).join('')}</div>
      <textarea class="g-sentence" name="sentence" rows="1" placeholder="Ein Satz zu ${date === today ? 'heute' : 'diesem Tag'} …" enterkeyhint="done">${esc(entry?.text ?? '')}</textarea>
    </section>
    <section class="g-sec">
      <h2 class="g-h">Erlebt</h2>
      ${moments.length ? `<ul class="g-moments">${moments.map(m => `<li><button type="button" data-moment="${m.id}">${ICON.spark}<span>${esc(m.title)}</span>`
        + `<span class="g-meta">${esc(targetLabel(m.skillId))}</span></button></li>`).join('')}</ul>` : ''}
      <button type="button" class="g-add" data-act="moment">${ICON.spark}Erstes Mal oder Erlebnis eintragen</button>
    </section>`;
}

const day = () => `day:${date}`;

export function click(e, rerender) {
  const b = e.target.closest('button');
  if (!b) return;
  const hId = b.closest('[data-habit]')?.dataset.habit;
  if (b.dataset.mood) {
    const mood = +b.dataset.mood;
    return store.put(day(), 'entry', { type: 'day', key: date, mood: store.get(day())?.mood === mood ? null : mood });
  }
  if (b.dataset.moment) return openMoment(b.dataset.moment);
  switch (b.dataset.act) {
    case 'check': {
      if (getCheck(hId, date)) return uncheck(hId, date);
      quickCheck(hId, date);
      if (store.get(hId).mode === 'amount') openCheck(hId, date, { focusAmount: true });
      return;
    }
    case 'mini': return quickCheck(hId, date, { mini: true });
    case 'timer': return startAndTell(hId);
    case 'open': return openCheck(hId, date);
    case 'prev': date = iso(addDays(parse(date), -1)); return rerender();
    case 'next': date = iso(addDays(parse(date), 1)); return rerender();
    case 'today': date = todayIso(); return rerender();
    case 'new-habit': return newHabit();
    case 'moment': return newMoment(date);
  }
}

export function input(e) {
  if (e.target.name === 'sentence') store.put(day(), 'entry', { type: 'day', key: date, text: e.target.value.replace(/\n/g, ' ') });
}

export function keydown(e) {
  if (e.target.name === 'sentence' && e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    e.target.blur();
  }
}
