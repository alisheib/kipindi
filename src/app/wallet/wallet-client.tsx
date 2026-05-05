"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { Transaction } from "@/lib/mock-data";

function WalletCard({ balance, pending, hold, currency }: { balance: number; pending: number; hold: number; currency: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Available · Salio</p>
      <p
        data-testid="wallet-balance"
        data-balance={balance}
        className="mt-1 font-display text-[44px] font-bold tabular-nums text-text leading-none"
      >
        {currency} {balance.toLocaleString("en-US")}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-text-subtle">Pending</p>
          <p className="font-mono tabular-nums text-text-muted">{currency} {pending.toLocaleString("en-US")}</p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-text-subtle">On hold</p>
          <p className="font-mono tabular-nums text-text-muted">{currency} {hold.toLocaleString("en-US")}</p>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount > 0;
  return (
    <div className="flex items-start justify-between gap-3 py-3 px-3">
      <div className="flex-1 min-w-0">
        <p className="font-display text-[14px] font-semibold text-text leading-tight truncate">{tx.description ?? tx.type}</p>
        <p className="mt-0.5 font-mono text-[11px] text-text-subtle">{tx.createdAt?.replace("T", " ").slice(0, 19)}</p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-[15px] font-semibold tabular-nums ${isCredit ? "text-yes-300" : "text-text"}`}>
          {isCredit ? "+" : ""}{tx.amount.toLocaleString("en-US")}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{tx.status}</p>
      </div>
    </div>
  );
}

export function WalletPageClient({
  balance, pending, hold, currency,
  transactions,
  isAuthed,
  isDemo,
}: {
  balance: number; pending: number; hold: number; currency: string;
  transactions: Transaction[];
  isAuthed: boolean;
  isDemo: boolean;
}) {
  const [tab, setTab] = useState("activity");

  return (
    <div className="mx-auto max-w-[960px] px-3 lg:px-6 py-4 lg:py-6 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-title-lg text-text">Wallet · Pochi</h1>
        {isAuthed && (
          <div className="flex items-center gap-2">
            <Link href="/wallet/deposit"><Button variant="gold" size="md" leading={<ArrowDownToLine size={14} />}>Deposit</Button></Link>
            <Link href="/wallet/withdraw"><Button variant="secondary" size="md" leading={<ArrowUpFromLine size={14} />}>Withdraw</Button></Link>
          </div>
        )}
      </header>

      <WalletCard balance={balance} pending={pending} hold={hold} currency={currency} />

      <Tabs
        variant="line"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "activity", labelEn: `Activity · ${transactions.length}` },
          { value: "methods",  labelEn: "Methods · Njia" },
          { value: "limits",   labelEn: "Limits · Vikomo" },
        ]}
      />

      {tab === "activity" && (
        transactions.length > 0 ? (
          <Card>
            <CardBody className="divide-y divide-border-divider">
              {transactions.map((t) => <TransactionRow key={t.id} tx={t} />)}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="text-center py-9 px-3">
              <p className="font-display text-title-sm text-text">No activity yet · Hakuna shughuli</p>
              <p className="text-body-sm text-text-secondary max-w-sm mx-auto mt-1">Make your first deposit to start playing.</p>
              {isAuthed && (
                <div className="mt-3"><Link href="/wallet/deposit"><Button variant="primary" size="lg">Deposit · Weka pesa</Button></Link></div>
              )}
            </CardBody>
          </Card>
        )
      )}

      {tab === "methods" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "M-Pesa",       phone: "+2557*****99", default: true,  hue: "var(--success)" },
            { name: "Tigo Pesa",    phone: "+2557*****99", hue: "var(--bet-cold)" },
            { name: "Airtel Money", phone: "+2556*****20", hue: "var(--danger)" },
            { name: "HaloPesa",     phone: "+2556*****11", hue: "var(--warning)" },
            { name: "Mixx by Yas",  phone: "+2557*****99", hue: "var(--royal)" },
          ].map((m) => (
            <Card key={m.name}>
              <CardBody className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-md inline-flex items-center justify-center text-white font-display font-bold text-label" style={{ backgroundColor: m.hue }}>
                    {m.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-display text-body font-semibold text-text leading-tight">{m.name}</p>
                    <p className="text-caption text-text-tertiary tabular leading-tight">{m.phone}</p>
                  </div>
                </div>
                {m.default ? <Chip variant="brand" size="sm">Default</Chip> : <Button variant="ghost" size="sm">Set default</Button>}
              </CardBody>
            </Card>
          ))}
          <Card interactive>
            <CardBody className="flex items-center justify-center text-text-tertiary py-6">
              + Add card · Ongeza kadi
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "limits" && (
        <div className="space-y-3">
          {[
            { label: "Daily deposit · Amana ya siku",    value: "TZS 50,000" },
            { label: "Weekly deposit · Amana ya wiki",   value: "TZS 250,000" },
            { label: "Monthly deposit · Amana ya mwezi", value: "TZS 1,000,000" },
            { label: "Daily loss · Hasara ya siku",      value: "TZS 20,000" },
            { label: "Session · 50pick cha mchezo",     value: "60 min" },
          ].map((l) => (
            <Card key={l.label}>
              <CardBody className="flex items-center justify-between">
                <p className="text-body text-text">{l.label}</p>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-body tabular text-text">{l.value}</span>
                  <Button variant="ghost" size="sm">Edit · Hariri</Button>
                </div>
              </CardBody>
            </Card>
          ))}
          <Card>
            <CardBody className="space-y-1.5">
              <p className="font-display text-body font-bold text-text">Self-exclusion · Kujitenga</p>
              <p className="text-body-sm text-text-secondary">
                Take a break. We&apos;ll lock your account for the period you choose. · Pumzika.
                Tutafunga akaunti yako kwa muda uliochagua.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {["24h", "7d", "30d", "6m", "Permanent"].map((o) => (
                  <Button key={o} variant="secondary" size="sm">{o}</Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {isDemo && (
        <Card className="border-2 border-gold-subtleHover/40 bg-gold-subtle/15">
          <CardBody className="p-3 flex items-center justify-between gap-3">
            <p className="text-caption text-text-secondary">
              <span className="font-bold text-gold">Demo mode</span> — your TZS 100,000 balance and any deposits/withdrawals here are virtual. Restart by signing out and re-entering demo.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
