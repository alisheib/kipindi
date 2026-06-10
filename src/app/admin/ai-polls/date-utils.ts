/** Shared date preset -> ISO range conversion. Used by both server page and client filter toolbar. */
export function datePresetToRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  switch (preset) {
    case "today":
      return { from: todayStart, to: tomorrowStart };
    case "yesterday": {
      const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      return { from: yStart, to: todayStart };
    }
    case "7d": {
      const d7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      return { from: d7 };
    }
    case "30d": {
      const d30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
      return { from: d30 };
    }
    default:
      return {};
  }
}
