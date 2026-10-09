import { registerHooks } from "node:module";
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (/\/src\/lib\/server\/market-service\.ts(\?|$)/.test(url)) {
      const src = result.source.toString();
      const i = src.indexOf("const opposite");
      console.log(`[probe] format=${result.format} len=${src.length} idx=${i}`);
      console.log(JSON.stringify(src.slice(Math.max(0, i - 80), i + 200)));
    }
    return result;
  },
});
