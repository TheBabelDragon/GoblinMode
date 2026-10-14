# Exact 64-byte messages — goblin gang report

Baseline BabelForge `387d8dfbfe70ac7790e4ca73354aa1fbc6661d95` · `rtl/src/sha256_unit.sv`

## Software ground truth (FIPS 180-4)

Padding rule: append `0x80`, zero-pad until length ≡ 56 (mod 64), append 64-bit big-endian bit length.

| Message length | Padded length | Compression blocks |
|----------------|---------------|--------------------|
| 0 | 64 | 1 |
| 55 | 64 | 1 |
| 56 | 128 | 2 |
| 63 | 128 | 2 |
| **64** | **128** | **2** |
| 65 | 128 | 2 |
| 128 | 192 | 3 |

Exact 64 message bytes **must** produce a second block whose first byte is `0x80` and whose last 8 bytes are the bit length (`0x200` for 512 bits).

`hashlib` / BabelPipe software model digests (message = `a` × N):

```
len 64  → ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb
len 128 → 6836cf13bac400e9105071cd6af47084dfacad4e5e302c94bfed24e013afb73e
```

Software path is **confirmed** against hashlib (already in ledger for lengths including 64).

## RTL source walk — padding skip

From `S_LOAD` in `sha256_unit.sv`:

```systemverilog
if (m_idx == 7'd63) begin
  m_idx <= 0; final_block <= byte_last; state <= S_W0;
end else begin
  m_idx <= m_idx + 1;
  if (byte_last) state <= S_PAD80;
end
```

When the **64th byte** arrives (`m_idx == 63`) **and** `byte_last` is high:

1. `final_block <= 1`
2. `state <= S_W0` — **never enters `S_PAD80`**
3. After compress: `S_NEXT` sees `final_block` and goes to `S_DONE`
4. No `0x80`, no length field, no extra block

So an exact multiple of 64 message bytes, with `byte_last` on the last byte of a full block, **skips FIPS padding**.

This is stronger than the prior “untested” note: it is a **confirmed source defect** (still not cycle-accurate sim — no iverilog/Verilator in lab).

Related known RTL defect (already ledgered): message schedule uses `W[wi-15]` where FIPS wants `W[i-16]`.

## Verdict

| Claim | Status |
|-------|--------|
| Software SHA-256 at len=64 ≡ hashlib | **confirmed** |
| RTL skips pad when last byte fills a block | **confirmed (source)** |
| Cycle-accurate / netlist proof of wrong digest | **not established** (no sim) |

Not a break of SHA-256. Indicts `sha256_unit.sv` as written.
