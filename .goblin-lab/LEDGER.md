# Cryptographic claims ledger

Baseline `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95`.
BabelPipe **0.2.0** — claim / check / truth; `lie` status; witnessSha on sidecar steps.

## Confirmed

- **Software SHA-256 model ≡ hashlib** on empty, NIST `abc`, UTF-8 `העללו`, and lengths 0, 1, 55, 56, 63, 64, 65, 100, 1000.
- **Exact 64-byte FIPS padding (software)** and **RTL pad-skip on block fill (source)** — see `EXACT64.md`.
- **Lie-as-proof instrumentation:** ops with `claim=yes` and `injective=no` (`MELT`, `FORGE_PAIR`) record status `lie`. `ASSERT_REVERSIBLE` via sidecar is `lie` / `check=sidecar-match`, not a pass. Receipt columns include `check`, `truth`, `witnessSha`. See `CLAIMS.md`.
- **Default angelic sums are unique** (`assertUniqueAngelicSums` at load).
- **Transliteration is not injective.** `X` ≡ `QS`, etc.
- **`DECODE` ignores pairs.** Forged pairs with a live sum still decode.
- **Receipts are deterministic** and bind input SHA-256, op line, status, and canonical output. They do not authenticate a sender. Witness digest is recorded when present; not a MAC.
- **RTL message schedule, as source text, is not FIPS** (`W[wi-15]` vs `W[i-16]`).

## Disproven

- Shared Hebrew-form digests of `X` and `QS` are a SHA-256 collision.
- A green `ASSERT_REVERSIBLE` means the op is injective. (Now surfaced as `lie` when it does not.)
- Hashing a transformed string recovers symbols the transform discarded.

## Not established

- Cycle-accurate behavior of `sha256_unit.sv` (no simulator in lab).
- Any claim that would need a secret key (MAC / signature).
