# Baseline

| | |
| --- | --- |
| Repo | https://github.com/TheBabelDragon/BabelForge |
| Commit | `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95` |
| Subject | feat: full iterative FIPS 180-4 SHA-256 unit (64-round) |
| Date | Mon Oct 12 18:36:29 2026 -0600 |
| Command | `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. python3 -m unittest discover -s tests -v` |
| Result | **126 tests, OK** (0.046s on the first run) |

Log: `baseline-tests.txt`.

HEAD was verified with `git rev-parse HEAD` before and after the experiment. `git status --porcelain` is empty when bytecode is not written. No commit was made. Nothing was pushed.
