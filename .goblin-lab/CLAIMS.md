# Claim / check / truth (babelpipe 0.2.0)

A green light is not a proof. Every step records three layers:

| Field | Meaning |
|-------|---------|
| **claim** | What the op *advertises* (`yes` / `no` / `na`) |
| **check** | What this run *measured* (`applied`, `sidecar-match`, `pure-inverse`, …) |
| **truth** | Mathematical property when known (`injective` / `not-injective` / `na`) |

## Status vocabulary

| Status | When |
|--------|------|
| `ok` | Check aligns with truth (or truth is `na` and no false claim) |
| `lie` | **claim=yes** but **truth=not-injective**, or assert restored via sidecar / non-injective path |
| `warn` | Reserved for soft issues that are not explicit claim contradictions |
| `fail` | Hard error / halt |
| `info` | Bookkeeping (e.g. RECEIPT) |

`MELT` and `FORGE_PAIR` always surface as `lie` when they run successfully: they claim reversibility while not being injective.

`ASSERT_REVERSIBLE` after a sidecar restore is `lie` with `check=sidecar-match`, never a pass.

## Witness binding

When a step stashes a sidecar, `witnessSha = sha256("W\\n" + sidecar)` is recorded on the step and in the receipt column. The public chain still hashes canonical **output** only — a receipt proves **sameness**, not authorship. The witness field makes the hidden restore path *visible*, not authenticated.

## Constructor invariant

Default angelic sums must be unique (`assertUniqueAngelicSums`). Last-wins collisions in custom tables are a bug, not a feature.

## Receipt format (v0.2.0)

```
step|status|claim|injective|check|truth|sidecar|witnessSha|outSha|chain|line|note
```

Not a MAC. Not a signature.
