// Cross-record invariants run OUTSIDE Zod (Zod validates one record at a time,
// docs 9). The key check is alphabetical-order continuity across the corpus
// (docs 6), which MUST tolerate runover continuations.
import type { Entry } from "../types.js";

export interface OrderViolation {
  index: number;
  prev: string;
  curr: string;
}

/** Flags entries whose normalized headword sorts before the previous one.
 *  Continuations (is_continuation) are skipped: an entry spilling from the prior
 *  page is not an ordering violation. */
export function checkAlphabeticalContinuity(entries: Entry[]): OrderViolation[] {
  const violations: OrderViolation[] = [];
  let prev: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e === undefined || e.is_continuation) continue;
    if (prev !== null && e.headword_normalized < prev) {
      violations.push({ index: i, prev, curr: e.headword_normalized });
    }
    prev = e.headword_normalized;
  }
  return violations;
}
