import type { SheetFrameKind } from "./sheet-state";

export type SheetFocusState = { identity: string; frame: SheetFrameKind; revision: number };
const editable = (frame: SheetFrameKind) => frame === "edit" || frame === "low" || frame === "lossRoom" || frame === "pending";

/** Keep a live stake edit under its keyboard; every other frame/identity change re-arms the dialog's focus beat. */
export function nextSheetFocus(previous: SheetFocusState, identity: string, frame: SheetFrameKind, stakeFocused: boolean): SheetFocusState {
  if (previous.identity === identity && previous.frame === frame) return previous;
  const typing = previous.identity === identity && stakeFocused && editable(previous.frame) && editable(frame);
  return { identity, frame, revision: previous.revision + (typing ? 0 : 1) };
}
