// Small accessibility helpers.

let liveEl = null;

// Announce a message to screen readers through the polite live region in index.html.
export function announce(message) {
  liveEl ??= document.getElementById('live-region');
  if (!liveEl) return;
  liveEl.textContent = '';
  // Re-set on the next frame so repeated identical messages are still read.
  requestAnimationFrame(() => { liveEl.textContent = message; });
}

// WAI-ARIA tabs: click, Left/Right/Home/End to move, automatic activation.
export function initTabs(tablist, onChange) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = true) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
    onChange?.(tab.dataset.tab);
  };
  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tab);
  });
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length]);
  });
  return { select: (name) => select(tabs.find((t) => t.dataset.tab === name), false) };
}

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function fmt(x, digits = 3) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return x.toFixed(digits);
}
