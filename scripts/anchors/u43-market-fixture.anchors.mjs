/** U43 Chinese local-market fixture mutation plants. */
export const MUTATIONS = [
  { name: "seed market lacks Chinese title", file: "src/lib/server/market-service.ts", from: 'titleZh: "月底前坦桑尼亚先令兑美元会升值吗？",', to: "", expected: "1.2" },
  { name: "seed Chinese title is an English copy", file: "src/lib/server/market-service.ts", from: 'titleZh: "月底前坦桑尼亚先令兑美元会升值吗？",', to: 'titleZh: "Will the TZS strengthen against the USD by month-end?",', expected: "1.2" },
  { name: "catalogue seed route opens in production", file: "src/app/api/dev-test/seed-markets/route.ts", from: 'if (process.env.NODE_ENV === "production") {', to: 'if (false) {', expected: "2.1" },
  { name: "resolution fixture route opens in production", file: "src/app/api/dev-test/resolve-seed-markets/route.ts", from: 'if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false }, { status: 404 });', to: 'if (false) return NextResponse.json({ ok: false }, { status: 404 });', expected: "2.3" },
];
