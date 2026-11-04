import { iso, addDays, startOfWeek, todayIso, monthShort, longDate } from './dates.js';
import { esc } from './ui.js';

// Spider chart. `series` is a list of { values, cls } with one value per axis, drawn on top of each other.
export function radar(axes, series, max, label = 'Netzdiagramm') {
  const n = axes.length;
  if (n < 3) return '';
  const cx = 200;
  const cy = 160;
  const r = 108;
  const point = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const d = (r * Math.max(0, Math.min(v, max))) / max;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };
  const poly = vals => vals.map((v, i) => point(i, v).map(c => c.toFixed(1)).join(',')).join(' ');
  const rings = [1 / 3, 2 / 3, 1].map(f => `<polygon class="g-radar-ring" points="${poly(axes.map(() => max * f))}"/>`).join('');
  const spokes = axes.map((_, i) => { const [x, y] = point(i, max); return `<line class="g-radar-ring" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const shapes = series.map(s => `<polygon class="g-radar-shape ${s.cls ?? ''}" points="${poly(s.values)}"/>`
    + s.values.map((v, i) => { const [x, y] = point(i, v); return `<circle class="g-radar-dot ${s.cls ?? ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; }).join('')).join('');
  const labels = axes.map((text, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const x = cx + (r + 14) * cos;
    const y = cy + (r + 14) * sin + (sin > 0.3 ? 9 : sin > -0.3 ? 4 : -2);
    const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
    return `<text class="g-radar-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${esc(text)}</text>`;
  }).join('');
  return `<svg class="g-radar" viewBox="0 0 400 320" role="img" aria-label="${esc(label)}">${rings}${spokes}${shapes}${labels}</svg>`;
}

// Contribution-style grid of the last `weeks` weeks. `level` maps a value to 0–4, `format` names it.
export function heatmap(values, { weeks = 26, level, format }) {
  const today = todayIso();
  const first = addDays(startOfWeek(new Date()), -7 * (weeks - 1));
  const labels = ['', 'Mo', '', 'Mi', '', 'Fr', '', ''];
  let html = labels.map(l => `<span class="hm-label">${l}</span>`).join('');
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(first, 7 * w);
    const month = monday.getMonth() !== lastMonth ? monthShort(monday) : '';
    lastMonth = monday.getMonth();
    html += `<span class="hm-month">${month}</span>`;
    for (let d = 0; d < 7; d++) {
      const day = iso(addDays(monday, d));
      const v = values[day] ?? 0;
      html += day > today
        ? '<span class="hm-cell future"></span>'
        : `<span class="hm-cell" data-l="${level(v)}" data-day="${day}" title="${longDate(day)}: ${v ? format(v) : 'nichts'}"></span>`;
    }
  }
  return `<div class="hm-scroll"><div class="hm" style="--weeks:${weeks}">${html}</div></div>`;
}

export const legend = () => `<span class="hm-legend">Weniger${[0, 1, 2, 3, 4].map(l => `<span class="hm-cell" data-l="${l}"></span>`).join('')}Mehr</span>`;

// A small line of values over time (evenly spaced), with the best value marked.
export function sparkline(values, width = 220, height = 44) {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = i => 3 + (i * (width - 6)) / (values.length - 1);
  const y = v => height - 4 - ((v - min) / span) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const bi = values.lastIndexOf(max);
  return `<svg class="g-spark" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${d}"/><circle cx="${x(bi).toFixed(1)}" cy="${y(max).toFixed(1)}" r="3"/></svg>`;
}
