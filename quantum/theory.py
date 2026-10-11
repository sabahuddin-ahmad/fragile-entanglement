"""Closed-form predictions. NumPy-free on purpose so it imports instantly in Pyodide.

Keep this in sync with ui/theory.js (the same formulas in JavaScript).

With coherence C, angle theta and m samples per quadrature, the delta-method
uncertainty of atan2(<Y>, <X>) is

    dtheta = sqrt(1 - C^2 sin^2(2 theta) / 2) / (C sqrt(m))

product: C = c,     theta = phi,   m = shots * n, dphi = dtheta
ghz:     C = c**n,  theta = n phi, m = shots,     dphi = dtheta / n

Ignoring the small sin^2 term: dphi_product ~ 1/(c sqrt(n shots)) and
dphi_ghz ~ 1/(n c^n sqrt(shots)), which is minimised at n* = -1 / ln(c).
"""

from __future__ import annotations

import math


def contrast(scheme: str, n: int, c: float) -> float:
    return c if scheme == "product" else c ** n


def expected_dphi(scheme: str, n: int, phi: float, c: float, shots: int) -> float:
    C = contrast(scheme, n, c)
    if C <= 0:
        return math.inf
    k = 1 if scheme == "product" else n
    m = shots * n if scheme == "product" else shots
    theta = k * phi
    core = math.sqrt(max(1.0 - (C * C) * math.sin(2 * theta) ** 2 / 2.0, 0.0))
    return core / (C * math.sqrt(m)) / k


def optimal_n_ghz(c: float, n_max: int) -> int:
    """Integer n in [1, n_max] that minimises the GHZ uncertainty (ignoring the angle term)."""
    best_n, best = 1, math.inf
    for n in range(1, n_max + 1):
        val = 1.0 / (n * c ** n) if c > 0 else math.inf
        if val < best:
            best_n, best = n, val
    return best_n


def optimal_n_continuous(c: float) -> float:
    """n* = -1/ln(c); infinite when there is no noise."""
    if c >= 1.0:
        return math.inf
    if c <= 0.0:
        return 0.0
    return -1.0 / math.log(c)
