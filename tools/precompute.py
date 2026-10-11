"""Regenerate data/precomputed.json by running the real circuits locally.

    pip install "qiskit>=2.0,<3"
    python tools/precompute.py

Runs one sweep per coherence level on Qiskit's BasicSimulator (the same
simulator Qollab's "Built-in simulator" hands you) and stores them so the
explainer shows real results the instant it loads, even on IonQ backends
where only one live job per run is allowed.

Keep the output under 2 MB (Qollab's per-file limit). It is ~60 KB.
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from quantum import experiment  # noqa: E402

COHERENCE_GRID = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]
SHOT_OPTIONS = [100, 400, 1600]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "precomputed.json")


def main(backend=None, source="qiskit BasicSimulator") -> None:
    if backend is None:
        from qiskit.providers.basic_provider import BasicSimulator

        backend = BasicSimulator()
    runs = []
    for shots in SHOT_OPTIONS:
        for c in COHERENCE_GRID:
            r = json.loads(experiment.run_sweep(backend, json.dumps({"coherence": c, "shots": shots})))
            r["source"] = "precomputed"
            runs.append(r)
    payload = {
        "kind": "precomputed",
        "generator": source,
        "coherence_grid": COHERENCE_GRID,
        "shot_options": SHOT_OPTIONS,
        "runs": runs,
    }
    with open(OUT, "w") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(f"wrote {len(runs)} sweeps to {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
