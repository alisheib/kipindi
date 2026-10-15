# Site fonts

These 15 WOFF2 subset files are the exact Sora, Inter, and JetBrains Mono files emitted by the successful production build of commit `20c49f568834c4257d2fd671a9b148cab1ca66dc`. `src/app/fonts.css` preserves that build's font-face order, individual weights, unicode ranges, display mode, and fallback metrics. The root layout preloads only the three Latin files, as before. File names include content hashes and are immutable.

We vendor the fonts because Next.js 16.4.0 can fail a build when Google Fonts intermittently returns an extensionless Inter URL with query parameters. See [Next.js issue 99114](https://github.com/vercel/next.js/issues/99114). This removes the network response from the build path without changing the font files seen by the browser.

The files are distributed under the SIL Open Font License 1.1. The corresponding license texts are `OFL-sora.txt`, `OFL-inter.txt`, and `OFL-jetbrainsmono.txt`, copied from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl).
