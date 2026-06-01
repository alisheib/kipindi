/* 50pick — sample market data for the surface showcase.
   Hypothetical markets only. Bilingual EN · SW copy. Probability series are
   seeded random walks that resolve to each market's current YES%. */

(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Seeded walk that lands on `end`, clamped to [4,96], gentle mean-pull.
  function walk(seed, n, end, vol) {
    const rnd = mulberry32(seed);
    const arr = [];
    let p = end + (rnd() - 0.5) * vol * 2.2;
    for (let i = 0; i < n; i++) arr.push(p);
    for (let i = n - 2; i >= 0; i--) {
      const drift = (end - arr[i + 1]) * 0.04;
      arr[i] = arr[i + 1] - drift + (rnd() - 0.5) * vol;
      arr[i] = Math.max(4, Math.min(96, arr[i]));
    }
    arr[n - 1] = end;
    return arr.map((v) => Math.round(v));
  }

  function labelled(ps, labels) {
    return ps.map((p, i) => ({ t: labels[i], p }));
  }

  const dayLabels = ["00:00", "", "", "06:00", "", "", "12:00", "", "", "18:00", "", "now"];
  const weekLabels = ["Mon", "", "Tue", "", "Wed", "", "Thu", "", "Fri", "", "Sat", "now"];
  const monthLabels = ["Wk1", "", "", "Wk2", "", "", "Wk3", "", "", "Wk4", "", "now"];
  const allLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "now"];

  function buildSeries(seed, end) {
    return {
      "1D": labelled(walk(seed + 1, 12, end, 5), dayLabels),
      "1W": labelled(walk(seed + 2, 12, end, 9), weekLabels),
      "1M": labelled(walk(seed + 3, 12, end, 13), monthLabels),
      "ALL": labelled(walk(seed + 4, 12, end, 18), allLabels),
    };
  }

  // Detail market — the calm-terminal hero.
  const detail = {
    id: "tsh-2700",
    category: "Finance · Fedha",
    question: "Will USD/TZS close above 2,700 by 31 Dec 2026?",
    questionSw: "Je, USD/TZS itafunga juu ya 2,700 ifikapo 31 Des 2026?",
    yes: 63,
    move24h: +4,
    volume: "TZS 48.2M",
    traders: 1284,
    closes: "31 Dec 2026",
    poolYes: "TZS 30.4M",
    poolNo: "TZS 17.8M",
    series: buildSeries(1010, 63),
    position: { side: "YES", shares: 320, avg: 0.56, value: "TZS 201,600", cost: "TZS 179,200" },
  };

  // Card markets — the feed.
  const cards = [
    {
      id: "tpl-final",
      category: "Sports · Michezo",
      question: "Will the TPL final be decided on penalties?",
      questionSw: "Je, fainali ya TPL itaamuliwa kwa penalti?",
      yes: 41, move24h: -6, volume: "TZS 12.1M", traders: 612, live: true,
      series: buildSeries(2020, 41),
    },
    {
      id: "rain-dec",
      category: "Weather · Hali ya hewa",
      question: "Above-average rainfall in Dar es Salaam this December?",
      questionSw: "Mvua zaidi ya wastani Dar es Salaam Desemba hii?",
      yes: 72, move24h: +3, volume: "TZS 8.6M", traders: 388, live: false,
      series: buildSeries(3030, 72),
    },
    {
      id: "tsh-2700-card",
      category: "Finance · Fedha",
      question: "Will USD/TZS close above 2,700 by 31 Dec 2026?",
      questionSw: "Je, USD/TZS itafunga juu ya 2,700 ifikapo 31 Des?",
      yes: 63, move24h: +4, volume: "TZS 48.2M", traders: 1284, live: true,
      series: buildSeries(1010, 63),
    },
  ];

  window.MARKET_DATA = { detail, cards };
})();
