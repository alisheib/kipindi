import fs from "node:fs";
const Q = String.fromCharCode(34);
const spec = {
  "src/components/wallet/deposit-number-choice.tsx": [[
    "import { Button } from " + Q + "@/components/ui/button" + Q + ";",
    ["import { Button } from " + Q + "@/components/ui/button" + Q + ";",
     "import { ConfirmDialog } from " + Q + "@/components/ui/confirm-dialog" + Q + ";",
     "import { withdrawAction } from " + Q + "@/app/wallet/withdraw/actions" + Q + ";",
     "import { startTransition } from " + Q + "react" + Q + ";",
     "export function DirectConfirm() {",
     "  const ref = useRef<HTMLButtonElement>(null);",
     "  return <ConfirmDialog title=" + Q + "Send" + Q + " body=" + Q + "b" + Q + " onConfirm={() => { startTransition(() => { void withdrawAction(new FormData(ref.current!.closest(" + Q + "form" + Q + ")!)); }); }} trigger={<button ref={ref} type=" + Q + "button" + Q + ">Withdraw</button>} />;",
     "}"].join(String.fromCharCode(10))]],
  "src/app/profile/account/page.tsx": [[
    "<FormColumn measure=" + Q + "field" + Q + "><CloseAccountForm /></FormColumn>",
    "<FormColumn measure=" + Q + "field" + Q + "><CloseAccountForm /><form action={withdrawAction}><input name=" + Q + "amount" + Q + " /><DirectConfirm /></form></FormColumn>"]],
};
fs.writeFileSync(process.argv[2], JSON.stringify(spec, null, 1));
