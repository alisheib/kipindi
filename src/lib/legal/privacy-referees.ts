/**
 * ⛔ THE PRIVACY VERSION THAT CHANGED WHAT AGENT REFEREES ARE TOLD — the line between the two promises /legal/privacy §9
 * states (Ali's Q8 of 2026-10-07, COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone with a phone — consent
 * is not a condition"; the words, § "2026-10-07 · Privacy v2026-10-07").
 *
 * Every referee named BEFORE this version was told "we never contact you for marketing", and that promise stands for
 * them; a referee named AFTER it is told "50pick may send you offers by SMS." (management's item 4). The page prints this
 * label in §9 and in §5's bullet about the coded referee numbers, in all three languages, from this ONE constant.
 *
 * ⛔ SET IT AT INTEGRATION to the version /legal/privacy prints when the re-worded §9 first goes live (the version label,
 * not the code's: a policy line saved the same EAT day makes the page print a `.2`), and NEVER move it afterwards — later
 * versions of the notice keep naming this one, because the old promise was made to everyone named before it. The
 * final-rule gate's referee cutoff is the INSTANT that same version first went live. `test:privacy-notice` §4k holds the
 * label to a COMPLIANCE-DECISIONS "Privacy v…" heading and to a version the page has printed (never a later one).
 *
 * Pure and import-free, so the page and the suites read the same value.
 */
export const REFEREE_PROMISE_REWORDED_IN = "2026-10-07";
