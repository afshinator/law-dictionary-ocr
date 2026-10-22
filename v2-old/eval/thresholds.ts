// ============================================================================
//  QUALITY THRESHOLDS  --  edit here; nothing is set in stone.
//  These are consts on purpose: one obvious place, easy to change, alternatives
//  in comments. NONE of the gate values are authoritative yet -- they are
//  PROVISIONAL and must be calibrated from the first real measurement (backlog T5),
//  not trusted as-is.
// ============================================================================

// --- Phase-2 gate: entry reconstruction ------------------------------------
// PROVISIONAL. Cannot be derived from v1 data (no ground truth exists yet -- that
// is T4). Ratify against T5's first measured baseline.
// Alternatives to consider once measured: 0.90 (lenient) / 0.98 (strict).
export const ENTRY_RECONSTRUCTION_ACCURACY_MIN = 0.95;

// --- Phase-2 gate: Persian character error rate ----------------------------
// PROVISIONAL, same reasoning. Alternatives: 0.01 (strict) / 0.05 (lenient).
export const PERSIAN_CER_MAX = 0.02;

// --- Phase-3 gate: share of records flagged for human review ---------------
// PROVISIONAL [verify in T10]. Alternatives: 0.10 (strict) / 0.20 (lenient).
export const NEEDS_REVIEW_RATE_MAX = 0.15;

// --- needs_review confidence cutoff (DATA-INFORMED, page 05) ----------------
// This one IS grounded: page-05 word-confidence distribution was mean 0.956,
// median 0.987, with ~7% of words below 0.80 (the natural error tail). Flagging
// entries whose mean confidence falls below this routes that tail to review
// without drowning reviewers in false positives.
// Alternatives: 0.70 (flag fewer, ~3%) / 0.90 (flag more, ~11%).
export const LOW_CONFIDENCE_WORD = 0.80;