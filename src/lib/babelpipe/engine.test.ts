import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { assertUniqueAngelicSums, englishPreimages, runPipeline, sha256Hex } from "./engine.ts"

const vectors = JSON.parse(readFileSync(new URL("./receipt-vectors.json", import.meta.url), "utf8")) as {
  cases: { name: string; program: string; input: string; receipt: string; halted: boolean }[]
}

test("sha256 known answers", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  assert.equal(sha256Hex("העללו"), "6c47c22e0d41e8d46e3f20068d7c016f5782e56ec49a1ccb119d40e21d2cc766")
})

test("default angelic sums are unique", () => {
  assert.doesNotThrow(() => assertUniqueAngelicSums())
})

test("receipts match regenerated vectors (v0.2.0 claim/check/truth)", () => {
  for (const c of vectors.cases) {
    const got = runPipeline(c.program, c.input)
    assert.equal(got.halted, c.halted, c.name)
    assert.equal(got.receiptBody, c.receipt, c.name)
  }
})

test("english preimages of קס include X and QS", () => {
  const found = englishPreimages("קס", 3)
  assert.deepEqual(found.sort(), ["QS", "X"])
  for (const word of found) {
    assert.equal(runPipeline("TRANSLITERATE", word).finalPreview, "קס")
  }
})

test("MELT is a labeled lie: claim yes, truth not-injective, status lie", () => {
  const got = runPipeline("MELT\nASSERT_REVERSIBLE\nRECEIPT", "שלום")
  const melt = got.steps.find((s) => s.line === "MELT")!
  assert.equal(melt.status, "lie")
  assert.equal(melt.claim, "yes")
  assert.equal(melt.injective, "no")
  assert.equal(melt.truth, "not-injective")
  assert.equal(melt.check, "sidecar-stashed")
  assert.ok(melt.witnessSha.length === 64)
  const asrt = got.steps.find((s) => s.line === "ASSERT_REVERSIBLE")!
  assert.equal(asrt.status, "lie")
  assert.equal(asrt.check, "sidecar-match")
  assert.match(asrt.note, /lie:/)
})

test("ENCODE assert remains ok: pure inverse of public output", () => {
  const got = runPipeline("ENCODE\nASSERT_REVERSIBLE", "א")
  const asrt = got.steps.find((s) => s.line === "ASSERT_REVERSIBLE")!
  assert.equal(asrt.status, "ok")
  assert.equal(asrt.check, "pure-inverse")
  assert.equal(asrt.truth, "injective")
})

test("FORGE_PAIR is a labeled lie", () => {
  const got = runPipeline("ENCODE\nFORGE_PAIR\nASSERT_REVERSIBLE\nDECODE", "א")
  const forge = got.steps.find((s) => s.line === "FORGE_PAIR")!
  assert.equal(forge.status, "lie")
  assert.equal(forge.claim, "yes")
  assert.equal(forge.truth, "not-injective")
  const asrt = got.steps.find((s) => s.line === "ASSERT_REVERSIBLE")!
  assert.equal(asrt.status, "lie")
})
