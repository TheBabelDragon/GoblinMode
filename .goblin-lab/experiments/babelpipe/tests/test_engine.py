# -*- coding: utf-8 -*-
"""BabelPipe regressions. Oracle and VM are read; baseline files are not written."""

import hashlib
import json
import random
import subprocess
import unittest
import unicodedata
from pathlib import Path

from babelpipe.engine import run_pipeline, sha256_hex
from reference.angelic_cipher import (
    BiblicalAngelicCipher,
    get_default_cipher,
    DEFAULT_GEMATRIA,
)

ROOT = Path(__file__).resolve().parents[1]
BABEL = Path(__file__).resolve().parents[3] / "BabelForge"
VECTORS = Path("/workspace/src/lib/babelpipe/receipt-vectors.json")


def body(program: str, text: str) -> str:
    return run_pipeline(program, text).receipt_body


class TestOracleDifferential(unittest.TestCase):
    def setUp(self):
        self.cipher = get_default_cipher()

    def test_transliterate_encode_decode_hash_match_oracle(self):
        rng = random.Random(387)
        alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ chshtx") + list(DEFAULT_GEMATRIA) + list("ךםןףץ !😀éßﬁ\n")
        samples = ["", "hello", "HELLO", "X", "QS", "TSH", "THS", "CH", "ß", "ﬁle", "שלום", "A1B!", "İstanbul"]
        for _ in range(200):
            samples.append("".join(rng.choice(alphabet) for _ in range(rng.randint(0, 12))))
        for s in samples:
            got = run_pipeline("TRANSLITERATE", s)
            heb = self.cipher.transliterate_english_to_hebrew(s)
            self.assertEqual(got.value.text, heb, msg=repr(s))
            enc = run_pipeline("ENCODE", heb)
            ref = self.cipher.encode(heb)
            self.assertEqual(len(enc.value.triples), len(ref))
            for triple, ref_t in zip(enc.value.triples, ref):
                self.assertEqual(triple.sum, ref_t[0])
                self.assertEqual(triple.pair, ref_t[1])
                self.assertEqual(list(triple.names[0]), ref_t[2][0])
                self.assertEqual(list(triple.names[1]), ref_t[2][1])
            dec = run_pipeline("TRANSLITERATE\nENCODE\nDECODE", s)
            self.assertEqual(dec.value.text, heb)
            hashed = run_pipeline("HASH", heb)
            self.assertEqual(hashed.value.hex, self.cipher.checksum(heb))

    def test_hello_golden_digest(self):
        r = run_pipeline("TRANSLITERATE\nHASH", "hello")
        self.assertEqual(r.value.text, "")  # digest kind
        self.assertEqual(r.value.hex, "6c47c22e0d41e8d46e3f20068d7c016f5782e56ec49a1ccb119d40e21d2cc766")
        self.assertFalse(r.halted)

    def test_empty_sha(self):
        r = run_pipeline("HASH", "")
        self.assertEqual(r.value.hex, hashlib.sha256(b"").hexdigest())


class TestCollisionsAndStructure(unittest.TestCase):
    def test_x_equals_qs_after_transliterate_but_not_as_sha256_inputs(self):
        a = run_pipeline("TRANSLITERATE\nHASH\nRECEIPT", "X")
        b = run_pipeline("TRANSLITERATE\nHASH\nRECEIPT", "QS")
        self.assertEqual(a.steps[0].preview, "קס")
        self.assertEqual(a.steps[0].preview, b.steps[0].preview)
        self.assertEqual(a.value.hex, b.value.hex)
        self.assertNotEqual(hashlib.sha256(b"X").hexdigest(), hashlib.sha256(b"QS").hexdigest())
        self.assertNotEqual(a.input_sha256, b.input_sha256)

    def test_case_ligature_eszett_and_digraph_order(self):
        self.assertEqual(run_pipeline("TRANSLITERATE", "hello").value.text, run_pipeline("TRANSLITERATE", "HELLO").value.text)
        self.assertEqual(run_pipeline("TRANSLITERATE", "ﬁle").value.text, run_pipeline("TRANSLITERATE", "file").value.text)
        self.assertEqual(run_pipeline("TRANSLITERATE", "ß").value.text, "סס")
        self.assertEqual(run_pipeline("TRANSLITERATE", "SS").value.text, "סס")
        self.assertEqual(run_pipeline("TRANSLITERATE", "TSH").value.text, "צה")
        self.assertEqual(run_pipeline("TRANSLITERATE", "THS").value.text, "תס")

    def test_nfd_changes_latin_and_turkish_i(self):
        nfc = "é"
        nfd = unicodedata.normalize("NFD", nfc)
        self.assertNotEqual(
            run_pipeline("TRANSLITERATE", nfc).value.text,
            run_pipeline("TRANSLITERATE", nfd).value.text,
        )
        self.assertEqual(run_pipeline("TRANSLITERATE", nfd).value.text, "ע" + "\u0301")
        dotted = unicodedata.normalize("NFD", "İ")
        self.assertEqual(run_pipeline("NORMALIZE NFD\nTRANSLITERATE", "İ").value.text, "י\u0307")
        self.assertEqual(run_pipeline("TRANSLITERATE", dotted).value.text, "י\u0307")
        self.assertEqual(run_pipeline("TRANSLITERATE", "İ").value.text, "İ")

    def test_final_mem_is_passthrough(self):
        r = run_pipeline("ENCODE", "שלום")
        sums = [t.sum for t in r.value.triples]
        self.assertEqual(sums, ["290", "4", "50", ""])
        self.assertEqual(r.steps[0].glyphs[3]["text"], "ם")
        folded = run_pipeline("FOLD_SOFIT\nENCODE", "שלום")
        self.assertEqual([t.sum for t in folded.value.triples], ["290", "4", "50", "6"])

    def test_gematria_collision_and_sofit_blind_spot(self):
        a = run_pipeline("GEMATRIA", "אב")
        b = run_pipeline("GEMATRIA", "ג")
        self.assertEqual(a.value.number, "3")
        self.assertEqual(b.value.number, "3")
        shalom = run_pipeline("GEMATRIA", "שלום")
        self.assertEqual(shalom.value.number, "336")
        self.assertIn("ם=?", shalom.value.detail)

    def test_niqqud_splits(self):
        bet = "בּ"  # bet + dagesh
        r = run_pipeline("ENCODE", bet)
        self.assertEqual([t.sum for t in r.value.triples], ["7", ""])
        stripped = run_pipeline("STRIP_MARKS\nENCODE", bet)
        self.assertEqual([t.sum for t in stripped.value.triples], ["7"])

    def test_decode_ignores_forged_pairs(self):
        r = run_pipeline("ENCODE\nFORGE_PAIR\nDECODE", "א")
        self.assertEqual(r.value.text, "א")
        forged = r.steps[1]
        self.assertEqual(forged.glyphs[0]["pair"], ["ת", "ת"])
        assertion = run_pipeline("ENCODE\nFORGE_PAIR\nASSERT_REVERSIBLE", "א")
        self.assertEqual(assertion.steps[-1].status, "warn")
        self.assertFalse(assertion.halted)

    def test_encode_assert_is_ok(self):
        r = run_pipeline("TRANSLITERATE\nENCODE\nASSERT_REVERSIBLE\nDECODE", "hello")
        self.assertEqual([s.status for s in r.steps], ["ok", "ok", "ok", "ok"])
        self.assertEqual(r.value.text, "העללו")

    def test_decode_assert_warns(self):
        r = run_pipeline("ENCODE\nDECODE\nASSERT_REVERSIBLE", "א")
        self.assertEqual(r.steps[-1].status, "warn")
        self.assertIn("not injective", r.steps[-1].note)


class TestMeltCheat(unittest.TestCase):
    PROGRAM = "MELT\nASSERT_REVERSIBLE\nRECEIPT"

    def test_assert_passes_only_via_sidecar_and_outputs_collide(self):
        a = run_pipeline(self.PROGRAM, "שלום")
        b = run_pipeline(self.PROGRAM, "שלומ")
        self.assertEqual(a.steps[0].preview, "שלומ")
        self.assertEqual(a.steps[0].preview, b.steps[0].preview)
        self.assertEqual(a.steps[0].out_sha, b.steps[0].out_sha)
        self.assertEqual(a.steps[1].status, "warn")
        self.assertEqual(a.steps[1].sidecar, "yes")
        self.assertNotEqual(a.input_sha256, b.input_sha256)
        # sidecar is not part of the canonical output
        self.assertNotIn("sidecar", a.final_canon)
        self.assertEqual(a.steps[0].injective, "no")
        self.assertEqual(a.steps[0].claim, "yes")

    def test_two_runs_are_deterministic(self):
        self.assertEqual(body(self.PROGRAM, "שלום"), body(self.PROGRAM, "שלום"))


class TestMalformed(unittest.TestCase):
    def test_decode_of_text(self):
        r = run_pipeline("DECODE", "א")
        self.assertTrue(r.halted)
        self.assertEqual(r.steps[0].status, "fail")
        self.assertIn("encoded", r.steps[0].note)

    def test_unknown_op_and_empty(self):
        r = run_pipeline("NOPE\nENCODE", "א")
        self.assertTrue(r.halted)
        self.assertEqual(r.steps[0].line, "PARSE")
        empty = run_pipeline("   \n# only\n", "א")
        self.assertIn("no operations", empty.steps[0].note)

    def test_custom_tables_break_roundtrip(self):
        cipher = BiblicalAngelicCipher(
            gematria={"א": 1, "ב": 1},
            angelic_pairs={"א": ("א", "ב"), "ב": ("א", "ב")},
        )
        self.assertEqual(cipher.decode(cipher.encode("א")), "ב")
        self.assertNotEqual(cipher.decode(cipher.encode("א")), "א")


class TestVmParity(unittest.TestCase):
    def test_vm_matches_oracle_on_attack_set(self):
        from babel.compiler import Compiler
        from babel.programs.angelic_cipher_ir import build_angelic_cipher_program
        from babel.vm import VM

        cipher = get_default_cipher()
        vm = VM(Compiler().compile_program(build_angelic_cipher_program()))
        samples = ["", "hello", "X", "QS", "TSH", "THS", "ß", "שלום", "A1B!", "é", "CH", "ﬁle", "A\u0301", "ך", "İ"]
        for s in samples:
            ref = cipher.transliterate_english_to_hebrew(s)
            got = vm.call("transliterate", s)
            self.assertEqual(got, ref, msg=repr(s))
            self.assertEqual(vm.call("checksum", ref), cipher.checksum(ref))


class TestShaAndRtlFormula(unittest.TestCase):
    def test_model_matches_hashlib_on_block_boundaries(self):
        import importlib.util

        path = BABEL / "tests" / "test_sha256_model.py"
        spec = importlib.util.spec_from_file_location("sha256_model", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for n in [0, 1, 55, 56, 63, 64, 65, 100, 1000]:
            msg = b"a" * n
            self.assertEqual(mod.sha256_hw_model(msg), hashlib.sha256(msg).digest(), msg=n)
        self.assertEqual(
            mod.sha256_hw_model(b"abc").hex(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        )

    def test_rtl_schedule_term_is_not_sha256(self):
        """Transcription of sha256_unit.sv S_WEXP, not a simulator run.

        The SV adds W[wi-15] where FIPS 180-4 requires W[i-16].
        """
        import importlib.util
        import struct

        path = BABEL / "tests" / "test_sha256_model.py"
        spec = importlib.util.spec_from_file_location("sha256_model", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        def broken(msg: bytes) -> bytes:
            bitlen = len(msg) * 8
            buf = bytearray(msg)
            buf.append(0x80)
            while (len(buf) % 64) != 56:
                buf.append(0x00)
            buf += struct.pack(">Q", bitlen)
            h = list(mod.IV)
            for off in range(0, len(buf), 64):
                block = buf[off : off + 64]
                W = [0] * 64
                for i in range(16):
                    W[i] = struct.unpack(">I", block[i * 4 : i * 4 + 4])[0]
                for i in range(16, 64):
                    s0 = mod._rotr(W[i - 15], 7) ^ mod._rotr(W[i - 15], 18) ^ (W[i - 15] >> 3)
                    s1 = mod._rotr(W[i - 2], 17) ^ mod._rotr(W[i - 2], 19) ^ (W[i - 2] >> 10)
                    # SV line: W[wi] <= s1 + W[wi-7] + s0 + W[wi-15]
                    W[i] = (W[i - 15] + s0 + W[i - 7] + s1) & 0xFFFFFFFF
                a, b, c, d, e, f, g, hh = h
                for i in range(64):
                    S1 = mod._rotr(e, 6) ^ mod._rotr(e, 11) ^ mod._rotr(e, 25)
                    ch = (e & f) ^ ((~e) & g)
                    t1 = (hh + S1 + ch + mod.K[i] + W[i]) & 0xFFFFFFFF
                    S0 = mod._rotr(a, 2) ^ mod._rotr(a, 13) ^ mod._rotr(a, 22)
                    maj = (a & b) ^ (a & c) ^ (b & c)
                    t2 = (S0 + maj) & 0xFFFFFFFF
                    hh, g, f, e, d, c, b, a = (
                        g, f, e, (d + t1) & 0xFFFFFFFF, c, b, a, (t1 + t2) & 0xFFFFFFFF,
                    )
                h = [(x + y) & 0xFFFFFFFF for x, y in zip(h, [a, b, c, d, e, f, g, hh])]
            return b"".join(struct.pack(">I", x) for x in h)

        self.assertNotEqual(broken(b"abc"), hashlib.sha256(b"abc").digest())
        src = (BABEL / "rtl" / "src" / "sha256_unit.sv").read_text(encoding="utf-8")
        self.assertIn("W[wi] <= s1 + W[wi-7] + s0 + W[wi-15]", src)


class TestBaselineUntouched(unittest.TestCase):
    def test_head_and_clean_tree(self):
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=BABEL, text=True).strip()
        self.assertEqual(head, "387d8dfbfe70ac7790e4ca73354aa1fbc6661d95")
        status = subprocess.check_output(["git", "status", "--porcelain"], cwd=BABEL, text=True)
        self.assertEqual(status, "")


class TestEmitVectors(unittest.TestCase):
    def test_write_vectors_for_the_typescript_port(self):
        cases = [
            ("empty-hash", "HASH\nRECEIPT", ""),
            ("hello", "TRANSLITERATE\nENCODE\nASSERT_REVERSIBLE\nDECODE\nHASH\nRECEIPT", "hello"),
            ("x", "TRANSLITERATE\nHASH\nRECEIPT", "X"),
            ("qs", "TRANSLITERATE\nHASH\nRECEIPT", "QS"),
            ("tsh", "TRANSLITERATE\nRECEIPT", "TSH"),
            ("ths", "TRANSLITERATE\nRECEIPT", "THS"),
            ("eszett", "TRANSLITERATE\nRECEIPT", "ß"),
            ("ligature", "TRANSLITERATE\nRECEIPT", "ﬁle"),
            ("file", "TRANSLITERATE\nRECEIPT", "file"),
            ("eacute", "TRANSLITERATE\nRECEIPT", "é"),
            ("eacute-nfd", "TRANSLITERATE\nRECEIPT", unicodedata.normalize("NFD", "é")),
            ("turkish", "NORMALIZE NFD\nTRANSLITERATE\nRECEIPT", "İ"),
            ("shalom", "ENCODE\nRECEIPT", "שלום"),
            ("fold", "FOLD_SOFIT\nENCODE\nRECEIPT", "שלום"),
            ("melt", "MELT\nASSERT_REVERSIBLE\nRECEIPT", "שלום"),
            ("melt-medial", "MELT\nASSERT_REVERSIBLE\nRECEIPT", "שלומ"),
            ("gematria-ab", "GEMATRIA\nRECEIPT", "אב"),
            ("gematria-g", "GEMATRIA\nRECEIPT", "ג"),
            ("forge", "ENCODE\nFORGE_PAIR\nASSERT_REVERSIBLE\nDECODE\nRECEIPT", "א"),
            ("niqqud", "ENCODE\nRECEIPT", "בּ"),
            ("strip", "STRIP_MARKS\nENCODE\nRECEIPT", "בּ"),
            ("malformed", "DECODE", "א"),
            ("empty-program", "  \n# c\n", "א"),
            ("nfc", "NORMALIZE NFC\nTRANSLITERATE\nRECEIPT", "é"),
        ]
        payload = {"cases": []}
        for name, program, text in cases:
            r = run_pipeline(program, text)
            payload["cases"].append(
                {
                    "name": name,
                    "program": program,
                    "input": text,
                    "receipt": r.receipt_body,
                    "preview": r.steps[-1].preview if r.steps else "",
                    "halted": r.halted,
                }
            )
        VECTORS.parent.mkdir(parents=True, exist_ok=True)
        VECTORS.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.assertGreater(len(payload["cases"]), 10)


if __name__ == "__main__":
    unittest.main()
