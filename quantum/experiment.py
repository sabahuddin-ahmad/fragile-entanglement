"""Entry points called from main.js through Qollab's Python bridge.

Conventions (see CLAUDE.md):
* Every function takes and returns JSON *strings*. That sidesteps proxy
  conversion between Pyodide and JavaScript entirely.
* Functions that touch the backend submit exactly ONE backend.run call,
  because IonQ backends accept one job per Qollab run.
* main.js must call these with `.callPromising(...)`, never a plain call,
  or IonQ backends fail with "XHR is not supported".
"""

from __future__ import annotations

import json
import math

from qiskit import transpile

from quantum.circuits import build_config, coherence_to_beta
from quantum.estimate import estimate_point
from quantum import theory

PRECOMPUTED_PATH = "data/precomputed.json"  # literal string: Qollab only loads files named this way

DEFAULTS = {
    "phi": 0.2,          # hidden phase, radians; keep |phi| * n_max < pi
    "coherence": 1.0,    # per-qubit coherence c in [0, 1]; 1 = no noise
    "shots": 400,        # shots per circuit
    "n_max": 6,
    "schemes": ["product", "ghz"],
}


# ---------------------------------------------------------------- helpers

def _params(params_json: str | None) -> dict:
    p = dict(DEFAULTS)
    if params_json:
        p.update(json.loads(params_json))
    p["shots"] = int(p["shots"])
    p["n_max"] = int(p["n_max"])
    p["phi"] = float(p["phi"])
    p["coherence"] = float(p["coherence"])
    return p


def _backend_name(backend) -> str:
    name = getattr(backend, "name", "")
    if callable(name):  # BackendV1 style
        name = name()
    return str(name or type(backend).__name__)


def _is_ionq(backend) -> bool:
    return "ionq" in (_backend_name(backend) + type(backend).__module__).lower()


def _prepare(circuits, backend):
    """IonQ compiles circuits itself; local backends get a light transpile for their target."""
    if _is_ionq(backend):
        return circuits
    try:
        return transpile(circuits, backend=backend, optimization_level=1)
    except Exception:  # fall back to the raw circuits; standard gates run on the built-in simulator
        return circuits


def _run_once(backend, circuits, shots: int) -> list[dict]:
    """Submit every circuit in ONE job and return a counts dict per circuit."""
    job = backend.run(_prepare(circuits, backend), shots=shots)
    result = job.result()
    return [dict(result.get_counts(i)) for i in range(len(circuits))]


def _with_theory(point: dict, phi: float, c: float, shots: int) -> dict:
    point["dphi_theory"] = theory.expected_dphi(point["scheme"], point["n"], phi, c, shots)
    point["error"] = abs(point["phi_hat"] - phi)
    return point


# ---------------------------------------------------------------- public API

def backend_info(backend) -> str:
    return json.dumps({
        "name": _backend_name(backend),
        "is_ionq": _is_ionq(backend),
        "num_qubits": getattr(backend, "num_qubits", None),
    })


def run_sweep(backend, params_json: str | None = None) -> str:
    """Compare both probes for n = 1..n_max in a single job."""
    p = _params(params_json)
    beta = coherence_to_beta(p["coherence"])
    configs, circuits = [], []
    for scheme in p["schemes"]:
        for n in range(1, p["n_max"] + 1):
            configs.append((scheme, n))
            circuits.extend(build_config(scheme, n, p["phi"], beta))

    counts = _run_once(backend, circuits, p["shots"])

    points = []
    for i, (scheme, n) in enumerate(configs):
        pt = estimate_point(scheme, n, counts[2 * i], counts[2 * i + 1])
        points.append(_with_theory(pt, p["phi"], p["coherence"], p["shots"]))

    return json.dumps({
        "kind": "sweep",
        "source": "live",
        "backend": _backend_name(backend),
        "params": p,
        "optimal_n_theory": theory.optimal_n_ghz(p["coherence"], p["n_max"]),
        "points": points,
    })


def run_round(backend, params_json: str) -> str:
    """One Phase Detective guess: a single probe choice, one job."""
    p = json.loads(params_json)
    scheme, n = p["scheme"], int(p["n"])
    shots, phi, c = int(p["shots"]), float(p["phi"]), float(p["coherence"])
    counts = _run_once(backend, build_config(scheme, n, phi, coherence_to_beta(c)), shots)
    pt = estimate_point(scheme, n, counts[0], counts[1])
    return json.dumps(_with_theory(pt, phi, c, shots))


def draw_circuit(params_json: str) -> str:
    """Text drawing of the X-quadrature circuit for the circuit viewer."""
    p = json.loads(params_json)
    beta = coherence_to_beta(float(p.get("coherence", 1.0)))
    qc = build_config(p["scheme"], int(p["n"]), float(p.get("phi", DEFAULTS["phi"])), beta)[0]
    return json.dumps({
        "text": str(qc.draw(output="text", fold=-1)),
        "num_qubits": qc.num_qubits,
        "depth": qc.depth(),
        "ops": {k: int(v) for k, v in qc.count_ops().items()},
    })


def load_precomputed() -> str:
    """Instant first view: results shipped with the project (JS cannot read project files)."""
    try:
        with open(PRECOMPUTED_PATH) as fh:
            return fh.read()
    except OSError:
        return json.dumps({"kind": "precomputed", "runs": []})


def theory_curve(params_json: str | None = None) -> str:
    """Theory-only curves, for overlays or when no backend run has happened yet."""
    p = _params(params_json)
    out = []
    for scheme in p["schemes"]:
        for n in range(1, p["n_max"] + 1):
            d = theory.expected_dphi(scheme, n, p["phi"], p["coherence"], p["shots"])
            out.append({"scheme": scheme, "n": n, "dphi_theory": None if math.isinf(d) else d})
    return json.dumps(out)
