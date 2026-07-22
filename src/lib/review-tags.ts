/**
 * Quick review tags — the tap-able compliments/issues the best rating flows
 * use (Uber, Urban Company, DoorDash). Tapping a tag is far faster than typing,
 * so more customers leave a review, and the result is structured signal the
 * worker profile and the quality team can actually act on.
 *
 * Pure and framework-free so it's unit-tested; the rating sheet renders the set
 * that matches the stars given.
 */
export const POSITIVE_TAGS = [
  "On time",
  "Neat work",
  "Polite",
  "Skilled",
  "Fair price",
  "Came prepared",
] as const;

export const ISSUE_TAGS = [
  "Arrived late",
  "Work incomplete",
  "Rude behaviour",
  "Overcharged",
  "Poor quality",
  "Left a mess",
] as const;

/** The tag set to offer for a given star rating — compliments for 4–5★, areas
 * to improve for 1–3★. */
export function tagsForRating(rating: number): readonly string[] {
  return rating >= 4 ? POSITIVE_TAGS : ISSUE_TAGS;
}
