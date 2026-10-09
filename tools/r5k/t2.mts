import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const { formatTzsCompact, formatTzsAbs, formatTzsSigned } = req("F:/kipindi-r5k/src/lib/utils.ts");
for (const v of [500, 1000, 2500, 5000, 12500, 25000, 100000, 1250000]) console.log(v, JSON.stringify(formatTzsCompact(v)), JSON.stringify(formatTzsAbs(v)), JSON.stringify(formatTzsSigned(v)));
const { maskPhone } = req("F:/kipindi-r5k/src/lib/phone-normalize.ts");
console.log(maskPhone("+255712345621"));
