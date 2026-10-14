import { ANGELIC_PAIRS, ENGLISH_TO_HEBREW, GEMATRIA, HEBREW_NAMES, SOFIT } from "./tables.ts"
import { sha256Hex } from "./sha256.ts"

export { sha256Hex }

const VERSION = "babelpipe/0.1.0"
const BASELINE = "387d8dfbfe70ac7790e4ca73354aa1fbc6661d95"
const FORMS = new Set(["NFC", "NFD", "NFKC", "NFKD"])

const LETTER_TO_SUM: Record<string, string> = {}
const SUM_TO_LETTER: Record<string, string> = {}
for (const [letter, pair] of Object.entries(ANGELIC_PAIRS)) {
  const sum = String(GEMATRIA[pair[0]] + GEMATRIA[pair[1]])
  LETTER_TO_SUM[letter] = sum
  SUM_TO_LETTER[sum] = letter
}

const OP_META: Record<string, [string, string, string]> = {
  NORMALIZE: ["no", "no", ""],
  TRANSLITERATE: ["no", "no", ""],
  ENCODE: ["yes", "yes", "DECODE"],
  DECODE: ["no", "no", "ENCODE"],
  HASH: ["no", "no", ""],
  GEMATRIA: ["no", "no", ""],
  FOLD_SOFIT: ["no", "no", ""],
  STRIP_MARKS: ["no", "no", ""],
  MELT: ["yes", "no", "SIDECAR"],
  FORGE_PAIR: ["yes", "no", "REENCODE"],
  ASSERT_REVERSIBLE: ["na", "na", ""],
  RECEIPT: ["na", "na", ""],
}

export type GlyphView = {
  text: string
  rule: string
  src: number[]
  sum?: string
  pair?: [string, string]
  names?: [string[], string[]]
}

export type StepView = {
  line: string
  status: "ok" | "fail" | "warn" | "info"
  claim: string
  injective: string
  sidecar: string
  outSha: string
  chain: string
  note: string
  preview: string
  glyphs: GlyphView[]
}

export type RunResult = {
  steps: StepView[]
  halted: boolean
  receiptBody: string
  receiptSha256: string
  inputSha256: string
  finalCanon: string
  finalPreview: string
  finalKind: string
}

type Glyph = { text: string; rule: string; src: number[] }
type Triple = {
  sum: string
  pair: [string, string]
  names: [string[], string[]]
  src: number[]
  rule: string
}
type Value = {
  kind: "text" | "encoded" | "digest" | "number"
  text: string
  glyphs: Glyph[]
  triples: Triple[]
  hex: string
  number: string
  detail: string
  sidecar: string | null
}

type Parsed = { line: string; op: string; arg: string }

function cps(s: string): string[] {
  return Array.from(s)
}

function dedupe(xs: number[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x)
      out.push(x)
    }
  }
  return out
}

function isMark(ch: string): boolean {
  return /^\p{M}$/u.test(ch)
}

function textValue(s: string, glyphs?: Glyph[], sidecar: string | null = null): Value {
  return {
    kind: "text",
    text: s,
    glyphs: glyphs ?? cps(s).map((ch, i) => ({ text: ch, rule: "source", src: [i] })),
    triples: [],
    hex: "",
    number: "",
    detail: "",
    sidecar,
  }
}

function canon(v: Value): string {
  if (v.kind === "text") return "T\n" + v.text
  if (v.kind === "digest") return "D\n" + v.hex
  if (v.kind === "number") return "N\n" + v.number + "\n" + v.detail
  const rows = v.triples.map((t) =>
    JSON.stringify({ sum: t.sum, pair: [t.pair[0], t.pair[1]], names: [t.names[0], t.names[1]] }),
  )
  return "E\n" + rows.join("\n")
}

function previewOf(v: Value): string {
  if (v.kind === "text") return v.text
  if (v.kind === "digest") return v.hex
  if (v.kind === "number") return v.number + (v.detail ? " " + v.detail : "")
  return v.triples
    .map((t) => (t.sum ? (SUM_TO_LETTER[t.sum] ?? "?") : (t.names[0][0] ?? "?")))
    .join("")
}

function glyphsOf(v: Value): GlyphView[] {
  if (v.kind === "text") {
    return v.glyphs.map((g) => ({ text: g.text, rule: g.rule, src: g.src }))
  }
  if (v.kind === "encoded") {
    return v.triples.map((t) => {
      if (t.sum) {
        return {
          text: SUM_TO_LETTER[t.sum] ?? "?",
          rule: t.rule || "sum:" + t.sum,
          src: t.src,
          sum: t.sum,
          pair: t.pair,
          names: t.names,
        }
      }
      return {
        text: t.names[0][0] ?? "?",
        rule: "passthrough",
        src: t.src,
        sum: t.sum,
        pair: t.pair,
        names: t.names,
      }
    })
  }
  return []
}

function sanitize(s: string): string {
  return s.replaceAll("|", "/").replaceAll("\n", " ").replaceAll("\r", " ")
}

export function parseProgram(src: string): { ops: Parsed[]; errors: string[] } {
  const ops: Parsed[] = []
  const errors: string[] = []
  if (src.trim() === "") return { ops, errors: ["program has no operations"] }
  const lines = src.split("\n")
  lines.forEach((raw, idx) => {
    const n = idx + 1
    const line = raw.trim()
    if (!line || line.startsWith("#")) return
    const parts = line.split(/\s+/)
    const op = parts[0].toUpperCase()
    if (!(op in OP_META)) {
      errors.push(`unknown op ${parts[0]} on line ${n}`)
      return
    }
    if (op === "NORMALIZE") {
      if (parts.length !== 2 || !FORMS.has(parts[1].toUpperCase())) {
        errors.push(`NORMALIZE needs NFC, NFD, NFKC, or NFKD on line ${n}`)
        return
      }
      const form = parts[1].toUpperCase()
      ops.push({ line: `NORMALIZE ${form}`, op, arg: form })
    } else if (parts.length !== 1) {
      errors.push(`extra tokens on line ${n}`)
    } else {
      ops.push({ line: op, op, arg: "" })
    }
  })
  if (ops.length === 0 && errors.length === 0) errors.push("program has no operations")
  return { ops, errors }
}

function consume(stream: { ch: string; src: number[] }[], actual: string, form: string): Glyph[] | null {
  let i = 0
  const out: Glyph[] = []
  for (const ch of cps(actual)) {
    const exp = cps(ch.normalize("NFD"))
    const srcs: number[] = []
    for (const e of exp) {
      if (i >= stream.length || stream[i].ch !== e) return null
      srcs.push(...stream[i].src)
      i += 1
    }
    out.push({ text: ch, rule: `normalize:${form}`, src: dedupe(srcs) })
  }
  if (i !== stream.length) return null
  return out
}

function applyNormalize(v: Value, form: string): Value {
  if (v.kind !== "text") throw new Error(`NORMALIZE expects text, found ${v.kind}`)
  const actual = v.text.normalize(form as "NFC")
  const base = form === "NFKC" || form === "NFKD" ? "NFKD" : "NFD"
  const stream: { ch: string; src: number[] }[] = []
  for (const g of v.glyphs) {
    for (const ch of cps(g.text.normalize(base))) stream.push({ ch, src: g.src })
  }
  const mapped = consume(stream, actual, form)
  const glyphs =
    mapped ?? cps(actual).map((ch) => ({ text: ch, rule: `normalize:${form}:unmapped`, src: [] as number[] }))
  return textValue(actual, glyphs)
}

function applyTransliterate(v: Value): Value {
  if (v.kind !== "text") throw new Error(`TRANSLITERATE expects text, found ${v.kind}`)
  const upper: { ch: string; src: number[] }[] = []
  for (const g of v.glyphs) {
    for (const ch of cps(g.text.toUpperCase())) upper.push({ ch, src: g.src })
  }
  const out: Glyph[] = []
  let i = 0
  while (i < upper.length) {
    if (i + 1 < upper.length) {
      const dig = upper[i].ch + upper[i + 1].ch
      if (dig.length === 2 && Object.prototype.hasOwnProperty.call(ENGLISH_TO_HEBREW, dig)) {
        const heb = ENGLISH_TO_HEBREW[dig]
        const src = dedupe([...upper[i].src, ...upper[i + 1].src])
        for (const ch of cps(heb)) out.push({ text: ch, rule: `digraph:${dig}`, src })
        i += 2
        continue
      }
    }
    const { ch, src } = upper[i]
    if (Object.prototype.hasOwnProperty.call(ENGLISH_TO_HEBREW, ch)) {
      const heb = ENGLISH_TO_HEBREW[ch]
      const rule = cps(heb).length > 1 ? "expand" : "letter"
      for (const h of cps(heb)) out.push({ text: h, rule: `${rule}:${ch}`, src })
    } else {
      out.push({ text: ch, rule: "passthrough", src })
    }
    i += 1
  }
  return textValue(out.map((g) => g.text).join(""), out)
}

function namesOf(ch: string): string[] {
  return HEBREW_NAMES[ch] ? [...HEBREW_NAMES[ch]] : [ch]
}

function applyEncode(v: Value): Value {
  if (v.kind !== "text") throw new Error(`ENCODE expects text, found ${v.kind}`)
  const triples: Triple[] = []
  for (const g of v.glyphs) {
    for (const ch of cps(g.text)) {
      if (Object.prototype.hasOwnProperty.call(ANGELIC_PAIRS, ch)) {
        const pair = ANGELIC_PAIRS[ch]
        const sum = LETTER_TO_SUM[ch]
        triples.push({
          sum,
          pair: [pair[0], pair[1]],
          names: [namesOf(pair[0]), namesOf(pair[1])],
          src: g.src,
          rule: `sum:${sum}`,
        })
      } else {
        triples.push({ sum: "", pair: ["", ""], names: [[ch], [ch]], src: g.src, rule: "passthrough" })
      }
    }
  }
  return {
    kind: "encoded",
    text: v.text,
    glyphs: [],
    triples,
    hex: "",
    number: "",
    detail: "",
    sidecar: null,
  }
}

function applyDecode(v: Value): Value {
  if (v.kind !== "encoded") throw new Error(`DECODE expects encoded state, found ${v.kind}`)
  const glyphs: Glyph[] = []
  for (const t of v.triples) {
    if (t.sum) {
      if (!(t.sum in SUM_TO_LETTER)) throw new Error(`unknown angelic sum: ${t.sum}`)
      glyphs.push({ text: SUM_TO_LETTER[t.sum], rule: `sum:${t.sum}`, src: t.src })
    } else {
      if (!t.names[0]?.length) throw new Error("missing passthrough character")
      glyphs.push({ text: t.names[0][0], rule: "passthrough", src: t.src })
    }
  }
  return textValue(glyphs.map((g) => g.text).join(""), glyphs)
}

function applyFold(v: Value): { value: Value; changed: number } {
  if (v.kind !== "text") throw new Error(`FOLD_SOFIT expects text, found ${v.kind}`)
  const glyphs: Glyph[] = []
  let changed = 0
  for (const g of v.glyphs) {
    if (Object.prototype.hasOwnProperty.call(SOFIT, g.text)) {
      glyphs.push({ text: SOFIT[g.text], rule: "sofit", src: g.src })
      changed += 1
      continue
    }
    let local = 0
    const built: string[] = []
    for (const ch of cps(g.text)) {
      if (Object.prototype.hasOwnProperty.call(SOFIT, ch)) {
        built.push(SOFIT[ch])
        local += 1
      } else built.push(ch)
    }
    const merged = built.join("")
    changed += local
    if (merged === g.text) glyphs.push(g)
    else for (const ch of cps(merged)) glyphs.push({ text: ch, rule: "sofit", src: g.src })
  }
  return { value: textValue(glyphs.map((g) => g.text).join(""), glyphs), changed }
}

function applyStrip(v: Value): { value: Value; removed: number } {
  if (v.kind !== "text") throw new Error(`STRIP_MARKS expects text, found ${v.kind}`)
  const glyphs: Glyph[] = []
  let removed = 0
  for (const g of v.glyphs) {
    const kept = cps(g.text).filter((ch) => !isMark(ch))
    removed += cps(g.text).length - kept.length
    if (kept.length === 0) continue
    if (kept.join("") === g.text) glyphs.push(g)
    else for (const ch of kept) glyphs.push({ text: ch, rule: g.rule, src: g.src })
  }
  return { value: textValue(glyphs.map((g) => g.text).join(""), glyphs), removed }
}

function applyMelt(v: Value): { value: Value; stripped: number; folded: number } {
  if (v.kind !== "text") throw new Error(`MELT expects text, found ${v.kind}`)
  const original = v.text
  const stripped = applyStrip(v)
  const folded = applyFold(stripped.value)
  folded.value.sidecar = original
  return { value: folded.value, stripped: stripped.removed, folded: folded.changed }
}

function applyForge(v: Value): Value {
  if (v.kind !== "encoded") throw new Error(`FORGE_PAIR expects encoded state, found ${v.kind}`)
  return {
    ...v,
    sidecar: null,
    triples: v.triples.map((t) =>
      t.sum
        ? { ...t, pair: ["ת", "ת"] as [string, string], names: [["Nope"], ["Nope"]], rule: "forged" }
        : t,
    ),
  }
}

function applyGematria(v: Value): Value {
  if (v.kind !== "text") throw new Error(`GEMATRIA expects text, found ${v.kind}`)
  let total = 0
  const parts: string[] = []
  for (const ch of cps(v.text)) {
    if (Object.prototype.hasOwnProperty.call(GEMATRIA, ch)) {
      total += GEMATRIA[ch]
      parts.push(`${ch}=${GEMATRIA[ch]}`)
    } else parts.push(`${ch}=?`)
  }
  return {
    kind: "number",
    text: v.text,
    glyphs: [],
    triples: [],
    hex: "",
    number: String(total),
    detail: parts.join("+"),
    sidecar: null,
  }
}

function applyHash(v: Value): { value: Value; note: string } {
  let digest = ""
  let note = ""
  if (v.kind === "text") {
    digest = sha256Hex(v.text)
    note = "sha256 utf-8 of text state; not a signature"
  } else if (v.kind === "encoded") {
    digest = sha256Hex(canon(v))
    note = "sha256 utf-8 of canonical triples; not the hebrew-form checksum"
  } else if (v.kind === "number") {
    digest = sha256Hex(v.number)
    note = "sha256 utf-8 of decimal total; not a signature"
  } else {
    digest = sha256Hex(v.hex)
    note = "sha256 utf-8 of hex digest text; not a signature"
  }
  return {
    value: { kind: "digest", text: "", glyphs: [], triples: [], hex: digest, number: "", detail: "", sidecar: null },
    note,
  }
}

function pureInverse(op: string, post: Value): Value {
  if (op === "ENCODE") return applyDecode(post)
  if (op === "DECODE") return applyEncode(post)
  if (op === "FORGE_PAIR") return applyEncode(applyDecode(post))
  throw new Error(`${op} has no pure inverse`)
}

function countRules(glyphs: Glyph[], prefix: string): number {
  return glyphs.filter((g) => g.rule.startsWith(prefix)).length
}

function noteFor(op: Parsed, after: Value, extra: string): string {
  if (op.op === "NORMALIZE") return `normalize ${op.arg}`
  if (op.op === "TRANSLITERATE") {
    const gs = after.glyphs
    const pass = gs.filter((g) => g.rule === "passthrough").length
    return `transliterate glyphs=${gs.length} digraphs=${countRules(gs, "digraph:")} letters=${countRules(gs, "letter:")} expansions=${countRules(gs, "expand:")} passthrough=${pass}`
  }
  if (op.op === "ENCODE") {
    const known = after.triples.filter((t) => t.sum).length
    return `encode triples=${after.triples.length} known=${known} unknown=${after.triples.length - known}`
  }
  if (op.op === "DECODE") return `decode chars=${cps(after.text).length}`
  if (op.op === "FORGE_PAIR") {
    const forged = after.triples.filter((t) => t.rule === "forged").length
    return `forge pairs replaced=${forged}; sums kept; pairs are not authenticated by DECODE`
  }
  if (op.op === "GEMATRIA") {
    const unknown = after.detail.split("=?").length - 1
    return `gematria total=${after.number} unknown=${unknown} ${after.detail}`
  }
  return extra
}

export function runPipeline(program: string, text: string): RunResult {
  const { ops, errors } = parseProgram(program)
  let value = textValue(text)
  const inputSha256 = sha256Hex(text)
  let chain = inputSha256
  const steps: StepView[] = []
  let halted = false
  let last: { op: string; pre: Value; post: Value } | null = null

  const push = (line: string, status: StepView["status"], claim: string, injective: string, sidecar: string, val: Value, note: string) => {
    const c = canon(val)
    chain = sha256Hex(`${chain}\n${line}\n${status}\n${c}`)
    steps.push({
      line,
      status,
      claim,
      injective,
      sidecar,
      outSha: sha256Hex(c),
      chain,
      note: sanitize(note),
      preview: previewOf(val),
      glyphs: glyphsOf(val),
    })
  }

  if (errors.length) {
    push("PARSE", "fail", "na", "na", "no", value, "parse error: " + errors.join("; "))
    halted = true
  } else {
    for (const op of ops) {
      if (halted) break
      const [claim, injective] = OP_META[op.op]
      if (op.op === "RECEIPT") {
        push(op.line, "info", claim, injective, "no", value, "receipt recorded")
        continue
      }
      if (op.op === "ASSERT_REVERSIBLE") {
        if (!last) {
          push(op.line, "fail", "na", "na", "no", value, "assert failed: no prior transformation")
          halted = true
          continue
        }
        const prev = last
        const inv = OP_META[prev.op][2]
        const metaInj = OP_META[prev.op][1]
        try {
          let restored: Value
          let viaSide = false
          if (inv === "SIDECAR") {
            if (prev.post.sidecar === null) throw new Error("sidecar missing")
            restored = textValue(prev.post.sidecar)
            viaSide = true
          } else {
            restored = pureInverse(prev.op, prev.post)
          }
          if (canon(restored) !== canon(prev.pre)) {
            push(op.line, "fail", "na", "na", "no", value, "assert failed: inverse did not restore the prior state")
            halted = true
            continue
          }
          if (viaSide) {
            push(op.line, "warn", "na", "na", "yes", value, "assert matched sidecar only; MELT is not a function of its output")
            continue
          }
          if (metaInj !== "yes") {
            const notes: Record<string, string> = {
              DECODE: "assert restored this input via ENCODE; DECODE ignores pairs and is not injective",
              FORGE_PAIR: "assert restored this input via sum redundancy; FORGE_PAIR is not injective",
            }
            push(
              op.line,
              "warn",
              "na",
              "na",
              "no",
              value,
              notes[prev.op] ?? `assert restored this input only; ${prev.op} is not injective`,
            )
            continue
          }
          push(op.line, "ok", "na", "na", "no", value, `assert ok via ${inv}`)
        } catch (exc) {
          const msg = exc instanceof Error ? exc.message : String(exc)
          push(op.line, "fail", "na", "na", "no", value, `assert failed: ${msg}`)
          halted = true
        }
        continue
      }

      const pre = value
      try {
        let extra = ""
        let sidecarFlag = "no"
        if (op.op === "NORMALIZE") value = applyNormalize(value, op.arg)
        else if (op.op === "TRANSLITERATE") value = applyTransliterate(value)
        else if (op.op === "ENCODE") value = applyEncode(value)
        else if (op.op === "DECODE") value = applyDecode(value)
        else if (op.op === "FOLD_SOFIT") {
          const folded = applyFold(value)
          value = folded.value
          extra = `fold sofit changed=${folded.changed}`
        } else if (op.op === "STRIP_MARKS") {
          const stripped = applyStrip(value)
          value = stripped.value
          extra = `strip marks removed=${stripped.removed}`
        } else if (op.op === "MELT") {
          const melted = applyMelt(pre)
          value = melted.value
          extra = `melt stripped=${melted.stripped} folded=${melted.folded}; sidecar stashed; not injective`
          sidecarFlag = "yes"
        } else if (op.op === "FORGE_PAIR") value = applyForge(value)
        else if (op.op === "GEMATRIA") value = applyGematria(value)
        else if (op.op === "HASH") {
          const hashed = applyHash(value)
          value = hashed.value
          extra = hashed.note
        } else throw new Error(`unhandled ${op.op}`)
        push(op.line, "ok", claim, injective, sidecarFlag, value, noteFor(op, value, extra))
        last = { op: op.op, pre, post: value }
      } catch (exc) {
        const msg = exc instanceof Error ? exc.message : String(exc)
        push(op.line, "fail", claim, injective, "no", value, msg)
        halted = true
      }
    }
  }

  const finalCanon = canon(value)
  const lines = [VERSION, `baseline ${BASELINE}`, `input_sha256 ${inputSha256}`]
  for (const s of steps) {
    lines.push(`step|${s.status}|${s.claim}|${s.injective}|${s.sidecar}|${s.outSha}|${s.chain}|${s.line}|${s.note}`)
  }
  lines.push(`final ${sha256Hex(finalCanon)}`)
  lines.push(`halted ${halted ? 1 : 0}`)
  const receiptBody = lines.join("\n") + "\n"
  return {
    steps,
    halted,
    receiptBody,
    receiptSha256: sha256Hex(receiptBody),
    inputSha256,
    finalCanon,
    finalPreview: previewOf(value),
    finalKind: value.kind,
  }
}

function transliterateAscii(word: string): string {
  let out = ""
  let i = 0
  while (i < word.length) {
    if (i + 1 < word.length) {
      const dig = word.slice(i, i + 2)
      if (Object.prototype.hasOwnProperty.call(ENGLISH_TO_HEBREW, dig)) {
        out += ENGLISH_TO_HEBREW[dig]
        i += 2
        continue
      }
    }
    const ch = word[i]
    out += Object.prototype.hasOwnProperty.call(ENGLISH_TO_HEBREW, ch) ? ENGLISH_TO_HEBREW[ch] : ch
    i += 1
  }
  return out
}

export function englishPreimages(target: string, maxLen = 3): string[] {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const found: string[] = []
  const n = alphabet.length
  for (let len = 1; len <= maxLen; len++) {
    const idx = new Array<number>(len).fill(0)
    while (true) {
      let word = ""
      for (let i = 0; i < len; i++) word += alphabet[idx[i]]
      if (transliterateAscii(word) === target) found.push(word)
      let k = len - 1
      while (k >= 0) {
        idx[k] += 1
        if (idx[k] < n) break
        idx[k] = 0
        k -= 1
      }
      if (k < 0) break
    }
  }
  return found
}
