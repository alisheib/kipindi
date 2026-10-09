// Which scale figures the old dial draws after R4-I, per track width (320/360/390 phones, the 1280 rail), and their size.
const { dialScale } = await import("file:///F:/kipindi-r4i/src/components/markets/dial-scale.ts");
for (const [name, w] of [["320", 238], ["360", 278], ["390", 308], ["1280", 294]] as const) {
  const s = dialScale({ width: w, pad: 40, knobR: 28, baseStake: 1000, maxMultiplier: 1000 });
  const scale = w / (w + 80);
  const yes = s.ticks.filter((t) => t.side === "YES" && t.label).map((t) => t.label);
  const no = s.ticks.filter((t) => t.side === "NO" && t.label).map((t) => t.label);
  console.log(`${name}: track ${w} · figures ${(s.fontSize * scale).toFixed(1)}px rendered · YES side [${yes.join(" ")}] · NO side [${no.join(" ")}] · ticks ${s.ticks.length}`);
}
