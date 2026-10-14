# -*- coding: utf-8 -*-
"""BabelPipe 0.1.0.

A tiny pipeline language over the Ultimate Angelic Cipher tables.
The algorithm is reimplemented here and differentially checked against
``reference.angelic_cipher`` by the tests. This module does not modify
the baseline tree.

Receipt body format (UTF-8, joined with newlines, trailing newline):

    babelpipe/0.1.0
    baseline 387d8dfbfe70ac7790e4ca73354aa1fbc6661d95
    input_sha256 <hex of the raw input text>
    step|<status>|<claim>|<injective>|<sidecar>|<out_sha>|<chain>|<LINE>|<note>
    final <sha256 of the final canonical value>
    halted <0|1>

chain_0 = input_sha256
chain_{i+1} = sha256(chain_i + "\\n" + LINE + "\\n" + status + "\\n" + canon)
out_sha = sha256(canon)

Canonical values:
    text     T\\n<text>
    encoded  E\\n<json triple per line>
    digest   D\\n<hex>
    number   N\\n<decimal>\\n<detail>
"""

from __future__ import annotations

import hashlib
import json
import unicodedata
from dataclasses import dataclass, field

from reference.angelic_cipher import (
    DEFAULT_ANGELIC_PAIRS,
    DEFAULT_GEMATRIA,
    ENGLISH_TO_HEBREW,
    HEBREW_TRANSLITERATIONS,
)

VERSION = "babelpipe/0.1.0"
BASELINE = "387d8dfbfe70ac7790e4ca73354aa1fbc6661d95"

LETTER_TO_PAIR = {k: (a, b) for k, (a, b) in DEFAULT_ANGELIC_PAIRS.items()}
LETTER_TO_SUM = {
    k: str(DEFAULT_GEMATRIA[a] + DEFAULT_GEMATRIA[b]) for k, (a, b) in LETTER_TO_PAIR.items()
}
SUM_TO_LETTER: dict[str, str] = {}
for _k, _s in LETTER_TO_SUM.items():
    SUM_TO_LETTER[_s] = _k

SOFIT = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
FORMS = ("NFC", "NFD", "NFKC", "NFKD")

# claim / injective / inverse name
OP_META = {
    "NORMALIZE": ("no", "no", ""),
    "TRANSLITERATE": ("no", "no", ""),
    "ENCODE": ("yes", "yes", "DECODE"),
    "DECODE": ("no", "no", "ENCODE"),
    "HASH": ("no", "no", ""),
    "GEMATRIA": ("no", "no", ""),
    "FOLD_SOFIT": ("no", "no", ""),
    "STRIP_MARKS": ("no", "no", ""),
    "MELT": ("yes", "no", "SIDECAR"),
    "FORGE_PAIR": ("yes", "no", "REENCODE"),
    "ASSERT_REVERSIBLE": ("na", "na", ""),
    "RECEIPT": ("na", "na", ""),
}


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def dedupe(xs: list[int]) -> tuple[int, ...]:
    seen: set[int] = set()
    out: list[int] = []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return tuple(out)


@dataclass(frozen=True)
class Glyph:
    text: str
    rule: str
    src: tuple[int, ...]


@dataclass(frozen=True)
class Triple:
    sum: str
    pair: tuple[str, str]
    names: tuple[tuple[str, ...], tuple[str, ...]]
    src: tuple[int, ...]
    rule: str


@dataclass
class Value:
    kind: str
    text: str = ""
    glyphs: tuple[Glyph, ...] = ()
    triples: tuple[Triple, ...] = ()
    hex: str = ""
    number: str = ""
    detail: str = ""
    sidecar: str | None = None


@dataclass
class ParsedOp:
    line: str
    op: str
    arg: str = ""


@dataclass
class Step:
    line: str
    status: str
    claim: str
    injective: str
    sidecar: str
    out_sha: str
    chain: str
    note: str
    preview: str
    glyphs: list[dict] = field(default_factory=list)


@dataclass
class RunResult:
    steps: list[Step]
    halted: bool
    value: Value
    receipt_body: str
    receipt_sha256: str
    input_sha256: str
    final_canon: str
    parse_errors: list[str]


def is_mark(ch: str) -> bool:
    return unicodedata.category(ch).startswith("M")


def canon(v: Value) -> str:
    if v.kind == "text":
        return "T\n" + v.text
    if v.kind == "digest":
        return "D\n" + v.hex
    if v.kind == "number":
        return "N\n" + v.number + "\n" + v.detail
    rows = []
    for t in v.triples:
        rows.append(
            json.dumps(
                {
                    "sum": t.sum,
                    "pair": [t.pair[0], t.pair[1]],
                    "names": [list(t.names[0]), list(t.names[1])],
                },
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
    return "E\n" + "\n".join(rows)


def preview_of(v: Value) -> str:
    if v.kind == "text":
        return v.text
    if v.kind == "digest":
        return v.hex
    if v.kind == "number":
        return v.number + ((" " + v.detail) if v.detail else "")
    chars = []
    for t in v.triples:
        if t.sum:
            chars.append(SUM_TO_LETTER.get(t.sum, "?"))
        else:
            chars.append(t.names[0][0] if t.names[0] else "?")
    return "".join(chars)


def glyphs_of(v: Value) -> list[dict]:
    if v.kind == "text":
        return [{"text": g.text, "rule": g.rule, "src": list(g.src)} for g in v.glyphs]
    if v.kind == "encoded":
        out = []
        for t in v.triples:
            if t.sum:
                text = SUM_TO_LETTER.get(t.sum, "?")
                rule = t.rule or ("sum:" + t.sum)
            else:
                text = t.names[0][0] if t.names[0] else "?"
                rule = "passthrough"
            out.append(
                {
                    "text": text,
                    "rule": rule,
                    "src": list(t.src),
                    "sum": t.sum,
                    "pair": [t.pair[0], t.pair[1]],
                    "names": [list(t.names[0]), list(t.names[1])],
                }
            )
        return out
    return []


def text_value(s: str, glyphs: tuple[Glyph, ...] | None = None, sidecar: str | None = None) -> Value:
    if glyphs is None:
        glyphs = tuple(Glyph(ch, "source", (i,)) for i, ch in enumerate(s))
    return Value(kind="text", text=s, glyphs=glyphs, sidecar=sidecar)


def parse_program(src: str) -> tuple[list[ParsedOp], list[str]]:
    ops: list[ParsedOp] = []
    errors: list[str] = []
    if src.strip() == "":
        return [], ["program has no operations"]
    for n, raw in enumerate(src.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        op = parts[0].upper()
        if op not in OP_META:
            errors.append(f"unknown op {parts[0]} on line {n}")
            continue
        if op == "NORMALIZE":
            if len(parts) != 2 or parts[1].upper() not in FORMS:
                errors.append(f"NORMALIZE needs NFC, NFD, NFKC, or NFKD on line {n}")
                continue
            form = parts[1].upper()
            ops.append(ParsedOp(f"NORMALIZE {form}", op, form))
        elif len(parts) != 1:
            errors.append(f"extra tokens on line {n}")
        else:
            ops.append(ParsedOp(op, op))
    if not ops and not errors:
        errors.append("program has no operations")
    return ops, errors


def _consume(stream: list[tuple[str, tuple[int, ...]]], actual: str, form: str) -> tuple[Glyph, ...] | None:
    i = 0
    out: list[Glyph] = []
    for ch in actual:
        exp = unicodedata.normalize("NFD", ch)
        srcs: list[int] = []
        for e in exp:
            if i >= len(stream) or stream[i][0] != e:
                return None
            srcs.extend(stream[i][1])
            i += 1
        out.append(Glyph(ch, f"normalize:{form}", dedupe(srcs)))
    if i != len(stream):
        return None
    return tuple(out)


def apply_normalize(v: Value, form: str) -> Value:
    if v.kind != "text":
        raise TypeError(f"NORMALIZE expects text, found {v.kind}")
    actual = unicodedata.normalize(form, v.text)
    base = "NFKD" if form in ("NFKC", "NFKD") else "NFD"
    stream: list[tuple[str, tuple[int, ...]]] = []
    for g in v.glyphs:
        for ch in unicodedata.normalize(base, g.text):
            stream.append((ch, g.src))
    mapped = _consume(stream, actual, form)
    if mapped is None:
        mapped = tuple(Glyph(ch, f"normalize:{form}:unmapped", ()) for ch in actual)
    return text_value(actual, mapped)


def apply_transliterate(v: Value) -> Value:
    if v.kind != "text":
        raise TypeError(f"TRANSLITERATE expects text, found {v.kind}")
    upper: list[tuple[str, tuple[int, ...]]] = []
    for g in v.glyphs:
        for ch in g.text.upper():
            upper.append((ch, g.src))
    out: list[Glyph] = []
    i = 0
    while i < len(upper):
        if i + 1 < len(upper):
            dig = upper[i][0] + upper[i + 1][0]
            if dig in ENGLISH_TO_HEBREW and len(dig) == 2:
                heb = ENGLISH_TO_HEBREW[dig]
                src = dedupe(list(upper[i][1]) + list(upper[i + 1][1]))
                for ch in heb:
                    out.append(Glyph(ch, f"digraph:{dig}", src))
                i += 2
                continue
        ch, src = upper[i]
        if ch in ENGLISH_TO_HEBREW:
            heb = ENGLISH_TO_HEBREW[ch]
            rule = "expand" if len(heb) > 1 else "letter"
            for h in heb:
                out.append(Glyph(h, f"{rule}:{ch}", src))
        else:
            out.append(Glyph(ch, "passthrough", src))
        i += 1
    return text_value("".join(g.text for g in out), tuple(out))


def _names(ch: str) -> tuple[str, ...]:
    return tuple(HEBREW_TRANSLITERATIONS.get(ch, [ch]))


def apply_encode(v: Value) -> Value:
    if v.kind != "text":
        raise TypeError(f"ENCODE expects text, found {v.kind}")
    triples: list[Triple] = []
    for g in v.glyphs:
        for ch in g.text:
            if ch in LETTER_TO_PAIR:
                a, b = LETTER_TO_PAIR[ch]
                triples.append(
                    Triple(
                        LETTER_TO_SUM[ch],
                        (a, b),
                        (_names(a), _names(b)),
                        g.src,
                        f"sum:{LETTER_TO_SUM[ch]}",
                    )
                )
            else:
                triples.append(Triple("", ("", ""), ((ch,), (ch,)), g.src, "passthrough"))
    return Value(kind="encoded", triples=tuple(triples), text=v.text)


def apply_decode(v: Value) -> Value:
    if v.kind != "encoded":
        raise TypeError(f"DECODE expects encoded state, found {v.kind}")
    glyphs: list[Glyph] = []
    for t in v.triples:
        if t.sum:
            if t.sum not in SUM_TO_LETTER:
                raise ValueError(f"unknown angelic sum: {t.sum}")
            glyphs.append(Glyph(SUM_TO_LETTER[t.sum], f"sum:{t.sum}", t.src))
        else:
            if not t.names[0]:
                raise ValueError("missing passthrough character")
            glyphs.append(Glyph(t.names[0][0], "passthrough", t.src))
    return text_value("".join(g.text for g in glyphs), tuple(glyphs))


def apply_fold(v: Value) -> tuple[Value, int]:
    if v.kind != "text":
        raise TypeError(f"FOLD_SOFIT expects text, found {v.kind}")
    glyphs: list[Glyph] = []
    changed = 0
    for g in v.glyphs:
        if g.text in SOFIT:
            glyphs.append(Glyph(SOFIT[g.text], "sofit", g.src))
            changed += 1
            continue
        built: list[str] = []
        local = 0
        for ch in g.text:
            if ch in SOFIT:
                built.append(SOFIT[ch])
                local += 1
            else:
                built.append(ch)
        merged = "".join(built)
        changed += local
        if merged == g.text:
            glyphs.append(g)
        else:
            for ch in merged:
                glyphs.append(Glyph(ch, "sofit", g.src))
    return text_value("".join(g.text for g in glyphs), tuple(glyphs)), changed


def apply_strip(v: Value) -> tuple[Value, int]:
    if v.kind != "text":
        raise TypeError(f"STRIP_MARKS expects text, found {v.kind}")
    glyphs: list[Glyph] = []
    removed = 0
    for g in v.glyphs:
        kept = "".join(ch for ch in g.text if not is_mark(ch))
        removed += len(g.text) - len(kept)
        if not kept:
            continue
        if kept == g.text:
            glyphs.append(g)
        else:
            for ch in kept:
                glyphs.append(Glyph(ch, g.rule, g.src))
    return text_value("".join(g.text for g in glyphs), tuple(glyphs)), removed


def apply_melt(v: Value) -> tuple[Value, int, int]:
    if v.kind != "text":
        raise TypeError(f"MELT expects text, found {v.kind}")
    original = v.text
    stripped, n_strip = apply_strip(v)
    folded, n_fold = apply_fold(stripped)
    folded.sidecar = original
    return folded, n_strip, n_fold


def apply_forge(v: Value) -> Value:
    if v.kind != "encoded":
        raise TypeError(f"FORGE_PAIR expects encoded state, found {v.kind}")
    triples = []
    for t in v.triples:
        if t.sum:
            triples.append(Triple(t.sum, ("ת", "ת"), (("Nope",), ("Nope",)), t.src, "forged"))
        else:
            triples.append(t)
    return Value(kind="encoded", triples=tuple(triples), text=v.text)


def apply_gematria(v: Value) -> Value:
    if v.kind != "text":
        raise TypeError(f"GEMATRIA expects text, found {v.kind}")
    total = 0
    unknown = 0
    parts: list[str] = []
    for ch in v.text:
        if ch in DEFAULT_GEMATRIA:
            val = DEFAULT_GEMATRIA[ch]
            total += val
            parts.append(f"{ch}={val}")
        else:
            unknown += 1
            parts.append(f"{ch}=?")
    detail = "+".join(parts)
    return Value(kind="number", number=str(total), detail=detail, text=v.text)


def apply_hash(v: Value) -> tuple[Value, str]:
    if v.kind == "text":
        digest = sha256_hex(v.text)
        note = "sha256 utf-8 of text state; not a signature"
    elif v.kind == "encoded":
        digest = sha256_hex(canon(v))
        note = "sha256 utf-8 of canonical triples; not the hebrew-form checksum"
    elif v.kind == "number":
        digest = sha256_hex(v.number)
        note = "sha256 utf-8 of decimal total; not a signature"
    else:
        digest = sha256_hex(v.hex)
        note = "sha256 utf-8 of hex digest text; not a signature"
    return Value(kind="digest", hex=digest), note


def _pure_inverse(op: str, post: Value) -> Value:
    if op == "ENCODE":
        return apply_decode(post)
    if op == "DECODE":
        return apply_encode(post)
    if op == "FORGE_PAIR":
        return apply_encode(apply_decode(post))
    raise ValueError(f"{op} has no pure inverse")


def _count_rules(glyphs: tuple[Glyph, ...], prefix: str) -> int:
    return sum(1 for g in glyphs if g.rule.startswith(prefix))


def _note_for(op: ParsedOp, before: Value, after: Value, extra: str = "") -> str:
    if op.op == "NORMALIZE":
        return f"normalize {op.arg}"
    if op.op == "TRANSLITERATE":
        gs = after.glyphs
        return (
            f"transliterate glyphs={len(gs)} digraphs={_count_rules(gs, 'digraph:')}"
            f" letters={_count_rules(gs, 'letter:')} expansions={_count_rules(gs, 'expand:')}"
            f" passthrough={sum(1 for g in gs if g.rule == 'passthrough')}"
        )
    if op.op == "ENCODE":
        known = sum(1 for t in after.triples if t.sum)
        return f"encode triples={len(after.triples)} known={known} unknown={len(after.triples) - known}"
    if op.op == "DECODE":
        return f"decode chars={len(after.text)}"
    if op.op == "FOLD_SOFIT":
        return extra
    if op.op == "STRIP_MARKS":
        return extra
    if op.op == "MELT":
        return extra
    if op.op == "FORGE_PAIR":
        forged = sum(1 for t in after.triples if t.rule == "forged")
        return f"forge pairs replaced={forged}; sums kept; pairs are not authenticated by DECODE"
    if op.op == "GEMATRIA":
        unknown = after.detail.count("=?")
        return f"gematria total={after.number} unknown={unknown} {after.detail}"
    if op.op == "HASH":
        return extra
    return extra


def run_pipeline(program: str, text: str) -> RunResult:
    ops, errors = parse_program(program)
    value = text_value(text)
    input_sha = sha256_hex(text)
    chain = input_sha
    steps: list[Step] = []
    halted = False
    last_transform: tuple[str, Value, Value] | None = None

    def push(line: str, status: str, claim: str, injective: str, sidecar: str, val: Value, note: str) -> None:
        nonlocal chain
        c = canon(val)
        chain = sha256_hex(chain + "\n" + line + "\n" + status + "\n" + c)
        steps.append(
            Step(
                line=line,
                status=status,
                claim=claim,
                injective=injective,
                sidecar=sidecar,
                out_sha=sha256_hex(c),
                chain=chain,
                note=note.replace("|", "/").replace("\n", " ").replace("\r", " "),
                preview=preview_of(val),
                glyphs=glyphs_of(val),
            )
        )

    if errors:
        note = "parse error: " + "; ".join(errors)
        push("PARSE", "fail", "na", "na", "no", value, note)
        halted = True
    else:
        for op in ops:
            if halted:
                break
            claim, injective, _inv = OP_META[op.op]
            if op.op == "RECEIPT":
                push(op.line, "info", claim, injective, "no", value, "receipt recorded")
                continue
            if op.op == "ASSERT_REVERSIBLE":
                if last_transform is None:
                    push(op.line, "fail", "na", "na", "no", value, "assert failed: no prior transformation")
                    halted = True
                    continue
                prev_op, pre, post = last_transform
                meta_claim, meta_inj, inv = OP_META[prev_op]
                try:
                    if inv == "SIDECAR":
                        if post.sidecar is None:
                            raise ValueError("sidecar missing")
                        restored = text_value(post.sidecar)
                        via_side = True
                    else:
                        restored = _pure_inverse(prev_op, post)
                        via_side = False
                    matched = canon(restored) == canon(pre)
                except (TypeError, ValueError) as exc:
                    push(op.line, "fail", "na", "na", "no", value, f"assert failed: {exc}")
                    halted = True
                    continue
                if not matched:
                    push(
                        op.line,
                        "fail",
                        "na",
                        "na",
                        "no",
                        value,
                        "assert failed: inverse did not restore the prior state",
                    )
                    halted = True
                    continue
                if via_side:
                    push(
                        op.line,
                        "warn",
                        "na",
                        "na",
                        "yes",
                        value,
                        "assert matched sidecar only; MELT is not a function of its output",
                    )
                    continue
                if meta_inj != "yes":
                    notes = {
                        "DECODE": "assert restored this input via ENCODE; DECODE ignores pairs and is not injective",
                        "FORGE_PAIR": "assert restored this input via sum redundancy; FORGE_PAIR is not injective",
                    }
                    push(
                        op.line,
                        "warn",
                        "na",
                        "na",
                        "no",
                        value,
                        notes.get(prev_op, f"assert restored this input only; {prev_op} is not injective"),
                    )
                    continue
                push(op.line, "ok", "na", "na", "no", value, f"assert ok via {inv}")
                continue

            pre = value
            try:
                extra = ""
                sidecar_flag = "no"
                if op.op == "NORMALIZE":
                    value = apply_normalize(value, op.arg)
                elif op.op == "TRANSLITERATE":
                    value = apply_transliterate(value)
                elif op.op == "ENCODE":
                    value = apply_encode(value)
                elif op.op == "DECODE":
                    value = apply_decode(value)
                elif op.op == "FOLD_SOFIT":
                    value, n = apply_fold(value)
                    extra = f"fold sofit changed={n}"
                elif op.op == "STRIP_MARKS":
                    value, n = apply_strip(value)
                    extra = f"strip marks removed={n}"
                elif op.op == "MELT":
                    value, ns, nf = apply_melt(pre)
                    extra = f"melt stripped={ns} folded={nf}; sidecar stashed; not injective"
                    sidecar_flag = "yes"
                elif op.op == "FORGE_PAIR":
                    value = apply_forge(value)
                elif op.op == "GEMATRIA":
                    value = apply_gematria(value)
                elif op.op == "HASH":
                    value, extra = apply_hash(value)
                else:
                    raise ValueError(f"unhandled {op.op}")
                note = _note_for(op, pre, value, extra)
                push(op.line, "ok", claim, injective, sidecar_flag, value, note)
                last_transform = (op.op, pre, value)
            except (TypeError, ValueError) as exc:
                push(op.line, "fail", claim, injective, "no", value, str(exc))
                halted = True

    final_c = canon(value)
    lines = [
        VERSION,
        f"baseline {BASELINE}",
        f"input_sha256 {input_sha}",
    ]
    for s in steps:
        lines.append(
            f"step|{s.status}|{s.claim}|{s.injective}|{s.sidecar}|{s.out_sha}|{s.chain}|{s.line}|{s.note}"
        )
    lines.append(f"final {sha256_hex(final_c)}")
    lines.append(f"halted {1 if halted else 0}")
    body = "\n".join(lines) + "\n"
    return RunResult(
        steps=steps,
        halted=halted,
        value=value,
        receipt_body=body,
        receipt_sha256=sha256_hex(body),
        input_sha256=input_sha,
        final_canon=final_c,
        parse_errors=errors,
    )
