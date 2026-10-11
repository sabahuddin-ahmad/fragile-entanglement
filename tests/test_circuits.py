"""End-to-end checks on real Qiskit circuits (skipped if Qiskit is not installed)."""
import json
import math

import pytest

qiskit = pytest.importorskip("qiskit")
from qiskit.quantum_info import Statevector, partial_trace  # noqa: E402
from qiskit.providers.basic_provider import BasicSimulator  # noqa: E402

from quantum import experiment, theory  # noqa: E402
from quantum.circuits import build_config, coherence_to_beta  # noqa: E402
from quantum.estimate import estimate_point  # noqa: E402


def exact_counts(qc, scale=10**6):
    """Exact outcome probabilities of the measured bits, as pseudo-counts."""
    unmeasured = qc.remove_final_measurements(inplace=False)
    probs = Statevector(unmeasured).probabilities_dict()
    measured = [qc.find_bit(inst.qubits[0]).index for inst in qc.data if inst.operation.name == "measure"]
    out = {}
    for bits, p in probs.items():
        key = "".join(bits[::-1][q] for q in reversed(measured))
        out[key] = out.get(key, 0) + p * scale
    return out


@pytest.mark.parametrize("scheme", ["product", "ghz"])
@pytest.mark.parametrize("n", [1, 2, 4])
@pytest.mark.parametrize("c", [1.0, 0.8])
def test_expectations_match_theory(scheme, n, c):
    phi = 0.27
    cx, cy = (exact_counts(q) for q in build_config(scheme, n, phi, coherence_to_beta(c)))
    pt = estimate_point(scheme, n, cx, cy)
    k = 1 if scheme == "product" else n
    C = theory.contrast(scheme, n, c)
    assert math.isclose(pt["exp_x"], C * math.cos(k * phi), abs_tol=1e-6)
    assert math.isclose(pt["exp_y"], C * math.sin(k * phi), abs_tol=1e-6)
    assert math.isclose(pt["phi_hat"], phi, abs_tol=1e-6)


def test_sweep_is_one_job_and_close_to_truth():
    backend = BasicSimulator()
    calls = {"n": 0}
    original = backend.run

    def counting_run(*a, **k):
        calls["n"] += 1
        return original(*a, **k)

    backend.run = counting_run
    r = json.loads(experiment.run_sweep(backend, json.dumps({"coherence": 1.0, "shots": 2000})))
    assert calls["n"] == 1
    assert len(r["points"]) == 12
    for p in r["points"]:
        assert abs(p["phi_hat"] - 0.2) < 5 * p["dphi_theory"]
