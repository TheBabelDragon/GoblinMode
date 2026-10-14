export type Verdict = "confirmed" | "disproven" | "untested"

export type Finding = {
  id: string
  verdict: Verdict
  title: string
  detail: string
}

export const FINDINGS: Finding[] = [
  {
    id: "not-injective",
    verdict: "confirmed",
    title: "English-to-Hebrew is not injective",
    detail:
      "X and QS both become קס. Case folds away. C/G, F/P, I/J/Y, and O/U/V/W collapse. ﬁle and file collide. ß becomes SS before the map runs. The reference cipher, the VM, and BabelPipe agree.",
  },
  {
    id: "not-a-sha-break",
    verdict: "disproven",
    title: "Those collisions are not SHA-256 collisions",
    detail:
      "sha256(X) and sha256(QS) differ. The shared digest is the hash of one Hebrew string, produced twice. Hashing is not encryption, and a digest of an already-collided string does not break SHA-256.",
  },
  {
    id: "digraph",
    verdict: "confirmed",
    title: "Digraphs are greedy and left to right",
    detail: "TSH becomes צה (TS, then H). THS becomes תס (TH, then S). Same letters, different cursor, different Hebrew.",
  },
  {
    id: "normalize",
    verdict: "disproven",
    title: "Normalization is not a free preprocessing step",
    detail:
      "é in NFC is passed through as É. The same letter in NFD is E plus an acute, and E becomes ayin. Turkish İ passes through until NFD splits it into ASCII I plus a dot, which transliterates.",
  },
  {
    id: "sofit",
    verdict: "confirmed",
    title: "Final letters are outside the angelic alphabet",
    detail:
      "שלום round-trips only because final mem is preserved as an unknown character. Its encoded sum is empty. Additive gematria ignores it, so שלום totals 336 rather than the 376 of שלומ.",
  },
  {
    id: "pairs",
    verdict: "confirmed",
    title: "DECODE does not authenticate the pair",
    detail:
      "A forged pair of tav/tav with the sum 3 still decodes to aleph. On the default tables the 22 sums are unique, so the pair is redundant. The constructor does not check that uniqueness for custom tables.",
  },
  {
    id: "custom",
    verdict: "confirmed",
    title: "Colliding custom sums break the round trip",
    detail:
      "A two-letter table where both letters share a sum decodes aleph back to bet. Last entry wins. The default tables are safe; the constructor is not a proof of the spec invariant.",
  },
  {
    id: "melt",
    verdict: "disproven",
    title: "A passing reversibility assert can still be a lie",
    detail:
      "MELT folds final forms, claims to be reversible, and hides the original in a sidecar. The assert matches that sidecar. שלום and שלומ leave the same canonical output, and the receipt hashes the output, not the sidecar.",
  },
  {
    id: "encode-round",
    verdict: "confirmed",
    title: "ENCODE on the default tables really does round-trip",
    detail:
      "DECODE(ENCODE(s)) equals s for the oracle’s own tests and for a seeded fuzz of mixed English, Hebrew, final forms, and punctuation. The VM matched the oracle on the attack set. This is a property of these tables, not of every op in the DSL.",
  },
  {
    id: "sha-model",
    verdict: "confirmed",
    title: "The software SHA-256 model matches hashlib",
    detail:
      "Empty, abc (the NIST vector), the Hebrew hello digest, and messages of length 0, 1, 55, 56, 63, 64, 65, 100, and 1000 bytes. Agreement with hashlib is an independent check. Agreement between two copies of a bad model would not be.",
  },
  {
    id: "rtl-schedule",
    verdict: "confirmed",
    title: "The RTL schedule term is not the FIPS term",
    detail:
      "sha256_unit.sv adds W[i−15] in the place FIPS 180-4 reserves for W[i−16]. A direct transcription of that expression disagrees with hashlib on abc. That is a hardware-source defect, not a break of SHA-256. No Verilog simulator was available, so the netlist was not run.",
  },
  {
    id: "rtl-pad",
    verdict: "untested",
    title: "Exact 64-byte messages may skip padding",
    detail:
      "Reading the state machine: a last byte that fills the block sets final_block and later goes to done, which would skip the required extra padding block. This was not simulated. Treat it as a lead, not a verdict.",
  },
  {
    id: "receipt",
    verdict: "confirmed",
    title: "A receipt proves sameness, not authorship",
    detail:
      "The receipt chains input digest, op names, status, and canonical output. Re-running the same pipeline on the same text reproduces it. Anyone can recompute it. It is not a signature, not a MAC, and it cannot restore bits a lossy op threw away.",
  },
]
