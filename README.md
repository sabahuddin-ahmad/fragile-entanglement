# Fragile Entanglement

**Team Name:** QuanTech

**Team Members:** Sabah Ud Din Ahmad, Ali Karimi, Ali Mahani

**Theme:** Quantum Unlocked

**Demo:** [Link](https://drive.google.com/file/d/1maLY99TXO7eYJ7dbDFVwKiCq0fXm_h9c/view?usp=sharing)

**GitHub Repository:** [sabahuddin-ahmad/fragile-entanglement](https://github.com/sabahuddin-ahmad/fragile-entanglement)

## What is it?

Fragile Entanglement is an interactive tutorial and game **built with Qiskit** that teaches entanglement through quantum measurement results. Learners compare independent and entangled qubits, use their measurements to guide Hulk in **Hulk Smash**, and explore when entanglement improves phase estimation and when noise removes that advantage.

The experience has four views:

- **Intro:** explains qubits, entanglement, and what the quantum experiment runs. Learn unlocks after results load successfully.
- **Learn:** introduces one change at a time, comparing pair preparations and measurement settings before explaining phase and uncertainty.
- **Hulk Smash:** choose Independent or Entangled sensors, then press SMASH. Hulk uses the chosen sensor’s measured phase estimate to correct his landing.
- **Explore:** change noise and shots, compare uncertainty for one through six sensing qubits, inspect the data table, and view the circuits.

## What problem we explore and why it matters?

We built this tutorial to address a learning gap: explaining entanglement in words is not enough to show a beginner how quantum measurements work or why entanglement is useful. Learners need a clear path from a simple explanation to running circuits, interpreting their results, and seeing how noise changes what those results can tell us. Fragile Entanglement brings those steps together in one guided experience, with a game and interactive plots that connect the concepts to measurement precision.

### Some background
Quantum sensors can detect small changes by encoding them as a **phase**, an angle within a repeating cycle. Reading that angle accurately matters for applications such as precision timing and magnetic-field sensing. This project studies the underlying measurement principle rather than modelling a particular instrument.

Our question is: **with the same number of sensing qubits and shots, when does entanglement give a more precise phase reading?** The baseline is independently prepared qubits. The comparison uses an entangled GHZ state, which combines the response of several qubits into a stronger phase signal. Noise can weaken that shared signal faster than it weakens independent sensors.

## Who is this for?

Students, teachers, and curious non-experts who want to understand entanglement by observing measurements rather than starting with equations. Intro explains what a qubit is; no prior Qiskit experience is needed to use the interface.

Educators can use Learn to discuss why matching outcomes alone do not establish entanglement. Developers and researchers can use the small, inspectable circuits as a starting point for other noise models or sensing strategies.

## How the quantum part works?

The application combines **quantum circuit measurements** with **classical analysis and interaction**:

1. **Prepare and measure pairs.** Learn compares independently random qubits, an entangled Bell pair, and an ordinary random mixture of 00 and 11. Each preparation is measured in two settings, Z and X. The ordinary matching mixture and Bell pair agree in Z; only the ideal Bell pair retains perfect agreement in X. Hardware noise may introduce mismatches.
2. **Build phase sensors.** Independent probes prepare each sensing qubit in its own superposition. GHZ probes prepare a coherent combination of all 0s and all 1s. A phase gate applies the same hidden phase to each sensing qubit; the GHZ state accumulates `N × phase`.
3. **Introduce noise.** Each sensing qubit can couple to an unmeasured environment qubit. Ignoring the environment causes dephasing: the useful phase signal weakens. If one qubit retains coherence `c`, the GHZ signal retains `cᴺ`.
4. **Estimate the angle from counts.** Two readout settings supply X and Y signal components. Classical Python code combines them using `atan2(Y, X)`, divided by N for GHZ, and estimates uncertainty from measurement statistics.
5. **Use the results.** Learn reveals recorded pairs; Hulk Smash uses a selected phase estimate; Explore compares measured uncertainty with dotted theory curves.

The initial experiment submits **one backend job containing 78 circuits**, each measured 400 times: six Learn circuits, 48 circuits covering twelve game rounds and two sensor choices, and 24 circuits for an initial Explore sweep. Both candidate sensors for each game round are measured in this batch; their readings stay hidden until the player commits. Each additional Explore sweep submits its 24 circuits in one job.

**Hulk Smash mapping:** the phase represents the target’s offset. Hulk compensates using the selected sensor’s estimate and hits if its error is at most 0.05 radians. A hit adds one point and reduces anger by one, with a floor of zero. A miss adds three anger; reaching ten ends the game. Survive twelve rounds to win. This landing rule is a classical game analogy powered by measurement results. Replaying uses the same recorded results.

## How do I run it?

You can run this on Qollab.

1. Press Qollab’s **Run** and select a simulator or hardware backend. A simulator calculates circuit outcomes on a classical computer; hardware measures physical qubits.
2. Read **Intro**, then press **Run quantum experiment** in the page. Wait for **Results ready**.
3. Press **Start learning**. The permanent Intro tab lets you return without losing your current lesson.
4. Play **Hulk Smash**, then use **Explore** to compare settings. The **Show data table** switch sits below the chart summary.

The app uses Qollab’s injected backend and calls Python through `.callPromising(...)`. It enforces one job per Qollab run for IonQ backends: run the Intro experiment first to populate all views. To request another job, **stop and restart** the project in Qollab. Loaded results remain usable between runs.

## How we meet the judging criteria

### Novelty and Creativity

Our contribution is educational: one measurement-driven experience connects entanglement, phase sensing, a game decision, and quantitative exploration. Learners first compare an entangled pair with ordinary matching across different measurement settings, then apply the sensing trade-off in Hulk Smash and inspect the same principles in Explore.

The underlying Bell/GHZ circuits and phase-estimation techniques are established. The original contribution is their integration into a progressive tutorial and a game whose outcomes depend on circuit measurements, with all views populated by a single backend batch.

### Technical Execution

Local automated verification passes **31 Python tests and 19 JavaScript tests**. Checks cover circuit probabilities against exact statevectors, phase expectations against theory, real `BasicSimulator` results, single-job batching, count totals, invalid-input rejection, lesson unlocking and navigation, hidden game readings, scoring, anger limits, and replay.

The comparison holds sensing-qubit counts and shots equal between probe choices. Explore displays measured and predicted uncertainty separately and provides a table alternative. The interface supports keyboard navigation, visible focus, light/dark themes, and reduced-motion preferences.

### Impact Potential

Teachers can use the project for classroom demonstrations or guided laboratory exercises. Students can move from qualitative correlations to quantitative sensing without changing tools, while inspecting the counts behind each explanation.

The modular circuits also support extensions: partially entangled groups, correlated noise, alternative estimators, or comparisons with physical-backend measurements. Such extensions could turn the tutorial into a small teaching and benchmarking platform.

### Documentation Quality

Clear, step-by-step instructions are provided in this README and in the application itself. The README explains how to run the project on Qollab, load measurement results, and move through Learn, Hulk Smash, and Explore.

Within the application, Intro defines the key terms and explains what runs when the experiment starts. Learn introduces one experimental change at a time, Hulk Smash explains the controls and scoring, and Explore labels the settings, plots, and data table. Readers can follow the instructions where they need them and return to Intro without losing their lesson progress.


## Disclosures and credits

- **Qiskit:** used for circuits, transpilation, simulation, and measurement results; licensed under Apache 2.0.
- **Qollab and IonQ:** provide the hosting/runtime and selectable backends. Their names acknowledge the platform and hackathon support.
- **AI assistance:** Claude assisted with initial requirements; OpenAI Codex assisted with subsequent code, interface, tests, and documentation revisions.

## Attribution

This project was created during the Qollab x IonQ Hackathon 2026, and is supported by Qollab &amp; IonQ.

## License

This work is distributed under the MIT License. See [LICENSE](LICENSE).
