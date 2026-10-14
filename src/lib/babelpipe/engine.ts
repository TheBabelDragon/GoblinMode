import { ANGELIC_PAIRS, ENGLISH_TO_HEBREW, GEMATRIA, HEBREW_NAMES, SOFIT } from "./tables.ts"
import { sha256Hex } from "./sha256.ts"

export { sha256Hex }

const VERSION = "babelpipe/0.2.0"
const BASELINE = "387d8dfbfe70ac7790e4ca73354aa1fbc6661d95"
const FORMS = new Set(["NFC", "NFD", "NFKC", "NFKD"])

const LETTER_TO_SUM: Record<string, string> = {}
const SUM_TO_LETTER: Record<string, string> = {}
const SUM_COLLISIONS: string[] = []
for (const [letter, pair] of Object.entries(ANGELIC_PAIRS)) {
  const sum = String(GEMATRIA[pair[0]] + GEMATRIA[pair[1]])
  LETTER_TO_SUM[letter] = sum
  if (sum in SUM_TO_LETTER && SUM_TO_LETTER[sum] !== letter) {
    SUM_COLLISIONS.push(`${sum}:${SUM_TO_LETTER[sum]}/${letter}`)
  }
  SUM_TO_LETTER[sum] = letter
}
/** Default tables must be bijective on sums. Colliding custom tables are a constructor bug, not a feature. */
export function assertUniqueAngelicSums(): void {
  if (SUM_COLLISIONS.length) {
    throw new Error(`angelic sum collisions (not unique): ${SUM_COLLISIONS.join(", ")}`)
  }
}
assertUniqueAngelicSums()

// See local build artifacts — full engine body continues below after tables load.
// TEMP: redirect to re-import will fail. Use full file from commit pipeline.
export type StepView = {
  line: string
  status: "ok" | "fail" | "warn" | "info" | "lie"
  claim: string
  injective: string
  check: string
  truth: string
  sidecar: string
  witnessSha: string
  outSha: string
  chain: string
  note: string
  preview: string
  glyphs: any[]
}

export function runPipeline(program: string, text: string): any {
  throw new Error("engine body incomplete — re-push full file from local engine.ts")
}

export function parseProgram(src: string): any {
  return { ops: [], errors: ["engine incomplete"] }
}

export function englishPreimages(target: string, maxLen = 3): string[] {
  return []
}
