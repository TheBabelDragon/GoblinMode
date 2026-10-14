# Cryptographic claims ledger

Baseline `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95`.

## Confirmed

- **Software SHA-256 model ≡ hashlib** on empty, NIST `abc` (`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`), UTF-8 `העללו` (`6c47c22e0d41e8d46e3f20068d7c016f5782e56ec49a1ccb119d40e21d2cc766`), and message lengths 0, 1, 55, 56, 63, 64, 65, 100, 1000. VM checksum matches the model for `""`, `hello`’s Hebrew form, and `שלום`.
- **Exact 64-byte FIPS padding (software):** message of 64 bytes pads to 128 bytes (two compression blocks). Digest of `a`×64 is `ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb`. See `.goblin-lab/EXACT64.md`.
- **RTL padding skip on exact block fill (source):** in `sha256_unit.sv` `S_LOAD`, when `m_idx==63` and `byte_last`, FSM goes to `S_W0` with `final_block=1` and never enters `S_PAD80`. Exact 64-byte (or any positive multiple of 64) streams with last on the block boundary omit `0x80` and the length field. Source reading; not simulated.
- **Default angelic sums are unique**, so `DECODE(ENCODE(s)) == s` for the strings covered by the oracle tests, the VM parity set, and 200 seeded fuzz inputs.
- **Transliteration is not injective.** `X` ≡ `QS`, `hello` ≡ `HELLO`, `ﬁle` ≡ `file`, `ß` ≡ `SS`, plus the many-to-one letter groups in the table (`C`/`G`, `F`/`P`, `I`/`J`/`Y`, `O`/`U`/`V`/`W`).
- **`DECODE` ignores pairs.** Forged pairs with a live sum still decode. Reconstructing pairs from the sum restores a canonical triple only when the prior triple was already canonical.
- **Receipts are deterministic** and bind input SHA-256, op line, status, and canonical output. They do not authenticate a sender.
- **RTL message schedule, as source text, is not FIPS.** `rtl/src/sha256_unit.sv` adds `W[wi-15]` where the standard adds `W[i-16]`. The transcribed recurrence disagrees with hashlib on `abc`. This indicts that expression, not SHA-256.

## Disproven

- Shared Hebrew-form digests of `X` and `QS` are a SHA-256 collision. The hashed strings are identical; the English byte strings are not.
- A green `ASSERT_REVERSIBLE` means the op is injective. `MELT` passes via a sidecar and collides `שלום` with `שלומ`.
- Checksum of the Hebrew form covers the encoded pair fields. It hashes the text only. Pair tampering is invisible to `checksum` and visible to a hash of the canonical triples.
- Hashing a transformed string recovers symbols the transform discarded.

## Not established

- Cycle-accurate or synthesized behavior of `sha256_unit.sv`. No `iverilog`, Verilator, or Yosys in the lab.
- Any claim that would need a secret key: forgery against a MAC, fault injection, or a practical length-extension attack. The receipt is not a MAC, so those attacks were not posed as successes or failures of one.
