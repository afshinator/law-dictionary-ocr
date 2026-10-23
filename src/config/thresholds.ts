// Quality gates the pipeline enforces. Policy numbers live here and nowhere else, so a
// wrong gate fails a test rather than a user.
// Calibrated from real measurement (ticket #7 ratifies the value).

/** An entry is flagged needs_review when its LOWEST cited word confidence falls below this.
 *  Deliberately the min, not the mean: one garbage word must not be diluted by its neighbours. */
export const LOW_CONFIDENCE_WORD = 0.85;
