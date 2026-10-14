# Goblin Lab — BabelPipe

Isolated experiment against [BabelForge](https://github.com/TheBabelDragon/BabelForge) at commit `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95`.

The baseline tree is read-only. BabelPipe does not patch the oracle, the VM, or the golden tests. The interactive bench is a separate TypeScript port checked against receipts this package emits.

## What it is

A line-oriented pipeline language:

```
TRANSLITERATE
ENCODE
ASSERT_REVERSIBLE
DECODE
HASH
RECEIPT
```

Each op carries three separate facts: what it **claims** about reversibility, whether the function is **injective**, and whether this particular run **restored** the prior state. `MELT` is intentionally dishonest. `FORGE_PAIR` shows that angelic pairs are redundant on the default tables.

## Reproduce

```bash
# baseline (from a clean checkout of the pinned commit)
cd .goblin-lab/BabelForge
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. python3 -m unittest discover -s tests -v

# experiment
cd .goblin-lab/experiments/babelpipe
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/absolute/path/to/BabelForge:. \
  python3 -m unittest discover -s tests -v
```

`PYTHONDONTWRITEBYTECODE=1` keeps the baseline worktree from growing `__pycache__`.

The Python tests write `src/lib/babelpipe/receipt-vectors.json`. The TypeScript port must reproduce those receipts byte for byte:

```bash
node --experimental-strip-types --test src/lib/babelpipe/engine.test.ts
```

## Layout

| Path | Role |
| --- | --- |
| `.goblin-lab/BabelForge` | Immutable checkout of `387d8df` |
| `.goblin-lab/experiments/babelpipe` | DSL, regressions, oracle/VM differential |
| `src/lib/babelpipe` | Browser port of the same DSL |
| `src/components/lab-app.tsx` | Optional interactive bench. Not a BabelForge patch |

## Reports

- [BASELINE.md](BASELINE.md)
- [PROPOSALS.md](PROPOSALS.md)
- [GRAVEYARD.md](GRAVEYARD.md)
- [LEDGER.md](LEDGER.md)
- [DIFF.md](DIFF.md)

## Honest limits

SHA-256 is a hash. A receipt is not a signature. Transliteration collisions are not hash collisions. The RTL schedule defect below is a source transcription, not a simulated netlist and not a cryptographic break.
