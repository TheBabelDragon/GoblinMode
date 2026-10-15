/**
 * RootBench types — semantic-integrity benchmark for Hebrew triliteral morphology
 * and translation drift. Versioned independently of BabelPipe.
 */

export const ROOTBENCH_VERSION = "rootbench/0.1.0";
export const CORPUS_VERSION = "corpus/0.1.0";

/** Register label for a lexical form. */
export type Register = "biblical" | "modern" | "shared" | "uncertain";

/** Final verdict for a benchmark case. */
export type Verdict = "PASS" | "FAIL" | "INDETERMINATE";

/** Structured annotation of a single lexical occurrence. */
export type LexAnnotation = {
  surface: string;
  lemma?: string;
  root?: string; // triliteral, e.g. "כתב"
  pattern?: string; // binyan / mishkal, e.g. "qal", "pi'el"
  pos?: string;
  features?: string[]; // e.g. ["3ms", "perfect"]
  sense?: string;
  register: Register;
  confidence: number; // 0..1
  provenance: string; // "curated" | "unknown" | ...
};

/** Role in a semantic proposition. */
export type Role =
  | "agent"
  | "patient"
  | "theme"
  | "experiencer"
  | "location"
  | "instrument"
  | "beneficiary"
  | "other";

/** A single predicate argument. */
export type Arg = {
  role: Role;
  entity: string;
  features?: string[];
};

/** Explicit semantic structure expected or observed. */
export type SemanticStructure = {
  /** Core proposition in a controlled English gloss for comparison. */
  proposition: string;
  /** Named entities involved. */
  entities: string[];
  /** Predicates with their arguments. */
  predicates: { name: string; args: Arg[] }[];
  /** Whether the main claim is negated. */
  negated: boolean;
  /** Modality if present: obligation, permission, ability, necessity, etc. */
  modality?: string;
  /** Causal / discourse links. */
  causal?: { from: string; to: string; type: "cause" | "therefore" | "despite" }[];
  /** Obligations / permissions / refusals. */
  deontic?: { type: "obligation" | "permission" | "prohibition" | "refusal"; target: string }[];
  /** Quantities, comparisons, named entities that must be preserved. */
  quantifiers?: string[];
  /** Free-form notes for inspectors. */
  notes?: string[];
};

/** A single benchmark case. */
export type BenchCase = {
  id: string;
  version: string;
  category: "root-morph" | "semantic" | "register" | "roundtrip" | "adversarial";
  title: string;
  /** Source text (Hebrew or English depending on direction). */
  source: string;
  sourceLang: "he" | "en" | "tl"; // tl = transliteration
  /** Reference / candidate translation or analysis target. */
  candidate: string;
  candidateLang: "he" | "en" | "tl";
  /** Expected semantic structure of the SOURCE. */
  expected: SemanticStructure;
  /** Optional curated lexical annotations for the source. */
  lexicon?: LexAnnotation[];
  /** Register of the source material. */
  register: Register;
  /** Human-readable notes / why this case exists. */
  notes?: string;
  /** Tags for filtering. */
  tags?: string[];
};

/** Result of analyzing one case. */
export type CaseResult = {
  id: string;
  version: string;
  verdict: Verdict;
  /** Separate scores (0..1 or null when indeterminate). */
  scores: {
    rootCoverage: number | null;
    morphCoverage: number | null;
    propositionPreservation: number | null;
    roundTripDrift: number | null;
  };
  violations: string[];
  uncertainty: string[];
  observed?: SemanticStructure;
  analysis?: LexAnnotation[];
  evaluatorVersion: string;
  durationMs?: number;
};

/** Aggregate report. */
export type BenchReport = {
  evaluatorVersion: string;
  corpusVersion: string;
  timestamp: string;
  casesProcessed: number;
  passed: number;
  failed: number;
  indeterminate: number;
  totalMs: number;
  casesPerSecond: number;
  rootCoverageAvg: number | null;
  results: CaseResult[];
  /** SHA-256 of the canonical corpus JSON (integrity, not authorship). */
  corpusDigest?: string;
  /** SHA-256 of the canonical results (same). */
  resultsDigest?: string;
};
