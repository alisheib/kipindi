"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from "react";

export type Locale = "en" | "sw" | "fr";

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
      tryDemo: "Try demo",
      browseMatches: "Browse matches",
      signIn: "Sign in",
      signOut: "Sign out",
      cashOut: "Cash out",
      help: "Help",
      language: "Language",
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
      tryDemo: "Ingia mfano",
      browseMatches: "Tazama mechi",
      signIn: "Ingia",
      signOut: "Toka",
      cashOut: "Toa sasa",
      help: "Msaada",
      language: "Lugha",
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
  fr: {
    common: {
      home: "Accueil", live: "En direct", myBets: "Mes paris", wallet: "Portefeuille",
      leaderboard: "Classement", profile: "Profil", mapigo: "Mapigo",
      settings: "Paramètres", notifications: "Notifications",
      placeBet: "Placer le pari", deposit: "Dépôt", withdraw: "Retrait",
      stake: "Mise", pool: "Cagnotte", win: "Gagner", lose: "Perdre", draw: "Nul",
      cancel: "Annuler", confirm: "Confirmer", back: "Retour", continue: "Continuer",
      loading: "Chargement…", error: "Une erreur est survenue",
      poolGrew: "La cagnotte a grandi",
      youWon: "Vous avez gagné",
      tryDemo: "Essayer la démo",
      browseMatches: "Voir les matchs",
      signIn: "Connexion",
      signOut: "Déconnexion",
      cashOut: "Encaisser",
      help: "Aide",
      language: "Langue",
    },
    nav: {
      home: "Accueil", live: "En direct", bets: "Paris",
      wallet: "Portefeuille", leaderboard: "Top", mapigo: "Mapigo",
    },
    mapigo: {
      title: "Mapigo",
      tagline: "Sentez le match. Lisez le rythme.",
      spike: "Pic", drift: "Dérive", calm: "Calme",
      spikeHint: "Un pic dans les 60 prochaines secondes",
      driftHint: "Hausse ou baisse douce",
      calmHint: "Aucun événement notable",
      newRoundIn: "Nouveau tour dans",
      placeYourCall: "Choisissez",
      youPicked: "Vous avez choisi",
      pulseRising: "Le pouls monte",
      pulseFalling: "Le pouls descend",
      heartbeat: "Battement",
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

/**
 * Locale is persisted in BOTH a cookie (so the server-rendered `<html lang>` is
 * correct on first paint) AND localStorage (faster client read on back-nav).
 * The cookie name is `kp-locale`; `kp-theme` lives next to it (next-themes manages that).
 */
const COOKIE_NAME = "kp-locale";

function readCookie(name: string): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  if (!match) return null;
  const v = decodeURIComponent(match[1]);
  return v === "en" || v === "sw" || v === "fr" ? v : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function I18nProvider({ children, initial = "en" }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  useEffect(() => {
    // Read from cookie first (set by server), then localStorage as fallback
    const fromCookie = readCookie(COOKIE_NAME);
    if (fromCookie && fromCookie !== locale) {
      setLocaleState(fromCookie);
      return;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kp-locale") as Locale | null;
      if (saved && (saved === "en" || saved === "sw" || saved === "fr") && saved !== locale) {
        setLocaleState(saved);
        writeCookie(COOKIE_NAME, saved);
      }
    }
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("kp-locale", l);
      writeCookie(COOKIE_NAME, l);
      document.documentElement.lang = l;
    } catch { /* ignore */ }
  };
  return <I18nContext.Provider value={{ locale, t: dict[locale], setLocale }}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}
