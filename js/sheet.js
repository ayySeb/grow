// One dialog for all detail sheets (quest, habit, check, area, moment, review). A sheet is an object with
// render(dlg) and optional click / input / change / keydown / close handlers; opening another replaces it.

const dlg = document.getElementById('sheet');
let current = null;

export function openSheet(sheet) {
  const previous = current;
  current = null;
  previous?.close?.();
  current = sheet;
  sheet.render(dlg);
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

export const closeSheet = () => dlg.close();
export const rerender = () => current?.render(dlg);

for (const type of ['click', 'input', 'change', 'keydown']) {
  dlg.addEventListener(type, e => {
    if (type === 'click' && (e.target === dlg || e.target.closest('[data-act="close"]'))) return dlg.close();
    current?.[type]?.(e);
  });
}

dlg.addEventListener('close', () => {
  const sheet = current;
  current = null;
  sheet?.close?.();
});

// Enter in a single-line title ends editing instead of adding a line break.
export function blurOnEnter(e) {
  if (e.key === 'Enter' && e.target.matches('.g-title-input') && !e.isComposing) {
    e.preventDefault();
    e.target.blur();
    return true;
  }
  return false;
}
