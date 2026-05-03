"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Browser-side fairness verifier.
 * Re-implements `commitServerSeed` + `deriveOutcome` from
 * `src/lib/server/fairness.ts` using the Web Crypto API so a player /
 * regulator never has to trust the server to verify a round.
 */

const DIST: Array<{ call: "SPIKE" | "DRIFT" | "CALM"; weight: number }> = [
  { call: "SPIKE", weight: 45 },
  { call: "DRIFT", weight: 35 },
  { call: "CALM",  weight: 20 },
];

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(keyHex: string, message: string): Promise<Uint8Array> {
  const keyBytes = new TextEncoder().encode(keyHex);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

async function deriveOutcome(serverSeed: string, roundId: string, nonce: number) {
  const mac = await hmacSha256(serverSeed, `${roundId}:${nonce}`);
  const view = new DataView(mac.buffer, mac.byteOffset, mac.byteLength);
  const x = view.getUint32(0) % 100;
  let cursor = 0;
  for (const slot of DIST) {
    cursor += slot.weight;
    if (x < cursor) return slot.call;
  }
  return DIST[DIST.length - 1].call;
}

export function FairnessVerifier() {
  const [seed, setSeed] = useState("");
  const [hash, setHash] = useState("");
  const [roundId, setRoundId] = useState("");
  const [nonce, setNonce] = useState("");
  const [out, setOut] = useState<{ commitMatch: boolean; computed: string; recomputedHash: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    try {
      const recomputedHash = await sha256Hex(seed.trim());
      const computed = await deriveOutcome(seed.trim(), roundId.trim(), parseInt(nonce, 10) || 0);
      const commitMatch = recomputedHash.toLowerCase() === hash.trim().toLowerCase();
      setOut({ commitMatch, computed, recomputedHash });
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = "w-full h-9 px-3 rounded-md bg-surface border border-border text-text font-mono text-caption focus:outline-none focus:border-gold";

  return (
    <div className="space-y-2">
      <Field label="Server seed (hex)" value={seed} onChange={setSeed} className={fieldClass} placeholder="3f4a..." />
      <Field label="Published commit (hex)" value={hash} onChange={setHash} className={fieldClass} placeholder="9c8d..." />
      <Field label="Round id" value={roundId} onChange={setRoundId} className={fieldClass} placeholder="mr_..." />
      <Field label="Nonce" value={nonce} onChange={setNonce} className={fieldClass} placeholder="85" />
      <Button type="button" variant="primary" size="sm" fullWidth onClick={verify} loading={busy} disabled={!seed || !hash || !roundId}>
        Verify · Thibitisha
      </Button>
      {out && (
        <div className="mt-2 space-y-1.5 p-3 rounded-md border border-border bg-surface">
          <Row label="Commit matches" ok={out.commitMatch} value={out.commitMatch ? "Yes — your seed produces the same hash we published." : "No — these inputs were not produced by the same seed."} />
          <Row label="Re-hash" value={out.recomputedHash} ok mono />
          <Row label="Outcome" value={out.computed} ok mono />
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; className: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1">{label}</span>
      <input className={className} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Row({ label, value, ok, mono }: { label: string; value: string; ok: boolean; mono?: boolean }) {
  return (
    <div className="text-caption">
      <span className="text-text-tertiary">{label}: </span>
      <span className={`${mono ? "font-mono break-all " : ""}${ok ? "text-text" : "text-danger"}`}>{value}</span>
    </div>
  );
}
