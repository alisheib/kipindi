// red:implicit-submit's "kit Button after WithdrawConfirm" plant follows the withdraw form's wrapper (329d1ad7).
const fs = require("fs");
const p = "scripts/implicit-submit.test.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const a = `      world: () => one(WITHDRAW_PAGE, L("disabled={!canSubmit} />}", "      </form>"), L("disabled={!canSubmit} />}", "        <Button variant=" + Q("ghost") + ">Back</Button>", "      </form>")) },`;
const b = `      // 2026-10-09: the form's rhythm moved onto an inner wrapper (329d1ad7: React's $ACTION_ID_ input), so the guard's
      // line is now followed by the wrapper's </div>; the planted Button goes where a later edit would add it — inside.
      world: () => one(WITHDRAW_PAGE, L("disabled={!canSubmit} />}", "        </div>", "      </form>"), L("disabled={!canSubmit} />}", "          <Button variant=" + Q("ghost") + ">Back</Button>", "        </div>", "      </form>")) },`;
if (s.split(a).length !== 2) throw new Error("anchor");
s = s.replace(a, b);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
