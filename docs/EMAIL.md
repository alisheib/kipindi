STATUS: 🟢 **LAW** — the owner document for 50pick's transactional email: the rail, the envelope, the failure contract
and the language rule. Each rule is code, named beside it. Written 2026-10-16 from the code, when these mechanics left
`CLAUDE.md`.

# Email — how 50pick sends it

## 1 · The rail

- **Postmark**, transactional (`sendEmail`, `src/lib/server/email.ts`). The key is `POSTMARK_API_KEY` (`RAILWAY.md`).
- **No key, no mail:** with `POSTMARK_API_KEY` unset every send is only logged (`[email-stub] To: … | Subject: …`) and
  returns the reason `stub`. That is the local default.
- **Every message, one envelope:** From `noreply@50pick.tz`; Reply-To `SUPPORT_EMAIL()` — the support address saved in
  Admin → System (`src/lib/server/support-config.ts`), read at every send, never captured when the module loads (a
  module-scope copy would freeze the default for the life of the process); an HTML body built by the template, with a
  plain-text body derived from it; stream `outbound`. Link tracking is on unless the caller passes
  `trackLinks: false`, as a critical action link does.
- **Bounded, and a failure is counted.** Each send has a time limit (`EMAIL_SEND_TIMEOUT_MS`), and a 2xx without a
  Postmark `MessageID` counts as a failure. Consecutive failures are counted; crossing `EMAIL_DOWN_AFTER_FAILURES`
  writes ONE COMPLIANCE audit row per outage (`email.provider_down`). The state is `emailHealth()`, and `/api/health`
  shows its public form (`emailHealthPublic`, the reason reduced to its class and codes).
- **Bounces and complaints stop the mail.** The Postmark webhook (`/api/webhooks/postmark`, `POSTMARK_WEBHOOK_SECRET`)
  adds a hard-bounced or complaining address to the suppression list (`email-suppression.ts`, kept in `SystemConfig`);
  `sendEmail` skips any address on it. A soft bounce is not suppressed.

## 2 · The failure contract — read `reason`, not `ok`

`sendEmail` and `sendEmailToUser` never throw. They return a `SendResult` whose `reason` is one of:

| `reason` | Meaning | `ok` |
|---|---|---|
| `sent` | Postmark accepted it and returned a `MessageID` | `true` |
| `stub` | no provider is configured — it was only logged | `true` |
| `no-address` | there was no address to send to | `true` from `sendEmail`, `false` from `sendEmailToUser` |
| `suppressed` | the address is on the suppression list | `false` |
| `failed` | the provider refused, timed out or answered without a `MessageID` | `false` |
| `unconfirmed` | a money mail withheld because the address on file was never confirmed (`confirmedOnly`) | `false` |

⛔ **A caller that PROMISES the player an email must read `reason`.** `ok: true` does not mean delivered — a stub and
a missing address are both `ok` from `sendEmail`.

## 3 · Who receives what

- **`sendEmailToUser(userId, build, opts)`** finds the account's address and sends. It is built to be fired and
  forgotten: a failed lookup or send never breaks the bet, deposit or decision that asked for it.
- **Money mail goes only to a CONFIRMED address** (owner ruling 2026-10-07). With `confirmedOnly`, an address never
  confirmed is skipped as `unconfirmed`. The in-app record does not depend on it: the bell row and the receipt
  (`/wallet/receipts`) are written either way. `test:cert-c1` holds every player money template to it
  (`CONFIRMED_ONLY_TEMPLATES` in the registry), except the refused-funds letters Terms §3a promises in writing
  (`CONFIRMED_ONLY_EXEMPT`). An account that cannot sign in (self-excluded, closed, suspended — `CANNOT_SIGN_IN`) cannot
  reach the bell or the receipts, so its money letter goes to the address on file, confirmed or not.
- **`PHONE_EMAIL_MAP`** is a legacy, read-only fallback for an account with NO address on file: non-money mail only.
  Never for a `confirmedOnly` send, never for a password-reset link, and never written to `user.email` (`RAILWAY.md`).

## 4 · Language and chrome

- **One message carries English AND Swahili**, whatever the reader's locale, and **there is no Chinese in any email** —
  a recorded decision, not an omission (`docs/AGENT-PROGRAMME.md` §11; the note in `email.ts`).
- **Gold chrome is reserved for earned money, earned status and money in** (`wrapGold`); everything else is royal
  (`wrap`). The registry declares each template's chrome and `test:cert-c1` checks it against the builder.
- ⛔ **No email carries the problem-gambling helpline** (owner ruling 2026-10-06; `test:cert-c1` holds it).

## 5 · The inventory is code

Every template, its trigger module, its audience, its chrome and whether it is on a money path are declared in
**`src/lib/server/comms-registry.ts`** (`EMAIL_TEMPLATES`), which `npm run test:cert-c1` renders and checks against
`email.ts` — add a template and forget to register it, register one that does not exist, or move a trigger, and it goes
red. ⛔ No count of templates is kept here or anywhere else in prose: the gate measures it.

## 6 · Testing mail

- `EMAIL_OUTBOX_CAPTURE=1` keeps the rendered HTML of every attempted send in memory, so a test can read what the
  player would read; `/api/dev-test/last-otp?email=…` reads a code from it. It refuses to arm in production.
- `POSTMARK_API_HOST` points the real SDK at a throwaway server (`test:cert-c2`). It is ignored in production.
