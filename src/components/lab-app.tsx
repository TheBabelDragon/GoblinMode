import { useMemo, useState, type ReactNode } from "react"
import { Fingerprint, FlaskConical, ShieldAlert } from "lucide-react"
import { englishPreimages, runPipeline, type StepView } from "@/lib/babelpipe/engine"
import { FINDINGS, type Verdict } from "@/lib/babelpipe/findings"
import { SAMPLES } from "@/lib/babelpipe/samples"

type Tab = "bench" | "graveyard" | "ledger"

function shortHex(hex: string): string {
  return hex.slice(0, 16)
}

function statusClass(status: string): string {
  if (status === "fail" || status === "warn") return "border-accent text-accent"
  return "border-line text-muted"
}

export function LabApp() {
  const opening = SAMPLES[0]
  const [tab, setTab] = useState<Tab>("bench")
  const [sampleId, setSampleId] = useState(opening.id)
  const [program, setProgram] = useState(opening.program)
  const [input, setInput] = useState(opening.input)
  const [compare, setCompare] = useState(Boolean(opening.shadow))
  const [shadow, setShadow] = useState(opening.shadow ?? "")
  const [stepIx, setStepIx] = useState(0)
  const [glyphIx, setGlyphIx] = useState(0)
  const [preimages, setPreimages] = useState<string[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => runPipeline(program, input), [program, input])
  const shadowResult = useMemo(
    () => (compare ? runPipeline(program, shadow) : null),
    [compare, program, shadow],
  )

  const traceKey = `${program}\0${input}`
  const [seenKey, setSeenKey] = useState(traceKey)
  if (seenKey !== traceKey) {
    setSeenKey(traceKey)
    let pick = Math.max(0, result.steps.length - 1)
    for (let i = result.steps.length - 1; i >= 0; i -= 1) {
      if (result.steps[i].glyphs.length > 0) {
        pick = i
        break
      }
    }
    setStepIx(pick)
    setGlyphIx(0)
    setPreimages(null)
  }

  function loadSample(id: string) {
    const sample = SAMPLES.find((s) => s.id === id)
    if (!sample) return
    setSampleId(sample.id)
    setProgram(sample.program)
    setInput(sample.input)
    setShadow(sample.shadow ?? "")
    setCompare(Boolean(sample.shadow))
    setTab("bench")
  }

  const step = result.steps[stepIx]
  const glyphs = step?.glyphs ?? []
  const glyph = glyphs[glyphIx]
  const source = Array.from(input)
  const sameArtifact =
    shadowResult !== null && input !== shadow && result.finalCanon === shadowResult.finalCanon

  function scanPreimages() {
    const target = glyphs.map((g) => g.text).join("")
    if (!target || Array.from(target).length > 8) {
      setPreimages([])
      return
    }
    setScanning(true)
    window.setTimeout(() => {
      setPreimages(englishPreimages(target, 3))
      setScanning(false)
    }, 20)
  }

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(result.receiptBody)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="h-1 bg-accent" />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-widest text-accent">GOBLIN LAB</p>
              <h1 className="font-display text-4xl text-balance">BabelPipe</h1>
            </div>
            <p className="max-w-xs font-mono text-xs text-muted md:text-right">
              BabelForge 387d8df
              <br />
              126 tests passed
              <br />
              a separate experiment
            </p>
          </div>
          <p className="max-w-2xl font-display text-lg text-pretty text-muted">
            Compose transliteration, angelic encoding, and hashes. The bench records which steps are reversible, which only pretend, and which distinct sources collapse.
          </p>
          <nav className="flex flex-wrap gap-2" aria-label="Sections">
            <TabButton current={tab} id="bench" label="Bench" icon={<FlaskConical className="size-4" />} onSelect={setTab} />
            <TabButton current={tab} id="graveyard" label="Graveyard" icon={<ShieldAlert className="size-4" />} onSelect={setTab} />
            <TabButton current={tab} id="ledger" label="Ledger" icon={<Fingerprint className="size-4" />} onSelect={setTab} />
          </nav>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 md:px-6">
        {tab === "bench" ? (
          <div className="flex flex-col gap-6">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[16rem_1fr]">
              <aside className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                <p className="font-mono text-xs tracking-widest text-muted">CASES</p>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample.id)}
                    className={
                      "min-h-11 shrink-0 border px-3 py-2 text-left lg:shrink " +
                      (sample.id === sampleId ? "border-accent bg-raised" : "border-line bg-surface")
                    }
                  >
                    <span className="block font-display text-base">{sample.title}</span>
                    <span className="font-mono text-xs text-muted">{sample.group}</span>
                  </button>
                ))}
              </aside>

              <div className="flex min-w-0 flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-xs tracking-widest text-muted">PROGRAM</span>
                  <textarea
                    value={program}
                    onChange={(e) => {
                      setSampleId("")
                      setProgram(e.target.value)
                    }}
                    spellCheck={false}
                    className="min-h-40 w-full resize-y border border-line bg-surface p-3 font-mono text-sm leading-relaxed text-fg"
                    aria-label="BabelPipe program"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-xs tracking-widest text-muted">SOURCE</span>
                    <textarea
                      value={input}
                      onChange={(e) => {
                        setSampleId("")
                        setInput(e.target.value)
                      }}
                      dir="auto"
                      spellCheck={false}
                      className="min-h-24 w-full resize-y border border-line bg-surface p-3 font-display text-xl text-fg"
                      aria-label="Source text"
                    />
                    <span className="font-mono text-xs text-muted tabular-nums" title={result.inputSha256}>
                      input {shortHex(result.inputSha256)}
                    </span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs tracking-widest text-muted">SHADOW</span>
                      <button
                        type="button"
                        className="min-h-11 border border-line px-3 font-mono text-xs"
                        onClick={() => setCompare((v) => !v)}
                        aria-pressed={compare}
                      >
                        {compare ? "Hide shadow" : "Compare a second source"}
                      </button>
                    </div>
                    {compare ? (
                      <>
                        <textarea
                          value={shadow}
                          onChange={(e) => setShadow(e.target.value)}
                          dir="auto"
                          spellCheck={false}
                          className="min-h-24 w-full resize-y border border-line bg-surface p-3 font-display text-xl text-fg"
                          aria-label="Shadow source"
                        />
                        <span className="font-mono text-xs text-muted tabular-nums" title={shadowResult?.inputSha256}>
                          input {shadowResult ? shortHex(shadowResult.inputSha256) : ""}
                        </span>
                      </>
                    ) : (
                      <p className="border border-dashed border-line p-3 text-sm text-muted">
                        A second source runs the same program, so collisions are visible instead of theoretical.
                      </p>
                    )}
                  </div>
                </div>

                {sameArtifact ? (
                  <div className="border border-accent bg-raised px-4 py-3">
                    <p className="font-mono text-xs tracking-widest text-accent">SAME ARTIFACT</p>
                    <p className="font-display text-xl text-balance">The sources differ. This pipeline forgot the difference.</p>
                    <p className="mt-1 text-sm text-pretty text-muted">
                      Input digests differ. The canonical output does not. A shared hash here is the hash of one result, not a collision inside SHA-256.
                    </p>
                  </div>
                ) : null}

                <div className="border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-xs tracking-widest text-muted">RESULT</p>
                    <p className="font-mono text-xs text-muted">{result.halted ? "halted" : "ran"} · {result.finalKind}</p>
                  </div>
                  <p
                    dir="auto"
                    className={
                      "mt-2 break-all leading-tight " +
                      (result.finalKind === "digest" ? "font-mono text-sm" : "font-display text-3xl")
                    }
                  >
                    {result.finalPreview || "∅"}
                  </p>
                  {shadowResult ? (
                    <p dir="auto" className="mt-2 break-all font-mono text-sm text-muted">
                      shadow {shadowResult.finalPreview || "∅"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <section className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-mono text-xs tracking-widest text-muted">TRACE</p>
                <ol className="flex flex-col gap-2">
                  {result.steps.map((s, i) => (
                    <li key={`${s.line}-${i}`}>
                      <StepButton step={s} index={i} active={i === stepIx} onSelect={() => { setStepIx(i); setGlyphIx(0); setPreimages(null) }} />
                    </li>
                  ))}
                </ol>
              </div>
              <div className="min-w-0 border border-line bg-surface p-4">
                <p className="font-mono text-xs tracking-widest text-muted">PROVENANCE</p>
                {glyphs.length === 0 ? (
                  <p className="mt-3 text-sm text-pretty text-muted">
                    This step has no symbols. A digest or a total cannot point back at the letter that produced it.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                      {glyphs.map((g, i) => (
                        <button
                          key={`${g.rule}-${i}`}
                          type="button"
                          onClick={() => setGlyphIx(i)}
                          className={
                            "min-h-16 min-w-11 shrink-0 border px-2 py-1 " +
                            (i === glyphIx ? "border-accent bg-raised" : "border-line")
                          }
                        >
                          <span className="block font-display text-2xl">{g.text}</span>
                          <span className="block max-w-24 truncate font-mono text-xs text-muted">{g.rule}</span>
                        </button>
                      ))}
                    </div>
                    {glyph ? (
                      <div className="mt-3 flex flex-col gap-2 text-sm">
                        <p>
                          Rule <span className="font-mono text-fg">{glyph.rule}</span>
                          {glyph.sum !== undefined ? (
                            <>
                              {" "}· sum <span className="font-mono">{glyph.sum || "empty"}</span>
                            </>
                          ) : null}
                        </p>
                        {glyph.pair ? (
                          <p className="font-display text-lg" dir="auto">
                            pair {glyph.pair[0] || "·"} {glyph.pair[1] || "·"}
                            {glyph.names ? <span className="ml-2 font-mono text-xs text-muted">{glyph.names[0].join("/")} · {glyph.names[1].join("/")}</span> : null}
                          </p>
                        ) : null}
                        <p className="text-muted">Original characters that fed this symbol:</p>
                        <div className="flex flex-wrap gap-1" dir="auto">
                          {source.map((ch, i) => {
                            const on = glyph.src.includes(i)
                            return (
                              <span
                                key={`${ch}-${i}`}
                                className={
                                  "inline-flex min-h-11 min-w-8 items-center justify-center border px-1 font-display text-lg " +
                                  (on ? "border-accent text-fg" : "border-line text-muted")
                                }
                              >
                                {ch === " " ? "·" : ch === "\n" ? "↵" : ch}
                              </span>
                            )
                          })}
                        </div>
                        {glyph.src.length === 0 ? (
                          <p className="text-muted">No source index was recovered for this symbol.</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        className="min-h-11 self-start border border-line px-3 font-mono text-xs"
                        onClick={scanPreimages}
                        disabled={scanning}
                      >
                        {scanning ? "Scanning English…" : "English preimages, length ≤ 3"}
                      </button>
                      {preimages ? (
                        <p className="font-mono text-sm text-pretty">
                          {preimages.length === 0
                            ? "None at length 1–3. Longer words, case folds, and ligatures are outside this scan."
                            : preimages.join("  ")}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="min-w-0 border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs tracking-widest text-muted">RECEIPT</p>
                <button type="button" className="min-h-11 border border-line px-3 font-mono text-xs" onClick={copyReceipt}>
                  {copied ? "Copied" : "Copy receipt"}
                </button>
              </div>
              <p className="mt-2 text-sm text-pretty text-muted">
                Chains the input digest, each op, and the canonical output. Same text and same program reproduce it. It does not say who ran it, and it cannot recover what a lossy step discarded.
              </p>
              <p className="mt-2 break-all font-mono text-xs text-muted tabular-nums" title={result.receiptSha256}>
                receipt {result.receiptSha256}
              </p>
              <pre className="mt-3 max-h-80 max-w-full overflow-auto border border-line bg-bg p-3 font-mono text-xs leading-5 text-fg">
                {result.receiptBody}
              </pre>
            </section>

            <details className="border border-line p-4">
              <summary className="min-h-11 cursor-pointer font-display text-lg">Operations</summary>
              <ul className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
                <li><span className="font-mono text-fg">TRANSLITERATE</span> — longest English match, not invertible.</li>
                <li><span className="font-mono text-fg">ENCODE / DECODE</span> — sums are unique on the default table. Pairs are not checked.</li>
                <li><span className="font-mono text-fg">NORMALIZE</span> — NFC, NFD, NFKC, NFKD. Not injective.</li>
                <li><span className="font-mono text-fg">FOLD_SOFIT / STRIP_MARKS</span> — honest loss.</li>
                <li><span className="font-mono text-fg">MELT</span> — loss plus a hidden sidecar. The cursed op.</li>
                <li><span className="font-mono text-fg">FORGE_PAIR</span> — destroys pairs, keeps sums.</li>
                <li><span className="font-mono text-fg">GEMATRIA</span> — additive total. אב and ג both make 3.</li>
                <li><span className="font-mono text-fg">HASH</span> — SHA-256 of the current text. Not a signature.</li>
                <li><span className="font-mono text-fg">ASSERT_REVERSIBLE</span> — pure inverse, or a warning if it cheated.</li>
                <li><span className="font-mono text-fg">RECEIPT</span> — seals the trace. Does not change the value.</li>
              </ul>
            </details>
          </div>
        ) : null}

        {tab === "graveyard" ? (
          <div className="flex flex-col gap-4">
            <p className="max-w-2xl font-display text-xl text-pretty">
              Rejected claims, kept as cases. A ridiculous op can stay if the bench describes it accurately.
            </p>
            {SAMPLES.filter((s) => s.group === "graveyard" || s.group === "collision").map((sample) => (
              <article key={sample.id} className="border border-line bg-surface p-4">
                <h2 className="font-display text-2xl">{sample.title}</h2>
                <p className="mt-1 text-sm text-pretty text-muted">{sample.blurb}</p>
                <button
                  type="button"
                  className="mt-3 min-h-11 border border-accent px-3 font-mono text-xs text-accent"
                  onClick={() => loadSample(sample.id)}
                >
                  Run this case
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "ledger" ? (
          <div className="flex flex-col gap-6">
            <p className="max-w-2xl text-sm text-pretty text-muted">
              Checked against the reference cipher and its virtual machine. The software SHA-256 model matches the standard library, including the NIST abc vector. The hardware description was read and its schedule formula was transcribed; it was not simulated.
            </p>
            {(["confirmed", "disproven", "untested"] as Verdict[]).map((verdict) => (
              <section key={verdict}>
                <h2 className="font-mono text-xs tracking-widest text-accent">{verdict}</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {FINDINGS.filter((f) => f.verdict === verdict).map((f) => (
                    <article key={f.id} className="border border-line bg-surface p-4">
                      <h3 className="font-display text-xl text-balance">{f.title}</h3>
                      <p className="mt-1 text-sm text-pretty text-muted">{f.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}

function TabButton({
  current,
  id,
  label,
  icon,
  onSelect,
}: {
  current: Tab
  id: Tab
  label: string
  icon: ReactNode
  onSelect: (id: Tab) => void
}) {
  const on = current === id
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onSelect(id)}
      className={
        "inline-flex min-h-11 items-center gap-2 border px-3 font-mono text-xs " +
        (on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-fg")
      }
    >
      {icon}
      {label}
    </button>
  )
}

function StepButton({
  step,
  index,
  active,
  onSelect,
}: {
  step: StepView
  index: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full min-h-11 flex-col gap-1 border px-3 py-2 text-left " +
        (active ? "border-accent bg-raised" : "border-line bg-surface")
      }
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted">{index + 1}</span>
        <span className="font-mono text-sm text-fg">{step.line}</span>
        <span className={`border px-1.5 font-mono text-xs uppercase ${statusClass(step.status)}`}>{step.status}</span>
      </span>
      <span className="text-sm text-pretty text-muted">{step.note}</span>
      <span className="font-mono text-xs text-muted">
        claim {step.claim} · injective {step.injective}
        {step.sidecar === "yes" ? " · sidecar" : ""}
      </span>
    </button>
  )
}
