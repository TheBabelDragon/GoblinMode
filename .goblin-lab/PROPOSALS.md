# Proposals

Four briefs, one baseline, no shared edits inside BabelForge. The director integrated only what the tests could reproduce.

## Compiler goblin — BabelPipe

Hypothesis: a tiny pipeline can say, per op, whether reversibility is claimed, whether the function is injective, and whether this run restored the prior canonical state.

Prototype: `experiments/babelpipe`. Ops: `NORMALIZE`, `TRANSLITERATE`, `ENCODE`, `DECODE`, `HASH`, `GEMATRIA`, `FOLD_SOFIT`, `STRIP_MARKS`, `MELT`, `FORGE_PAIR`, `ASSERT_REVERSIBLE`, `RECEIPT`.

Intentionally terrible idea, left alive and labeled: **`MELT`**. It folds final letters, claims to be reversible, and passes `ASSERT_REVERSIBLE` only because a sidecar holds the original. The receipt hashes the folded text, not the sidecar. `שלום` and `שלומ` collide.

Verdict from the auditor tests: the DSL behavior is accurate. The reversibility claim is rejected. The op stays as a counterexample.

## Hash heretic — receipts and SHA-256

Hypothesis: a deterministic receipt can bind input digest, op names, and output digest without being mistaken for authentication.

Prototype: the receipt body in `engine.py` (`babelpipe/0.1.0`). Re-running a program yields the same body.

What it proves: same implementation, same program, same input bytes, same canonical output.

What it does not prove: who produced it, that a lossy step kept the discarded bits, or that SHA-256 is invertible.

SHA-256 model: `tests/test_sha256_model.py` matches `hashlib` on the empty string, NIST `abc`, and lengths 0, 1, 55, 56, 63, 64, 65, 100, 1000. VM `checksum` matches that model on the attack set.

RTL: `sha256_unit.sv` line `W[wi] <= s1 + W[wi-7] + s0 + W[wi-15]` uses `W[i-15]` where FIPS 180-4 uses `W[i-16]`. A transcription of that formula disagrees with `hashlib` on `abc`. No Verilog simulator was present. This is not a break of SHA-256.

A per-symbol Merkle tree was rejected. It would not add a trust property the canonical hash does not already have. Provenance indexes are more useful, and they are not a hash tree.

## Gematria mystic — provenance

Hypothesis: carrying source indexes through each op makes collisions and final-letter blindness inspectable.

Findings, all executed:

- `X` and `QS` both yield `קס`, and both output letters point at the consumed source span.
- `TSH` → `צה`, `THS` → `תס`.
- `שלום` encodes as sums `290, 4, 50, ""`. Final mem is passthrough.
- Additive gematria: `אב` and `ג` are both 3. `שלום` is 336 because `ם` is not in the table.
- Niqqud stays attached as its own unknown code point (`בּ` → sum `7` plus an empty sum).

These are properties of the tables, not numerological extra structure. The VM matches the oracle, so they are not VM bugs.

## Adversarial auditor

Attacks live in `tests/test_engine.py` and are not edits to golden expectations.

| Claim | Verdict |
| --- | --- |
| BabelPipe transliterate/encode/decode/hash matches the oracle, including 200 seeded fuzz strings | ACCEPT |
| VM matches the oracle on the attack set | ACCEPT |
| `X`/`QS` sharing a Hebrew digest is a SHA-256 collision | REJECT |
| `ASSERT_REVERSIBLE` passing means the op is injective | REJECT (`MELT`) |
| `DECODE` checks the angelic pair | REJECT (`FORGE_PAIR`) |
| Final mem in `שלום` is angelically encoded | REJECT |
| `NORMALIZE` is harmless before transliteration | REJECT (`é`, `İ`) |
| Custom tables preserve the round trip | REJECT (last-wins sum) |
| Software SHA-256 model matches hashlib on block boundaries | ACCEPT |
| RTL schedule term implements FIPS | REJECT at formula level; simulation absent |
| Exact-64-byte RTL padding is wrong | INSUFFICIENT EVIDENCE (source reading only) |
| Baseline commit and worktree unchanged | ACCEPT |
