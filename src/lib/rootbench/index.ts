/**
 * RootBench — public API
 */

export {
  ROOTBENCH_VERSION,
  CORPUS_VERSION,
  type Register,
  type Verdict,
  type LexAnnotation,
  type SemanticStructure,
  type BenchCase,
  type CaseResult,
  type BenchReport,
} from "./types.ts";

export { LEXICON, lookupSurface, annotateText, toAnnotation, simpleTokenize } from "./lexicon.ts";
export { CASES, getCorpus, getCaseById } from "./corpus.ts";
export { evaluateCase, runBenchmark, canonicalJson } from "./evaluator.ts";
