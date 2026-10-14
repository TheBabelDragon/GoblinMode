# Goblin's graveyard

Rejected ideas and the counterexamples that killed them. The cursed op is still in the language so the failure stays runnable.

## MELT is reversible because the assert passed

`MELT` folds `ךםןףץ` into `כמנפצ`, stashes the original, and sets `claim=yes` while `injective=no`.

```
MELT
ASSERT_REVERSIBLE
```

On `שלום` the assert status is `warn`: `assert matched sidecar only; MELT is not a function of its output`.

`MELT("שלום")` and `MELT("שלומ")` have the same canonical output and the same step digest. Their input digests differ. The sidecar is absent from the canonical form.

Killed as a reversibility claim. Kept as a labeled lie.

## X and QS are a SHA-256 collision

```
TRANSLITERATE
HASH
```

Both become `קס` and then `6c47…` is **not** their digest — that golden digest is `hello` → `העללו`. Both `X` and `QS` share whatever SHA-256(`קס` UTF-8) is, because the Hebrew strings are equal.

`sha256("X") != sha256("QS")`. Killed. A transliteration collision is not a hash collision.

## DECODE authenticates the pair

```
ENCODE
FORGE_PAIR
DECODE
```

Input `א`. The forged pair is `ת ת` and the names are `Nope`. Decode result is still `א`. The sum `3` was sufficient. Default sums are unique (oracle test and spec §2.2). The pair is redundant, not authenticated.

## Final mem is an angelic letter

`ENCODE` on `שלום` yields sums `290`, `4`, `50`, `""`. The last triple is the unknown-character shape. Round-trip succeeds by passthrough, which the golden test does not distinguish from a real mapping.

`FOLD_SOFIT` has no pure inverse. `ASSERT_REVERSIBLE` after it fails.

## Normalization is free

`TRANSLITERATE("é")` is `É` (passthrough after uppercasing).

`TRANSLITERATE(NFD("é"))` is `ע` plus U+0301.

`TRANSLITERATE("İ")` is `İ`. `NORMALIZE NFD` then `TRANSLITERATE` is `י` plus U+0307, same as ASCII `I` plus a combining dot.

## A Merkle tree of symbols would make the receipt tamper-proof

Rejected before implementation. Recomputing a hash chain does not require a secret. A tree of the same canonical bytes would detect edits no better than hashing the canonical bytes, and it would still not name an author.

## Custom angelic tables are safe if the code constructs `sum_to_letter`

```python
BiblicalAngelicCipher(
    gematria={"א": 1, "ב": 1},
    angelic_pairs={"א": ("א", "ב"), "ב": ("א", "ב")},
)
```

`decode(encode("א")) == "ב"`. The dict comprehension keeps the last letter. The default tables happen to be bijective. The constructor does not enforce it.

## “We broke SHA-256”

Killed as a framing. The software model matches hashlib. The RTL source’s schedule term does not match FIPS; that means the hardware description, as written, is not SHA-256. The hash function is intact.
