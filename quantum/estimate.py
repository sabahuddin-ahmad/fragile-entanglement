"""From counts to a phase estimate and an uncertainty.

For one (scheme, n) point we have two count dictionaries: one measured in the
X quadrature, one in Y. Each gives an expectation value in [-1, 1]:

    <X> = C cos(theta)      <Y> = C sin(theta)

where theta = phi (product) or n*phi (GHZ), and C is the coherence.

    theta_hat = atan2(<Y>, <X>)            (independent of C)
    phi_hat   = theta_hat / k              k = 1 product, n GHZ

Uncertainty uses the delta method on atan2 with binomial variances
var(<X>) = (1 - <X>^2) / m, where m is the number of independent samples
(shots for GHZ, shots * n for product, since every qubit is a sample).
"""

from __future__ import annotations

import math


def _clean(key: str) -> str:
    return key.replace(" ", "")


def bit_expectations(counts: dict[str, int], n_bits: int) -> list[float]:
    """<Z> for each classical bit (bit i is the i-th character from the right)."""
    total = sum(counts.values())
    if total == 0:
        raise ValueError("empty counts")
    ones = [0] * n_bits
    for key, cnt in counts.items():
        bits = _clean(key).zfill(n_bits)
        for i in range(n_bits):
            if bits[-1 - i] == "1":
                ones[i] += cnt
    return [1.0 - 2.0 * o / total for o in ones]


def quadrature_mean(counts: dict[str, int], n_bits: int) -> tuple[float, int]:
    """Average <Z> over bits and the number of independent samples behind it."""
    exps = bit_expectations(counts, n_bits)
    shots = sum(counts.values())
    return sum(exps) / n_bits, shots * n_bits


def estimate_point(scheme: str, n: int, counts_x: dict[str, int], counts_y: dict[str, int]) -> dict:
    """Phase estimate and uncertainty for one (scheme, n) configuration."""
    n_bits = n if scheme == "product" else 1
    k = 1 if scheme == "product" else n

    ex, mx = quadrature_mean(counts_x, n_bits)
    ey, my = quadrature_mean(counts_y, n_bits)

    theta = math.atan2(ey, ex)
    r2 = ex * ex + ey * ey
    contrast = math.sqrt(r2)

    var_x = max(1.0 - ex * ex, 1.0 / mx) / mx
    var_y = max(1.0 - ey * ey, 1.0 / my) / my

    # Signal lost: coherence is buried in shot noise, the phase is meaningless.
    noise_floor = 2.0 / math.sqrt(min(mx, my))
    signal_lost = contrast < noise_floor

    if r2 > 0:
        dtheta = math.sqrt(ey * ey * var_x + ex * ex * var_y) / r2
    else:
        dtheta = math.pi
    dtheta = min(dtheta, math.pi)

    return {
        "scheme": scheme,
        "n": n,
        "exp_x": ex,
        "exp_y": ey,
        "contrast": contrast,
        "phi_hat": theta / k,
        "dphi": dtheta / k,
        "samples": mx + my,
        "signal_lost": signal_lost,
    }
