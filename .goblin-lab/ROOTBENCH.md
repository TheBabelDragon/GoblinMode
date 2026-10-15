# RootBench — Triliteral Root & Semantic Throughput Suite

**Evaluator:** `rootbench/0.1.0`  
**Corpus:** `corpus/0.1.0`  
**Location:** `src/lib/rootbench/` (TypeScript, node-testable) · `docs/rootbench.js` (pure browser)  
**Live:** https://thebabeldragon.github.io/GoblinMode/#rootbench

## What it is

A curated, deterministic benchmark that checks whether a candidate translation or analysis preserves the **semantic structure** of a Hebrew (or English) source — not merely surface roots.

Motivating experiment: Hebrew triliteral morphology, biblical vs modern register, and adversarial round-trip drift. The suite is designed to fail cases that look linguistically plausible but silently change meaning, agency, negation, or deontic force.

## What it is not

- Not a general-purpose translation quality model.
- Not a claim that shared triliteral roots imply interchangeable meanings.
- Not a digital signature or proof of authorship. Digests (when computed) are integrity checks only.
- Does not patch BabelForge. Does not alter BabelPipe receipt semantics.

## Case categories

| Category | Focus |
|----------|--------|
| `root-morph` | Root ID, weak/irregular roots, loanwords without roots, ambiguity → INDETERMINATE |
| `semantic` | Negation, agency, modality |
| `register` | Biblical vs modern reference cases |
| `adversarial` | Duck/money fixture, negative controls, role swaps |
| `roundtrip` | HE↔EN drift, identity preservation |

## Duck / money fixture

Source proposition (structured):

```
DUCK → CLAIMS → MONEY_IS_ONLY_AN_IDEA → THEREFORE → NO_OBLIGATION_TO_REPAY
```

Expected English gloss:

> The duck claims that money is just an idea, and therefore it doesn't have to pay it back.

Negative controls replace “money” with “size” (or similar). Those must **FAIL** even when the Hebrew remains grammatical.

## Verdicts

| Verdict | Meaning |
|---------|---------|
| `PASS` | No semantic violations; required evidence present |
| `FAIL` | Explicit violation (dropped negation, role swap, deontic flip, entity substitution, …) |
| `INDETERMINATE` | Analyzer cannot establish correctness (e.g. ambiguous form); no false pass |

Scores reported separately: root coverage, morphological coverage, proposition preservation, round-trip drift. A root match is supporting evidence only.

## Reproduce

```bash
# unit tests
node --experimental-strip-types --test src/lib/rootbench/rootbench.test.ts

# full suite (via package.json)
npm test
```

Browser: open the static site and scroll to **RootBench**. No network, no build step.

## Throughput

Timing is measured in a **separate** pass after deterministic verdicts are computed, so wall-clock noise does not affect pass/fail. Report includes cases/s and total ms.

## Honest limits

- Lexicon is curated and small; unknown tokens stay `provenance: unknown` with no invented root.
- Proposition checks are keyword/role heuristics, not a full parser.
- Biblical coverage is illustrative (Genesis 1:1), not exhaustive.
- Round-trip checks cover documented drift patterns and entity preservation, not arbitrary paraphrase equivalence.
