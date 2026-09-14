"use client";

import { useEffect, useState } from "react";

/**
 * E-381 §6 item 14 · A POSITION PERMALINK KEEPS ITS ANCHOR THROUGH SIGN-IN.
 *
 * A ticket link in an email is `/markets/mkt_…#pos_…`. A fragment never reaches the server, so the `next` the proxy
 * and the sign-in page round-trip is `pathname + search` only, and a player who signed in on the way landed at the top
 * of the market instead of on their position. The browser DOES keep the fragment across the 3xx that brought them
 * here; this field reads it and hands it to the sign-in action, which re-attaches it after validating its shape.
 * ⛔ Only `#` + letters, digits, `_` and `-` (≤ 80): anything else is dropped, never echoed into a redirect.
 */
export function NextHashField() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const h = window.location.hash;
    if (/^#[A-Za-z0-9_-]{1,80}$/.test(h)) setHash(h);
  }, []);
  return <input type="hidden" name="nextHash" value={hash} />;
}
