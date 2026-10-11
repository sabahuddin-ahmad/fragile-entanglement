"""Test teaching and gameplay against real Qiskit states and backend results."""
import json
import math

import pytest
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import Statevector, partial_trace
from quantum.circuits import build_pair, build_mixed_config
from quantum import experiment
from tests.test_circuits import exact_counts


@pytest.mark.parametrize('kind', ['independent', 'matching', 'entangled'])
@pytest.mark.parametrize('basis', ['z', 'x'])
def test_pair_measurements_distinguish_coherence(kind, basis):
    counts = exact_counts(build_pair(kind, basis), scale=1)
    expected = [.25] * 4 if kind == 'independent' or (kind == 'matching' and basis == 'x') else [.5, 0, 0, .5]
    for bits, probability in zip(['00', '01', '10', '11'], expected):
        assert counts.get(bits, 0) == pytest.approx(probability, abs=1e-12)


@pytest.mark.parametrize('phi', [-.4, 0, .4])
def test_specific_mixed_probe_has_no_phase_signal(phi):
    for qc in build_mixed_config(3, phi):
        counts = exact_counts(qc, scale=1)
        assert counts['0'] == pytest.approx(.5)
        assert counts['1'] == pytest.approx(.5)


def test_preparation_really_is_separable_mixture_not_a_bell_pair():
    qc = build_pair('matching', 'z').remove_final_measurements(inplace=False)
    reduced = partial_trace(Statevector(qc), [2])
    assert reduced.data.diagonal().real.tolist() == pytest.approx([.5, 0, 0, .5])
    assert abs(reduced.data[0, 3]) < 1e-12
    bell = Statevector(build_pair('entangled', 'z').remove_final_measurements(inplace=False))
    assert abs(bell.data[0] * bell.data[3].conjugate()) == pytest.approx(.5)


def test_session_submits_one_job_and_returns_all_views_with_real_counts():
    backend = BasicSimulator()
    calls = []
    original = backend.run
    def run(circuits, **kwargs):
        calls.append((circuits, kwargs))
        return original(circuits, seed_simulator=42, **kwargs)
    backend.run = run
    result = json.loads(experiment.run_session(backend, json.dumps({'shots': 400})))
    assert len(calls) == 1
    assert len(calls[0][0]) == 78
    assert len(result['learn']) == 6
    for entry in result['learn']:
        assert sum(entry['counts'].values()) == 400
        assert set(entry['counts']) <= {'00', '01', '10', '11'}
    assert len(result['sweep']['points']) == 12
    assert len(result['game']['rounds']) == 12
    for round_ in result['game']['rounds']:
        assert abs(round_['phi']) * 3 < math.pi
        assert set(round_['readings']) == {'product', 'ghz'}
        for scheme, reading in round_['readings'].items():
            assert sum(reading['counts_x'].values()) == 400
            assert sum(reading['counts_y'].values()) == 400
            assert math.isfinite(reading['phi_hat'])


@pytest.mark.parametrize('params', [{'shots': 0}, {'n_max': 7}, {'coherence': 2}, {'phi': float('nan')}])
def test_invalid_session_never_submits_a_job(params):
    class Backend:
        def run(self, *a, **k):
            pytest.fail('invalid input must not submit')
    with pytest.raises(ValueError):
        experiment.run_session(Backend(), json.dumps(params))
