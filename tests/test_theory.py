"""Closed-form checks. No Qiskit needed."""
import math

from quantum import theory


def test_noiseless_scaling():
    # product ~ 1/sqrt(N), GHZ ~ 1/N (phi = 0 removes the angle term)
    p1, p4 = (theory.expected_dphi("product", n, 0.0, 1.0, 1000) for n in (1, 4))
    g1, g4 = (theory.expected_dphi("ghz", n, 0.0, 1.0, 1000) for n in (1, 4))
    assert math.isclose(p1 / p4, 2.0, rel_tol=1e-9)
    assert math.isclose(g1 / g4, 4.0, rel_tol=1e-9)


def test_optimal_n_moves_with_noise():
    assert theory.optimal_n_ghz(1.0, 6) == 6
    assert theory.optimal_n_ghz(0.8, 6) == 4      # -1/ln(0.8) = 4.48
    assert theory.optimal_n_ghz(0.6, 6) == 2      # -1/ln(0.6) = 1.96


def test_ghz_loses_to_product_when_noisy():
    c = 0.7
    assert theory.expected_dphi("ghz", 6, 0.0, c, 1000) > theory.expected_dphi("product", 6, 0.0, c, 1000)
