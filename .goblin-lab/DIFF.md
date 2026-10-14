# Diff summary

## Baseline

`git -C .goblin-lab/BabelForge rev-parse HEAD` → `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95`

`git status --porcelain` → empty, provided Python does not write `__pycache__` (`PYTHONDONTWRITEBYTECODE=1`).

No branch was created. No remote was updated. Golden tests were not edited. The reference oracle was not edited.

## Added, outside the baseline

- `.goblin-lab/experiments/babelpipe/` — BabelPipe interpreter and regressions (oracle differential, VM parity, RTL schedule transcription, receipt vectors).
- `.goblin-lab/*.md` and `baseline-tests.txt` — this report.
- `src/lib/babelpipe/` — TypeScript port. Receipts must match `receipt-vectors.json` emitted by the Python tests.
- `src/components/lab-app.tsx` and the app shell — optional bench. It does not import BabelForge and is not a proposed merge.

## Remaining risks

- The TypeScript port can drift if vectors are not regenerated after an engine edit. The node test is the gate.
- Provenance mapping falls back to `normalize:…:unmapped` when composition cannot be aligned. Canonical text still uses the platform normalizer. Receipts hash the text, not the indexes, so a provenance fallback does not change the receipt.
- JavaScript and Python case-mapping agreed on the vectors that were run (`ß`, ligatures, `İ`, Greek sigma). Untested code points could still diverge; the fuzz differential covers the Python engine against the oracle only.
- RTL defects are source-level. A simulator could show further padding or scheduling mistakes, or show that a surrounding tool rewrites the expression. Do not treat the formula test as a waveform.
- `MELT`’s sidecar lives in the process value and is easy to misuse if someone later hashes the wrong object and calls it the receipt. The canonical form excludes it on purpose. That exclusion is the finding, not a bug to “fix” by hashing hidden state and calling the op reversible.
