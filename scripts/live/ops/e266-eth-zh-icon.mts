/**
 * E-266 ①② — ETH/USD carries `nameZh: null` and `iconKey: "gold"` on production.
 *
 *   DATABASE_URL="$PROD_DATABASE_PUBLIC_URL" npx tsx scripts/live/ops/e266-eth-zh-icon.mts
 *
 * ⛔ THROUGH `updateAsset`, NOT A RAW UPDATE. The asset table is admin-controlled and every
 * officer edit writes an `updown.asset.updated` row into the HMAC audit chain with a full
 * before/after payload. A direct SQL UPDATE would change the same two columns and leave NO
 * audit — the chain would then say nobody ever touched an asset that visibly changed.
 *
 * ⚠️ Only `nameZh` and `iconKey` move, so `sourceChanged` is false and the service's
 * unresolved-rounds refusal (which exists to stop a link moving under staked money) is not
 * engaged. Nothing about price, source, enablement or any running chain is touched.
 *
 * Why it matters: ETH is `enabled: true`, so the Chinese board showed "Ethereum" in Latin
 * between 比特币 and 黄金 while `以太坊` already existed in `updown-symbols.ts`, and every ETH
 * round card wore the **Au** (gold) mark.
 */
import { listAssets, updateAsset } from "../../../src/lib/server/updown-config.ts";

const officerId = process.env.OFFICER_ID;
if (!officerId) { console.error("OFFICER_ID is required — the audit row needs a real actor."); process.exit(2); }

const assets = await listAssets();
const eth = assets.find((a) => a.key === "ETH");
if (!eth) {
  // ⛔ "Not found" has TWO causes and they are not the same answer: the asset is absent, or
  // the READER came back empty (wrong DATABASE_URL, no connection). Say which.
  const keys = assets.map((a) => a.key).join(", ") || "(none)";
  console.error(`ETH not found — listAssets() returned ${assets.length} asset(s): ${keys}`);
  console.error(assets.length === 0
    ? "⛔ ZERO assets — the READER is empty, not the table. Check DATABASE_URL."
    : "The table WAS read, so `key` differs from `symbol`. Match on the right column.");
  process.exit(1);
}

console.log("BEFORE:", JSON.stringify({ key: eth.key, nameZh: eth.nameZh, iconKey: eth.iconKey }));

if (eth.nameZh === "以太坊" && eth.iconKey === "crypto") {
  console.log("Already correct — nothing to do (idempotent).");
  process.exit(0);
}

const r = await updateAsset(eth.id, { nameZh: "以太坊", iconKey: "crypto" }, officerId);
if (!r.ok) { console.error("REFUSED:", r.error); process.exit(1); }

console.log("AFTER :", JSON.stringify({ key: r.data.key, nameZh: r.data.nameZh, iconKey: r.data.iconKey }));
