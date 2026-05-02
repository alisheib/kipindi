"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from "react";

export type Locale = "en" | "sw";

const dict = {
  en: {
    common: {
      home: "Home", live: "Live", myBets: "My Bets", wallet: "Wallet",
      leaderboard: "Leaderboard", profile: "Profile", mapigo: "Mapigo",
      settings: "Settings", notifications: "Notifications",
      placeBet: "Place bet", deposit: "Deposit", withdraw: "Withdraw",
      stake: "Stake", pool: "Pool", win: "Win", lose: "Lose", draw: "Draw",
      cancel: "Cancel", confirm: "Confirm", back: "Back", continue: "Continue",
      loading: "Loading…", error: "Something went wrong",
      poolGrew: "The pool grew",
      youWon: "You won",
    },
    nav: {
      home: "Home", live: "Live", bets: "Bets",
      wallet: "Wallet", leaderboard: "Top", mapigo: "Mapigo",
    },
    mapigo: {
      title: "Mapigo",
      tagline: "Feel the match. Bet the pulse.",
      spike: "Spike", drift: "Drift", calm: "Calm",
      spikeHint: "A peak in the next 60s",
      driftHint: "Gentle rise or fall",
      calmHint: "No notable events",
      newRoundIn: "New round in",
      placeYourCall: "Place your call",
      youPicked: "You picked",
      pulseRising: "Pulse rising",
      pulseFalling: "Pulse falling",
      heartbeat: "Heartbeat",
    },
  },
  sw: {
    common: {
      home: "Mwanzo", live: "Moja kwa moja", myBets: "Madau yangu", wallet: "Pochi",
      leaderboard: "Ubora", profile: "Wasifu", mapigo: "Mapigo",
      settings: "Mipangilio", notifications: "Arifa",
      placeBet: "Weka dau", deposit: "Amana", withdraw: "Toa",
      stake: "Dau", pool: "Bwawa", win: "Shinda", lose: "Poteza", draw: "Sare",
      cancel: "Ghairi", confirm: "Thibitisha", back: "Rudi", continue: "Endelea",
      loading: "Inapakia…", error: "Hitilafu imetokea",
      poolGrew: "Bwawa limeongezeka",
      youWon: "Umeshinda",
    },
    nav: {
      home: "Mwanzo", live: "Moja kwa moja", bets: "Madau",
      wallet: "Pochi", leaderboard: "Ubora", mapigo: "Mapigo",
    },
    mapigo: {
      title: "Mapigo",
      tagline: "Hisi mechi. Cheza mapigo.",
      spike: "Mwiba", drift: "Tetemeka", calm: "Tulivu",
      spikeHint: "Mwiba mkubwa ndani ya sekunde 60",
      driftHint: "Kupanda au kushuka taratibu",
      calmHint: "Hakuna matukio makubwa",
      newRoundIn: "Raundi mpya kwa",
      placeYourCall: "Chagua",
      youPicked: "Umechagua",
      pulseRising: "Mapigo yanapanda",
      pulseFalling: "Mapigo yanashuka",
      heartbeat: "Mapigo",
    },
  },
} as const;

type Dict = typeof dict.en;
type Path = keyof Dict;

const I18nContext = createContext<{ locale: Locale; t: Dict; setLocale: (l: Locale) => void }>({
  locale: "en",
  t: dict.en,
  setLocale: () => {},
});

export function I18nProvider({ children, initial = "en" }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("kp-locale") as Locale | null)) || null;
    if (saved && saved !== locale) setLocaleState(saved);
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("kp-locale", l); document.documentElement.lang = l; } catch {}
  };
  return <I18nContext.Provider value={{ locale, t: dict[locale], setLocale }}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}
