// Quality gates the pipeline enforces. Policy numbers live here and nowhere else, so a
// wrong gate fails a test rather than a user.
// Calibrated from real measurement (ticket #7 ratifies the value).

/** An entry is flagged needs_review when its LOWEST cited word confidence falls below this.
 *  Deliberately the min, not the mean: one garbage word must not be diluted by its neighbours. */
export const LOW_CONFIDENCE_WORD = 0.85;

/** Minimum share of printed entries the pipeline must reconstruct exactly (all fields, after
 *  normalisation) before the POC gate passes. Ratified by the first real measurement (#8). */
export const ENTRY_ACCURACY_MIN = 0.95;
