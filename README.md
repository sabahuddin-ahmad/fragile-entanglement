# Fragile Entanglement

Interactive animation built with **Qiskit** to estimate a hidden phase with independent qubits $\left(1/\sqrt{N}\right)$ or an entangled GHZ state $\left(1/N\right)$, add dephasing (noise), and find the optimal number of entangled qubits.

We will observe how GHZ states beat independent qubits at phase estimation, until noise sets an optimal size.

Theme: **Quantum Unlocked**

## What the animation does

Many quantum sensors work by letting qubits pick up a small phase phase $\phi$ and then reading it. The question this project explores is how precisely phase $\phi$ can be estimated with a fixed number of measurements, and how entanglement and noise change the answer.

It compares two ways of estimating the same hidden phase:

- **Independent qubits.** $N$ qubits, each reading phase $\phi$ on its own. The error shrinks like $1/\sqrt{N}$ (the standard quantum limit).
- **An entangled GHZ state.** The same $N$ qubits, entangled so the phase builds up $N$ times faster. The error shrinks like $1/N$ (the Heisenberg limit).

Then we let it interact with the noisy environment. A noise slider couples every qubit to an environment qubit that is never measured. The entangled state loses coherence $N$ times faster, so beyond a certain size adding qubits makes it *worse*. The chart marks the best size of the entangled state for each noise level.

## The problem we explore

"Entanglement makes quantum measurements more precise" is often stated and rarely shown. It also leaves out the catch: entanglement is fragile, and noise sets a limit on how much it helps. This animation makes both sides of the story visible, using real circuits whose results you can inspect.

## How to run the animation

This repository is prepared to run the animation on [Qollab](https://qollab.xyz/).

1. Open the project and press **Run**.
2. In the **Select QPU** dialog, pick **Built-in simulator** (free, instant, unlimited live runs) or an **IonQ remote simulator** (free, IonQ's noise model, one job per run).
3. Explore:
   - **Explore**: drag the noise slider, change shots, press **Run on selected backend** for a live sweep, hover or tab through points, open the data table, look inside the circuits.
   - **Guided tour**: six short steps that drive the chart for you.
   - **Phase Detective**: five rounds, a hidden phase, 300 shots and rising noise. Pick your probe and see how close you get.
   - **How it works**: the method in brief.

Browser: needs WebAssembly JSPI (recent Chrome, Edge or Opera, or Firefox).

On IonQ backends only one job is allowed per run. To send another, press **Stop**, then **Run**. Stored results keep the slider responsive between runs.

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
\hat{\phi} = \frac{1}{k}\,\operatorname{atan2}\big(\langle Y \rangle, \langle X \rangle\big),
$$

where $\operatorname{atan2}$ is the two-argument arctangent, which returns the angle in the correct quadrant:

$$
\operatorname{atan2}(y, x) =
\begin{cases}
\arctan\!\left(\dfrac{y}{x}\right) & x > 0,\\[6pt]
\arctan\!\left(\dfrac{y}{x}\right) + \pi & x < 0,\ y \ge 0,\\[6pt]
\arctan\!\left(\dfrac{y}{x}\right) - \pi & x < 0,\ y < 0,\\[6pt]
+\dfrac{\pi}{2} & x = 0,\ y > 0,\\[6pt]
-\dfrac{\pi}{2} & x = 0,\ y < 0,\\[6pt]
\text{undefined} & x = 0,\ y = 0.
\end{cases}
$$

Because $C$ scales both quadratures equally, it cancels: $\operatorname{atan2}(C\sin\theta, C\cos\theta) = \theta$ for any $C > 0$. The estimate therefore needs no knowledge of how much coherence is left. Since $\operatorname{atan2}$ returns values in $(-\pi, \pi]$, the GHZ estimate is unambiguous only for $|N\phi| < \pi$.

**Uncertainty.** Binomial shot noise, $\operatorname{Var}\langle X \rangle = \big(1 - \langle X \rangle^2\big)/m$, is propagated through $\operatorname{atan2}$ with the delta method. Dashed curves show the closed-form prediction

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

which is smallest at

$$
N^\ast = -\frac{1}{\ln c}.
$$

**One job per run.** A full sweep ($2$ probes $\times$ $6$ sizes $\times$ $2$ bases $= 24$ circuits, up to $12$ qubits) goes to the backend as a single job, so it also runs on IonQ.

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
- Every chart has a table alternative, and the game's number line has a text description.
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

This effort is supported by Qollab & IonQ.
