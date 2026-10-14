# GoblinMode

An isolated lab for [BabelForge](https://github.com/TheBabelDragon/BabelForge) at `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95`.

**Live (GitHub Pages):** https://thebabeldragon.github.io/GoblinMode/

BabelPipe is a small pipeline language over the Ultimate Angelic Cipher. It records, for every step, what the op **claims** about reversibility, whether the function is actually injective, and whether this run restored the prior state. The browser bench runs the same programs as the Python experiment: receipts match byte for byte.

This repository does not patch BabelForge. The upstream checkout is not vendored.

## Bench

The interactive bench is the app in this repo: cases for `X` ≡ `QS`, greedy digraphs, final mem, the cursed `MELT` op, forged angelic pairs, and a claims ledger.

## Experiment

Reports and the Python DSL live in [`.goblin-lab`](.goblin-lab/README.md).

```bash
git clone https://github.com/TheBabelDragon/BabelForge.git .goblin-lab/BabelForge
git -C .goblin-lab/BabelForge checkout 387d8dfbfe70ac7790e4ca73354aa1fbc6661d95

cd .goblin-lab/BabelForge
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. python3 -m unittest discover -s tests -v

cd ../experiments/babelpipe
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$PWD/../../BabelForge:$PWD" python3 -m unittest discover -s tests -v
```

The Python suite writes `src/lib/babelpipe/receipt-vectors.json`. The TypeScript port has to reproduce those receipts:

```bash
node --experimental-strip-types --test src/lib/babelpipe/engine.test.ts
```

## What this is not

SHA-256 is a hash, not a cipher, and a receipt is not a signature. A transliteration collision is not a hash collision. Notes on the hardware schedule are a source reading plus a formula transcription, not a simulated netlist and not a break of SHA-256.

## GitHub Pages

Deployed from [`.github/workflows/static.yml`](.github/workflows/static.yml).

- **Path / base:** `/GoblinMode/` (project Pages site)
- **Artifact:** `dist/` produced by `vite build --base=/GoblinMode/`
- **URL:** https://thebabeldragon.github.io/GoblinMode/
