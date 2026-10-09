// Stands in for `Modal` (src/components/ui/modal.tsx) so its panel can be drawn on a server. It draws exactly what the real
// panel draws inside `panelRef` (modal.tsx 547–575 at 9677a3f5):
//     {showClose && <CloseX onClick={onClose} label={t.common.close} className="absolute right-3 top-3" />}
//     {children}
// At 118fc75c the same line was a plain <button onClick={onClose} aria-label=…> with no `disabled` — which is what
// `CloseX` with `withheld` unset renders — so this one shim serves both versions. `CloseX` is the REAL one, re-exported.
import * as React from "react";
import { CloseX } from "file:///F:/kipindi-rev/src/components/ui/modal.tsx";

export { CloseX };

export function Modal({ showClose = true, onClose, children }: { showClose?: boolean; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div data-panel="">
      {showClose && <CloseX onClick={onClose} label="Funga" className="absolute right-3 top-3" />}
      {children}
    </div>
  );
}
