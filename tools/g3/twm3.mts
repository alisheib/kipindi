// The repo's own cn() on the empty state's class strings, before and after.
import { cn } from "file:///F:/kipindi-v3/src/lib/utils.ts";
import { EMPTY_STATE_TITLE, EMPTY_STATE_BODY } from "file:///F:/kipindi-v3/src/components/ui/empty-state-classes.ts";
console.log("body before:", cn("mt-2 text-body-sm leading-relaxed", "text-text-subtle"));
console.log("body after: ", cn(EMPTY_STATE_BODY, "text-text-subtle"));
console.log("title before:", cn("font-display text-[15.5px] font-semibold text-balance", "text-text"));
console.log("title after:", cn(EMPTY_STATE_TITLE, "text-text"));
