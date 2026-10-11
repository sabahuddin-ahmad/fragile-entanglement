"""Circuit builders for the phase-estimation comparison.

Two probes estimate the same hidden phase ``phi``:

* product  - N independent qubits, each in |+>, each picks up phi.
             Averaging N independent readings gives the standard quantum
             limit (SQL): dphi ~ 1 / sqrt(N).
* ghz      - one N-qubit GHZ state (|0..0> + |1..1>)/sqrt(2). The |1..1>
             branch picks up N*phi, so the phase is amplified N times:
             the Heisenberg limit (HL), dphi ~ 1 / N.

Noise ("the environment")
-------------------------
Each data qubit gets its own environment qubit prepared in |+> and coupled by
a controlled-phase CP(beta). Because we never measure the environment, the
data qubit's phase is randomly kicked by 0 or beta, which shrinks its
coherence to c = cos(beta / 2). A P(-beta/2) correction removes the average
kick so the estimate stays unbiased. A GHZ state's coherence is the product
of all N factors, c**N, so it loses its signal N times faster. That trade-off
is the whole lesson of the explainer: an optimal N appears.

Readout
-------
Every configuration is measured in two quadratures, X (cos) and Y (sin), so
the phase comes from atan2(<Y>, <X>) and never needs the coherence value.

Only standard gates are used (h, cx, p, cp, sdg, measure) so the same circuit
runs on the built-in simulator, the IBM noise models and IonQ backends.
"""

from __future__ import annotations

import math

from qiskit import QuantumCircuit

SCHEMES = ("product", "ghz")
QUADRATURES = ("x", "y")


def coherence_to_beta(c: float) -> float:
    """Coupling angle beta that gives per-qubit coherence c = cos(beta/2)."""
    c = min(max(float(c), 0.0), 1.0)
    return 2.0 * math.acos(c)


def _apply_environment(qc: QuantumCircuit, data: list[int], env: list[int], beta: float) -> None:
    """Dephase each data qubit by coupling it to its own unmeasured environment qubit."""
    for q, e in zip(data, env):
        qc.h(e)
        qc.cp(beta, e, q)
        qc.p(-beta / 2.0, q)


def _readout_basis(qc: QuantumCircuit, qubits: list[int], quadrature: str) -> None:
    """Rotate so a Z measurement reads <X> (quadrature 'x') or <Y> (quadrature 'y')."""
    if quadrature not in QUADRATURES:
        raise ValueError(f"quadrature must be one of {QUADRATURES}")
    for q in qubits:
        if quadrature == "y":
            qc.sdg(q)
        qc.h(q)


def build_probe(scheme: str, n: int, phi: float, beta: float = 0.0, quadrature: str = "x") -> QuantumCircuit:
    """Build one Ramsey-style circuit.

    Parameters
    ----------
    scheme      'product' or 'ghz'
    n           number of data (probe) qubits, >= 1
    phi         hidden phase per qubit, radians
    beta        environment coupling angle; 0 means no noise and no extra qubits
    quadrature  'x' or 'y'

    Measured bits
    -------------
    product: n bits, one per data qubit (each an independent sample)
    ghz:     1 bit, read from qubit 0 after un-entangling
    """
    if scheme not in SCHEMES:
        raise ValueError(f"scheme must be one of {SCHEMES}")
    if n < 1:
        raise ValueError("n must be >= 1")

    noisy = beta > 1e-12
    n_qubits = 2 * n if noisy else n
    n_clbits = n if scheme == "product" else 1
    qc = QuantumCircuit(n_qubits, n_clbits, name=f"{scheme}_n{n}_{quadrature}")

    data = list(range(n))
    env = list(range(n, 2 * n)) if noisy else []

    # 1. Prepare the probe
    qc.h(0)
    if scheme == "product":
        for q in data[1:]:
            qc.h(q)
    else:
        for q in data[1:]:
            qc.cx(q - 1, q)
    qc.barrier()

    # 2. Phase encoding: every data qubit picks up phi
    for q in data:
        qc.p(phi, q)

    # 3. The environment leaks information away
    if noisy:
        _apply_environment(qc, data, env, beta)
    qc.barrier()

    # 4. Read out
    if scheme == "product":
        _readout_basis(qc, data, quadrature)
        qc.measure(data, list(range(n)))
    else:
        for q in reversed(data[1:]):
            qc.cx(q - 1, q)
        _readout_basis(qc, [0], quadrature)
        qc.measure(0, 0)
    return qc


def build_config(scheme: str, n: int, phi: float, beta: float = 0.0) -> list[QuantumCircuit]:
    """The X and Y circuits for one (scheme, n) point, in that order."""
    return [build_probe(scheme, n, phi, beta, quad) for quad in QUADRATURES]
