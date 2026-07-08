# 50pick — SMS & WhatsApp templates (≤160 chars per SMS segment where marked)

Rules: sender ID `50PICK`. Amounts mono-style plain digits with commas. Never
include balances in OTP/security messages. `{o}` = opt-out footer required by
local regulation on marketing class only — transactional messages carry none.
WhatsApp templates may attach the receipt card image (svg → png render of the
§11 receipt) on win/deposit.

## Transactional (no opt-out)
- **OTP** (EN/SW single bilingual segment):
  `50pick code: {otp}. Expires in 10 min. Usimpe mtu yeyote. Never share it.`
- **Deposit received**:
  EN `Deposit received: TZS {amt} via {mno}. Ref {ref}. Balance in app.`
  SW `Amana imepokelewa: TZS {amt} kupitia {mno}. Kumb. {ref}.`
  ZH `已收到充值：TZS {amt}（{mno}）。参考号 {ref}。`
- **Withdrawal sent**:
  EN `Withdrawal sent: TZS {amt} to {masked}. Ref {ref}. Not you? Reply STOP & call {help}.`
  SW `Umetumiwa TZS {amt} kwenda {masked}. Kumb. {ref}.`
- **Win / settlement** (pairs with WhatsApp receipt card):
  EN `You won! {market_short} settled {outcome}. Payout TZS {amt} credited. Receipt: {link}`
  SW `Umeshinda! Malipo TZS {amt} yamewekwa. Risiti: {link}`
  ZH `您赢了！派彩 TZS {amt} 已入账。收据：{link}`
- **Market resolved (loser — factual, no consolation-cute)**:
  EN `{market_short} settled {outcome}. Your stake: TZS {amt}. Details: {link}`
  SW `{market_short} imetatuliwa {outcome}. Dau lako: TZS {amt}.`
- **KYC approved**:
  EN `Verified! Withdrawals unlocked. Karibu.` SW `Umethibitishwa! Utoaji umefunguliwa.` ZH `已验证！提现已开通。`
- **New device sign-in**:
  EN `New sign-in from {device}, {city} at {time} EAT. Not you? {secure_link}`
- **Proposal approved**:
  EN `Your market idea was approved — TZS 20,000 credited. Pendekezo limeidhinishwa.`

## RG / care (transactional class, calm tone)
- `You set a daily limit of TZS {amt}. It renews at midnight EAT. Change anytime in Wallet → Limits.`
- SW `Umeweka kikomo cha TZS {amt} kwa siku. Kinaanza upya saa sita usiku.`

## Marketing class (requires {o})
- EN `{n} markets close today on 50pick — weather, Simba, USD/TZS. {link} {o}`
- SW `Masoko {n} yanafunga leo — hali ya hewa, Simba, USD/TZS. {link} {o}`
Opt-out footer `{o}`: `STOP kuacha` (fits both languages).
