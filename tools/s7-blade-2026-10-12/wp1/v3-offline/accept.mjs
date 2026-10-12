// Throwaway: turns the stubbed run's .rejected.json into an "accepted" baseline (scratch only) so the --compare code
// path, the book's §4 included, can be exercised with no server. Also writes a v2-labelled copy and a copy whose book
// normalisers differ, which --compare must refuse.
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL(".", import.meta.url);
const doc = JSON.parse(readFileSync(new URL("stub-base.json.rejected.json", dir), "utf8"));
doc.rejected = false;
writeFileSync(new URL("stub-accepted.json", dir), JSON.stringify(doc));
writeFileSync(new URL("stub-v2.json", dir), JSON.stringify({ ...doc, version: 2 }));
writeFileSync(new URL("stub-norm.json", dir), JSON.stringify({ ...doc, matrix: { ...doc.matrix, book: { ...doc.matrix.book, normalise: ["market-ids"] } } }));
console.log(`version ${doc.version}, book cells ${Object.keys(doc.book ?? {}).length}, matrix.book ${JSON.stringify(doc.matrix.book).slice(0, 200)}`);
