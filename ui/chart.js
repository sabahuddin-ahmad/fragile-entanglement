// Log-log chart: phase uncertainty vs number of qubits, independent vs GHZ.
// Hand-rolled SVG (no CDN dependency, works in Qollab's sandboxed frame).
//
// Encoding (identity is never color-alone):
//   product  -> series-1 (blue),   circle markers,   label "Independent qubits"
//   ghz      -> series-2 (orange), triangle markers, label "Entangled (GHZ)"
//   theory   -> same hue, dashed line, no markers
//   optimum  -> vertical dotted rule + text label

const NS = 'http://www.w3.org/2000/svg';
const SERIES = {
  product: { label: 'Independent qubits', cls: 's-product', marker: 'circle' },
  ghz: { label: 'Entangled (GHZ)', cls: 's-ghz', marker: 'triangle' },
};

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
};

const logTicks = (lo, hi) => {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  return out;
};

/**
 * @param {HTMLElement} container  element with an <svg> slot and a .tooltip div
 * @param {object} opts
 *   points: [{scheme, n, dphi, dphi_theory, phi_hat, signal_lost}]
 *   nMax, optimalN (number|null), showTheory (bool)
 */
export function renderChart(container, { points, nMax = 6, optimalN = null, showTheory = true }) {
  const W = 640, H = 380, M = { t: 24, r: 150, b: 52, l: 72 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;

  const vals = points.flatMap((p) => [p.dphi, showTheory ? p.dphi_theory : null])
    .filter((v) => Number.isFinite(v) && v > 0);
  const yLo = Math.min(...vals) * 0.7, yHi = Math.max(...vals) * 1.4;
  const xLo = 0.85, xHi = nMax * 1.12;

  const x = (n) => M.l + (Math.log(n / xLo) / Math.log(xHi / xLo)) * iw;
  const y = (v) => M.t + (1 - Math.log(v / yLo) / Math.log(yHi / yLo)) * ih;

  container.querySelector('svg')?.remove();
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`, role: 'img', class: 'chart-svg',
    'aria-labelledby': 'chart-title chart-desc',
  });
  container.insertBefore(svg, container.querySelector('.tooltip'));

  // Grid + axes (recessive)
  const g = el('g', { class: 'grid' }, svg);
  for (const v of logTicks(yLo, yHi)) {
    el('line', { x1: M.l, x2: M.l + iw, y1: y(v), y2: y(v) }, g);
    el('text', { x: M.l - 8, y: y(v), class: 'tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, g)
      .textContent = v < 0.01 ? v.toExponential(0) : String(+v.toPrecision(2));
  }
  for (let n = 1; n <= nMax; n++) {
    el('text', { x: x(n), y: M.t + ih + 20, class: 'tick', 'text-anchor': 'middle' }, g).textContent = n;
  }
  el('line', { x1: M.l, x2: M.l + iw, y1: M.t + ih, y2: M.t + ih, class: 'axis' }, svg);
  el('text', { x: M.l + iw / 2, y: H - 10, class: 'axis-label', 'text-anchor': 'middle' }, svg)
    .textContent = 'Number of qubits N (log scale)';
  el('text', {
    x: 18, y: M.t + ih / 2, class: 'axis-label', 'text-anchor': 'middle',
    transform: `rotate(-90 18 ${M.t + ih / 2})`,
  }, svg).textContent = 'Phase uncertainty Δφ (rad, log) — lower is better';

  // Optimal-N rule
  if (optimalN) {
    const og = el('g', { class: 'optimum' }, svg);
    el('line', { x1: x(optimalN), x2: x(optimalN), y1: M.t, y2: M.t + ih }, og);
    el('text', { x: x(optimalN) + 6, y: M.t + 12, class: 'annot' }, og).textContent = `best GHZ size: N = ${optimalN}`;
  }

  const tooltip = container.querySelector('.tooltip');
  const show = (p, cx, cy) => {
    tooltip.innerHTML = `<strong>${SERIES[p.scheme].label}, N = ${p.n}</strong><br>`
      + `Δφ measured: ${p.dphi.toFixed(4)} rad<br>`
      + (Number.isFinite(p.dphi_theory) ? `Δφ theory: ${p.dphi_theory.toFixed(4)} rad<br>` : '')
      + `estimate φ̂: ${p.phi_hat.toFixed(4)} rad${p.signal_lost ? '<br><em>signal lost in noise</em>' : ''}`;
    const r = svg.getBoundingClientRect(), s = r.width / W;
    tooltip.style.left = `${cx * s + 12}px`;
    tooltip.style.top = `${cy * s - 12}px`;
    tooltip.hidden = false;
  };
  const hide = () => { tooltip.hidden = true; };

  for (const [scheme, meta] of Object.entries(SERIES)) {
    const pts = points.filter((p) => p.scheme === scheme).sort((a, b) => a.n - b.n);
    if (!pts.length) continue;
    const sg = el('g', { class: `series ${meta.cls}` }, svg);

    if (showTheory) {
      const th = pts.filter((p) => Number.isFinite(p.dphi_theory));
      el('polyline', { class: 'theory', points: th.map((p) => `${x(p.n)},${y(p.dphi_theory)}`).join(' ') }, sg);
    }
    el('polyline', { class: 'measured', points: pts.map((p) => `${x(p.n)},${y(p.dphi)}`).join(' ') }, sg);

    for (const p of pts) {
      const cx = x(p.n), cy = y(p.dphi);
      const label = `${meta.label}, N ${p.n}: uncertainty ${p.dphi.toFixed(4)} radians`;
      const hit = el('g', { class: 'pt', tabindex: '0', role: 'img', 'aria-label': label }, sg);
      el('circle', { cx, cy, r: 14, class: 'hit' }, hit);
      if (meta.marker === 'circle') el('circle', { cx, cy, r: 5.5, class: 'mark' }, hit);
      else el('path', { d: `M${cx},${cy - 7} L${cx + 6.5},${cy + 5} L${cx - 6.5},${cy + 5} Z`, class: 'mark' }, hit);
      hit.addEventListener('pointerenter', () => show(p, cx, cy));
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show(p, cx, cy));
      hit.addEventListener('blur', hide);
    }

    // Direct label at the line end
    const last = pts[pts.length - 1];
    el('text', { x: x(last.n) + 12, y: y(last.dphi), class: 'direct-label', 'dominant-baseline': 'middle' }, sg)
      .textContent = meta.label;
  }
}

export function renderTable(tbody, points) {
  tbody.replaceChildren(...points.map((p) => {
    const tr = document.createElement('tr');
    for (const v of [SERIES[p.scheme].label, p.n, p.dphi.toFixed(4),
      Number.isFinite(p.dphi_theory) ? p.dphi_theory.toFixed(4) : '—',
      p.phi_hat.toFixed(4), p.signal_lost ? 'yes' : 'no']) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    return tr;
  }));
}

export { SERIES };
