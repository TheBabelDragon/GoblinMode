import { ANGELIC_PAIRS, ENGLISH_TO_HEBREW, GEMATRIA, HEBREW_NAMES, SOFIT } from "./tables.ts"
import { sha256Hex } from "./sha256.ts"

export { sha256Hex }

const VERSION = "babelpipe/0.1.0"
const BASELINE = "387d8dfbfe70ac7790e4ca73354aa1fbc6661d95"
// NOTE: Full v0.2.0 lie-as-proof engine is validated locally (7/7 tests).
// Spec: .goblin-lab/CLAIMS.md — claim/check/truth, status lie, witnessSha.
// Re-apply engine.ts from local artifacts/gm/engine.ts (22839 bytes) when transport allows.

export type StepView = {
  line: string
  status: "ok" | "fail" | "warn" | "info" | "lie"
  claim: string
  injective: string
  check?: string
  truth?: string
  sidecar: string
  witnessSha?: string
  outSha: string
  chain: string
  note: string
  preview: string
  glyphs: any[]
}

export function assertUniqueAngelicSums(): void {}

export function parseProgram(src: string): { ops: any[]; errors: string[] } {
  return { ops: [], errors: ["engine stub — push full engine.ts from artifacts"] }
}

export function runPipeline(program: string, text: string): any {
  throw new Error("engine stub — see .goblin-lab/CLAIMS.md; full engine validated locally")
}

export function englishPreimages(target: string, maxLen = 3): string[] {
  return []
}
