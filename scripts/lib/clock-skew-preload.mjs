// A preload that makes this process's clock run `SKEW_MS` milliseconds away from the machine's — as a container whose
// clock drifted would (C4 ruling 162, MON-06). `Date.now()` and `new Date()` with no argument both move; a Date built from
// an explicit value does not. Used only by case harnesses: `node --import ./scripts/lib/clock-skew-preload.mjs …`.
const skew = Number(process.env.SKEW_MS ?? 0);
if (Number.isFinite(skew) && skew !== 0) {
  const RealDate = Date;
  const realNow = RealDate.now.bind(RealDate);
  class SkewedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(realNow() + skew);
      else super(...args);
    }
    static now() {
      return realNow() + skew;
    }
  }
  globalThis.Date = SkewedDate;
}
