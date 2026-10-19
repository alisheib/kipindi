/** Restore a custom dev cache or drop the production cache; the live config guard must catch both. */
const FILE = "next.config.ts";
const guarded = '...(process.env.NODE_ENV === "production" ? IMMUTABLE_STATIC_SOURCES : []).map((source) => ({';

export const MUTATIONS = [
  {
    name: "dev-chunks-become-immutable-again",
    file: FILE,
    suite: "static-cache-scope",
    from: guarded,
    to: '...IMMUTABLE_STATIC_SOURCES.map((source) => ({',
    expect: "FAIL 6.1 · development adds no custom Cache-Control rule",
  },
  {
    name: "production-cache-is-dropped",
    file: FILE,
    suite: "static-cache-scope",
    from: guarded,
    to: '...(process.env.NODE_ENV === "development" ? IMMUTABLE_STATIC_SOURCES : []).map((source) => ({',
    expect: "FAIL 1.locate · production headers() sends the immutable cache",
  },
];
