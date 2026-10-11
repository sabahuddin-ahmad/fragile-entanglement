# Local Setup

This project uses Python and Qiskit for quantum circuits, and plain HTML, CSS,
and JavaScript for the interface. No Node.js, npm, or build step is required.
The local browser preview uses a JavaScript mock; the Python tests and data
generator run real Qiskit circuits locally.

## 1. Check python version

```bash
python3 --version
```

## 2. Clone the repository

If you have not cloned the repository:

```bash
git clone https://github.com/sabahuddin-ahmad/fragile-entanglement.git
cd fragile-entanglement
```

If you already have it, open a terminal in `fragile-entanglement` instead.
Run the remaining commands from this folder, where `requirements.txt` lives.

## 3. Create a virtual environment

```bash
python3 -m venv .venv
```

## 4. Activate the environment

macOS / Linux (zsh or bash):

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```bat
.venv\Scripts\activate.bat
```

Activate it again whenever you open a new terminal. Confirm that Python points
inside `.venv`:

```bash
python -c "import sys; print(sys.executable)"
```

## 5. Install requirements and the test runner

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pytest
```

`requirements.txt` currently specifies `qiskit>=2.5.2,<3.0.0`.

## 6. Verify the installation

```bash
python -m pip check
python -c "import qiskit; print('Qiskit:', qiskit.__version__)"
python -m pytest -q
```

The tests cover the theoretical predictions, circuit expectations, and a
Qiskit simulator sweep. All tests should pass. If circuit tests are skipped,
check that Qiskit was installed into the active environment.

## 7. Start the local browser preview

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/dev/preview.html> in a browser. Use this preview
page as the entry point: it loads the interface and supplies the mock bridge
that replaces Qollab's Python integration locally. Its live runs use simulated
JavaScript results, rather than executing the Python circuits.

To preview the application's IonQ one-job restriction, open
<http://localhost:8000/dev/preview.html?ionq&backend=ionq_simulator>.

Press `Ctrl+C` in the terminal to stop the server. If port 8000 is busy, use
8001 in both the command and the URL.

## 8. Optional: regenerate stored results with Qiskit

With the environment active, run:

```bash
python tools/precompute.py
```

This overwrites `data/precomputed.json` with 27 sweeps from Qiskit's local
`BasicSimulator`. The currently supplied JSON identifies itself as placeholder
data from a NumPy reference simulation. Keep it for the initial preview, and
regenerate it before publishing results as Qiskit-generated data. Commit the
updated JSON when you want to ship those results.

## 9. Finish and return later

Leave the environment with:

```bash
deactivate
```

Next time, open the project folder, activate `.venv`, and run the tests or
preview server. Re-run `python -m pip install -r requirements.txt` when the
dependency file changes.