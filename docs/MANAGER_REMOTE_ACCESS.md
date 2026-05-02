# Sharing Kipindi with the manager — without a domain

You can let your manager test the platform from any device on the internet, without paying for a domain or hosting. Choose **one** of the options below — Cloudflare Tunnel is recommended (free, no signup, fastest).

The manager doesn't need to install anything. They get a URL like `https://lavender-tiger-93.trycloudflare.com` — they open it on their phone or laptop and the platform loads as if it were live.

---

## Option A — Cloudflare Tunnel (recommended)

**Why:** free, no account needed, end-to-end TLS, ~30 seconds to set up.

### One-time install (Windows)

Download `cloudflared` from <https://github.com/cloudflare/cloudflared/releases/latest>. Pick the file `cloudflared-windows-amd64.exe`. Save it somewhere convenient (e.g. `C:\Tools\cloudflared.exe`) and add that folder to your PATH, **or** just call the full path each time.

### Start the tunnel

In one terminal, keep your dev server running:

```bash
cd C:\kipindi
npm run dev
```

In a second terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Output:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):   |
|  https://lavender-tiger-93.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

Send the URL to the manager.

### When you're done

Press **Ctrl+C** in the cloudflared terminal. The URL stops working immediately.

---

## Option B — ngrok (free tier)

**Why:** widely known, simple. Requires a free account.

```bash
# 1. Sign up at https://ngrok.com (free)
# 2. Install: choco install ngrok   (or download from ngrok.com)
# 3. One-time config:
ngrok config add-authtoken <your-token>
# 4. Start tunnel:
ngrok http 3000
```

You get a URL like `https://3a5b-41-x-x-x.ngrok-free.app`. Send to the manager.

---

## Option C — LocalTunnel (zero install)

```bash
npx localtunnel --port 3000
```

You get a URL like `https://kipindi-demo.loca.lt`. The manager may see a one-time "tunnel password" prompt — it's the public IP of your machine, shown in the terminal.

---

## Before sending the URL — checklist

1. **`npm run dev` is running** and `http://localhost:3000/` works in your local browser.
2. **Demo mode is enabled** (default in dev). The login page shows the gold "Reviewer access · dev only · Enter demo · Ingia mfano" card.
3. **`.env` does not have `DEMO_MODE_ENABLED=false`**.
4. **Your laptop is awake and on Wi-Fi.** The tunnel only works while your machine is online.

## What to tell the manager

> Open this link: **https://lavender-tiger-93.trycloudflare.com**
>
> 1. You'll land on the landing page. Click **Sign in** in the top right (or any other action).
> 2. On the login page, scroll to the **"Reviewer access · dev only"** card and click **Enter demo · Ingia mfano**.
> 3. You'll be signed in as "Demo Manager" with TZS 100,000 in the wallet, KYC pre-approved, ready to bet.
> 4. Try:
>    - Browse **Live**, click any match, place a bet on a window
>    - Open **Mapigo** (signature game), pick **SPIKE / DRIFT / CALM**, place a stake, watch the waveform
>    - Settle a Mapigo round with the demo controls (only visible while in demo mode) and watch the wallet credit
>    - Open **Wallet** to see the transaction list, try **Deposit** and **Withdraw** flows
>    - Toggle **EN / SW** in the top-right
>    - Toggle **light / dark** mode
>    - Open the **bell icon** for the notifications panel
>    - Open **My Bets** to see active and settled bets
> 5. Everything is sandbox — no real money moves anywhere.

## Caveats to mention to the manager

- This is a **development build**, not the production deployment. It runs on your laptop. The URL is temporary.
- Live match data is currently mocked. Real API-Football integration lands in Sprint 3 production push.
- All bets, balances, and transactions are virtual.
- Some compliance integrations (NIDA, Selcom payment rails, Sportradar Integrity) are stubbed and will be replaced with real partners after the Gaming Board pre-application meeting.

---

## When you go to production (after this demo)

You'll need:

1. A domain (kipindi.tz, kipindi.co.tz, etc.) — register with TZ-NIC or any registrar
2. A hosting target — Vercel (free for early traffic), Railway, AWS Africa region, or a TZ-hosted VPS
3. A managed Postgres — Neon (free tier), Supabase, or RDS in AWS Cape Town
4. A real domain TLS cert — Vercel does it automatically; otherwise Let's Encrypt
5. SMS provider (Selcom or Beem) keys
6. Mobile money aggregator (Selcom or Azampay) integration
7. NIDA mTLS agreement

These all live in `.env.example`. None of them are needed for the manager demo — the demo runs entirely in-memory with mocks.

---

## Quick reference

| Tool | Command | URL format |
|---|---|---|
| Cloudflare Tunnel | `cloudflared tunnel --url http://localhost:3000` | `https://*.trycloudflare.com` |
| ngrok | `ngrok http 3000` | `https://*.ngrok-free.app` |
| LocalTunnel | `npx localtunnel --port 3000` | `https://*.loca.lt` |
| Tailscale Funnel | `tailscale funnel --bg 3000` | `https://<machine>.<tail>.ts.net` |
| VS Code Port Forward | `Ports` panel → forward 3000 → set to **Public** | `https://*.devtunnels.ms` |
