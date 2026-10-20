/** Named restored-gold plants for the visual-pass-r5c physical red proof. */
export const MUTATIONS = [
  {
    name: "mark loses its gilt centre", file: "src/lib/brand-mark.ts",
    from: 'gold: "#E3BC66",', to: 'gold: "#F7F8FC",', expected: "1.0",
  },
  {
    name: "extra unruled gold CSS exceeds the exact census", file: "src/app/globals.css",
    from: ".kp-bsheet__rails {", to: ".unearned-sheet-words { color: var(--gold-300); }\n.kp-bsheet__rails {", expected: "1.2",
  },
  {
    name: "shared bar loses gilt", file: "src/app/globals.css",
    from: "--bar-needle:           var(--gilt);", to: "--bar-needle:           var(--text);", expected: "2.8",
  },
  {
    name: "low-balance deposit rails lose gold", file: "src/app/globals.css",
    from: ".kp-bsheet__rails { font-size: var(--type-small); font-weight: 500; line-height: 1.5; color: var(--gold-fg); }",
    to: ".kp-bsheet__rails { font-size: var(--type-small); font-weight: 500; line-height: 1.5; color: var(--pearl-50); }", expected: "1.3d CONTROL",
  },
];
