// Defaults that describe THIS book's page geometry, not the algorithm. They are here, not in
// the parser, because re-scanning or a different edition could change them without any code
// changing meaning.

/** Column boundary assumed when gutter detection finds no confident gap.
 *  Pages are not consistently aligned across capture sessions: page 07 measured ~120px left
 *  of pages 05/06, so this is only a last-resort fallback. */
export const FALLBACK_COLUMN_SPLIT_X = 1100;
