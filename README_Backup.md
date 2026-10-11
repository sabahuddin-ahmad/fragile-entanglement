# Fragile Entanglement

An interactive Qiskit experiment that teaches entanglement through measurement results, turns phase sensing into **Hulk Smash**, and compares independent and entangled probes in Explore.

Start by measuring pairs, rather than learning state names. Compare independent particles, an entangled pair, and an ordinary matching mixture. Changing the measurement direction shows why matching alone is not the whole quantum story.

Theme: **Quantum Unlocked**

## What the animation does

Many quantum sensors work by letting qubits pick up a small phase $\phi$ and then reading it. The question this project explores is how precisely phase $\phi$ can be estimated with a fixed number of measurements, and how entanglement and noise change the answer.

It compares two ways of estimating the same hidden phase:

- **Independent qubits.** $N$ qubits, each reading phase $\phi$ on its own. In the ideal limit, uncertainty scales as $1/\sqrt{N}$ (the standard quantum limit).
- **An entangled GHZ state.** The same $N$ qubits, entangled so the phase builds up $N$ times faster. In the ideal limit, uncertainty scales as $1/N$ (the Heisenberg limit).

Then we let it interact with the noisy environment. A noise slider couples every qubit to an environment qubit that is never measured. The entangled state loses coherence $N$ times faster, so beyond a certain size adding qubits makes it *worse*. The chart marks the best size of the entangled state for each noise level.

## The problem we explore

"Entanglement makes quantum measurements more precise" is often stated and rarely shown. It also leaves out the catch: entanglement is fragile, and noise sets a limit on how much it helps. This animation makes both sides of the story visible, using real circuits whose results you can inspect.

## How to run the animation

This repository is prepared to run the animation on [Qollab](https://qollab.xyz/).

1. Upload the application files to a Qollab project and press **Run**.
2. Select a backend in **Select QPU**. A simulator computes quantum circuit outcomes on a classical computer; a hardware backend measures physical qubits.
3. Read **Intro**, then press **Run quantum experiment**. **Start learning** unlocks after results load successfully. One backend job runs 78 circuits, with 400 shots each: six pair experiments, 48 phase circuits for twelve Hulk rounds and two candidate preparations, and 24 circuits for the initial Explore sweep.
4. Follow the views in order:
   - **Learn:** three lessons. In lesson 1, reveal recorded pairs, compare measurement counts, and change one experimental setting at a time. Counts contain no shot order, so the reveal order is shuffled. Revealing does not submit another job.
   - **Game — Hulk Smash:** choose three independent (unentangled) sensors or a three-qubit entangled GHZ team, then press SMASH. No hit/miss prediction is required. No reading or path is shown beforehand. Hulk compensates using the chosen circuit's phase estimate. A hit earns one point and lowers anger by one; a miss raises anger by three. Lose at anger 10; survive twelve rounds to win.
   - **Explore:** change shots and noise, inspect independent and GHZ uncertainty plots, and request another sweep if the backend allows it. Dotted lines show theory; measured and stored results are labelled separately.

The game is a classical analogy powered by quantum measurement counts, not a simulation of Hulk's mechanics. An estimate within 0.05 radians of the hidden phase lands on target. Noise weakens the sensing signal; the hidden phase supplies the sideways push. A noisy reading can still get lucky.

Learn includes an ordinary matching mixture of 00 and 11 to explain why matching results alone do not establish entanglement. It is a teaching comparison, not a game option.

On IonQ, the page permits one backend job per Qollab run. Use **Run quantum experiment** first to populate all views. Loaded results remain interactive, and replay uses the same counts. To submit new measurements, press Qollab **Stop**, then **Run**. The Explore button alone submits a sweep and consumes that allowance without populating Learn or Game.

For the localhost preview and Python virtual environment, follow [SETUP.md](SETUP.md). Localhost uses labelled JavaScript mock results; Python tests execute real Qiskit circuits on a classical simulator. Actual Qollab/hardware execution must be checked in Qollab.

**Upload files:** `index.html`, `main.js`, `main.css`, `requirements.txt`, `quantum/`, `ui/`, and `data/precomputed.json`. Keep the directory structure. Python uses the backend injected by Qollab and the JavaScript bridge calls `.callPromising(...)`.

## How the animation works

**Circuits.** For each $N$ from $1$ to $6$ and each probe, two circuits are measured: one in the $X$ basis and one in the $Y$ basis.

- **Independent:** $H \rightarrow P(\phi) \rightarrow$ readout, on every qubit.
- **GHZ:** $H$ on qubit $0$ plus a CNOT chain $\rightarrow P(\phi)$ on every qubit (the state picks up $N\phi$) $\rightarrow$ undo the chain $\rightarrow$ read qubit $0$.

**Estimate.** The two bases give

$$
\langle X \rangle = C\cos\theta, \qquad \langle Y \rangle = C\sin\theta, \qquad \theta = k\phi,
$$

where $C \in [0, 1]$ is the remaining coherence, and $k = 1$ for independent qubits or $k = N$ for GHZ. The phase estimate is

$$
\hat{\phi} = \frac{1}{k} \text{atan2}\big(\langle Y \rangle, \langle X \rangle\big),
$$

where $\text{atan2}$ is the two-argument arctangent, which returns the angle in the correct quadrant:

$$
\text{atan2}(y, x) =
\begin{cases}
\arctan\left(\dfrac{y}{x}\right) & x > 0,\\[6pt]
\arctan\left(\dfrac{y}{x}\right) + \pi & x < 0,\ y \ge 0,\\[6pt]
\arctan\left(\dfrac{y}{x}\right) - \pi & x < 0,\ y < 0,\\[6pt]
+\dfrac{\pi}{2} & x = 0,\ y > 0,\\[6pt]
-\dfrac{\pi}{2} & x = 0,\ y < 0,\\[6pt]
\text{undefined} & x = 0,\ y = 0.
\end{cases}
$$

Because $C$ scales both quadratures equally, it cancels: $\text{atan2}(C\sin\theta, C\cos\theta) = \theta$ for any $C > 0$. The estimate therefore needs no knowledge of how much coherence is left. Since $\text{atan2}$ returns values in $(-\pi, \pi]$, the GHZ estimate is unambiguous only for $|N\phi| < \pi$.

**Uncertainty.** Binomial shot noise, $\text{Var}\langle X \rangle = \big(1 - \langle X \rangle^2\big)/m$, is propagated through $\text{atan2}$ with the delta method. Dotted curves show the closed-form prediction

$$
\Delta\phi = \frac{1}{k}\,\frac{\sqrt{1 - \tfrac{1}{2} C^2 \sin^2(2\theta)}}{C\sqrt{m}},
$$

where $m$ is the number of independent samples per basis: $m = N \times \text{shots}$ for independent qubits, and $m = \text{shots}$ for GHZ.

**Noise.** Each data qubit $q$ has its own environment qubit $e$, coupled by $H(e)$, then $CP(\beta)(e, q)$, then $P(-\beta/2)(q)$. Tracing out $e$ leaves $q$ with coherence

$$
c = \cos\!\left(\frac{\beta}{2}\right),
$$

so independent qubits keep $C = c$, while a GHZ state keeps only $C = c^N$. The GHZ error then scales as

$$
\Delta\phi_{\text{GHZ}} \propto \frac{1}{N c^N},
$$

whose contrast-only envelope is smallest at

$$
N^\ast = -\frac{1}{\ln c}.
$$

**One job per submission.** The Learn/Game session combines 78 circuits into one job. An additional Explore sweep ($2$ probes $\times$ $6$ sizes $\times$ $2$ bases $= 24$ circuits, up to $12$ qubits) goes to the backend as a single job, so it also runs on IonQ.

## Replicate or extend this work

The repository is organised so the physics and the interface can be changed separately:

| File | What it holds |
|---|---|
| `index.html`, `main.js`, `main.css`, `quantum/`, `ui/` | Application code and interface: chart, tour, game, accessibility helpers |
| `quantum/circuits.py` | Circuit builders (probes, noise, readout) |
| `quantum/estimate.py` | Counts → phase estimate and uncertainty |
| `quantum/theory.py`, `ui/theory.js` | Closed-form predictions |
| `quantum/experiment.py` | Entry points the page calls (JSON in, JSON out) |
| `dev/` | Makes the local browser preview work |
| `tests/` | Verifies the quantum calculations and circuits |
| `tools/` | Regenerates stored results using Qiskit |
| `data/precomputed.json` | Stored results for an instant first view |
| `requirements.txt`, `README.md`, `LICENSE`, `SETUP.md`, `.gitignore` | Dependencies, documentation, licensing, and Git hygiene |


Ideas to extend in future:

- Partially entangled probes (GHZ blocks of size $k$).
- Correlated noise (one environment shared by all qubits) to show the noise floor.
- Real-hardware runs on IonQ Forte compared against the noise model.
- Adaptive phase estimation over several rounds.

## Accessibility

- Every feature works by keyboard. Tabs follow the WAI-ARIA tabs pattern, and focus is always visible.
- Chart series are told apart by marker shape, line style and direct labels as well as colour. Colours come from a colour-vision-deficiency-validated palette with separate light and dark values.
- Every chart has a table alternative, and the game has text descriptions of the outcome and measurement results.
- Status updates are announced to screen readers.
- Respects reduced-motion and dark-mode settings, with 44 px touch targets. The layout works at phone width.

## Judging summary

- **Novelty:**
- **Technical execution:**
- **Impact:**
- **Documentation:**

## Disclosures

- **Qiskit** (Apache 2.0): circuits, simulation, transpilation.
- **Qollab runtime** and Qollab's provided backends, including IonQ simulators.
- **AI assistance:** Used Claude for refining requirements and initial code and interface setup.
- All code was written during the build window (Oct 9, 2026 5 PM MDT - Oct 11, 2026 5 PM MDT) as evident by the commit history of this GitHub repository.

## Links

- Demo video:
- Code repository: https://github.com/sabahuddin-ahmad/fragile-entanglement

## License

This work is distributed under the MIT License. See `LICENSE`.

## Attribution

This visualization was created during the Qollab x IonQ Hackathon 2026, and is supported by Qollab &amp; IonQ.
