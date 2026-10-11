// Closed-form predictions. Keep in sync with quantum/theory.py.
//
// dtheta = sqrt(1 - C^2 sin^2(2 theta) / 2) / (C sqrt(m))
// product: C = c,    theta = phi,   m = shots * n, dphi = dtheta
// ghz:     C = c^n,  theta = n phi, m = shots,     dphi = dtheta / n

export function contrast(scheme, n, c) {
  return scheme === 'product' ? c : Math.pow(c, n);
}

export function expectedDphi(scheme, n, phi, c, shots) {
  const C = contrast(scheme, n, c);
  if (C <= 0) return Infinity;
  const k = scheme === 'product' ? 1 : n;
  const m = scheme === 'product' ? shots * n : shots;
  const s = Math.sin(2 * k * phi);
  const core = Math.sqrt(Math.max(1 - (C * C * s * s) / 2, 0));
  return core / (C * Math.sqrt(m)) / k;
}

export function optimalNGhz(c, nMax) {
  let bestN = 1;
  let best = Infinity;
  for (let n = 1; n <= nMax; n++) {
    const v = c > 0 ? 1 / (n * Math.pow(c, n)) : Infinity;
    if (v < best) { best = v; bestN = n; }
  }
  return bestN;
}

// Best phase-sensing probe by theory (useful for comparisons).
export function bestChoice(phi, c, shots, nMax) {
  let best = null;
  for (const scheme of ['product', 'ghz']) {
    for (let n = 1; n <= nMax; n++) {
      const d = expectedDphi(scheme, n, phi, c, shots);
      if (!best || d < best.dphi) best = { scheme, n, dphi: d };
    }
  }
  return best;
}
