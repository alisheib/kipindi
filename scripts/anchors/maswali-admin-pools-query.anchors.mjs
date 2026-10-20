// Shared disk plants for the pools query behavior proof and test:red-anchors.
// The red runner imports these exact anchors, so the audit certifies what it injects.
export const MUTATIONS = [
  {
    name: "open-week code lookup",
    file: "src/lib/maswali-admin-pools-query.ts",
    from: '(!code || w.row.code.toLocaleUpperCase("en").includes(code))',
    to: 'true',
    failure: /open code lookup searches all weeks before paging/,
  },
  {
    name: "trail line filter",
    file: "src/lib/maswali-admin-pools-query.ts",
    from: '(query.line === "ALL" || w.visibility === query.line) &&\n    (!code || w.code.toLocaleUpperCase("en").includes(code))',
    to: 'true &&\n    (!code || w.code.toLocaleUpperCase("en").includes(code))',
    failure: /trail line filter keeps only the requested line/,
  },
  {
    name: "scalar URL controls",
    file: "src/lib/maswali-admin-pools-query.ts",
    from: 'typeof raw[key] === "string" ? raw[key] : undefined',
    to: 'raw[key] as string | undefined',
    failure: /repeated or unknown URL controls cannot crash or leak into pools links/,
  },
];
