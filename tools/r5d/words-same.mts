import { NOT_FOUND_WORDS as A, notFoundTitle as ta } from "file:///C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5d/not-found-view.base.tsx";
import { NOT_FOUND_WORDS as B, notFoundTitle as tb } from "file:///F:/kipindi-r5d/src/components/ui/not-found-words.ts";
const same = JSON.stringify(A) === JSON.stringify(B) && (["sw", "en", "zh"] as const).every((l) => ta(A[l]) === tb(B[l]));
console.log(same ? "words and titles IDENTICAL to the base view's" : "DIFFERENT"); process.exit(same ? 0 : 1);
