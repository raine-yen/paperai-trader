const CATEGORY_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "Politics", pattern: /\b(election|president|congress|senate|house|governor|parliament|minister|democrat|republican|trump|biden|tariff|government|bill)\b/i },
  { category: "Economics", pattern: /\b(fed|federal reserve|interest rate|inflation|gdp|jobs report|unemployment|recession|cpi|yield|central bank)\b/i },
  { category: "Crypto & Markets", pattern: /\b(bitcoin|ethereum|crypto|solana|token|fdv|market cap|s&p|nasdaq|dow|stock market|ipo)\b/i },
  { category: "Technology", pattern: /\b(ai|artificial intelligence|nvidia|model|openai|anthropic|apple|google|microsoft|laptop|chip|semiconductor|technology)\b/i },
  { category: "Sports", pattern: /\b(nfl|nba|mlb|nhl|soccer|football|baseball|basketball|tennis|ufc|formula 1|fifa|champions league|super bowl|seahawks|dodgers|fc)\b/i },
];

/** "Live · ends in 2d 14h" style countdown used on discovery rows. */
export function predictionCountdown(endDate: string | null | undefined, now: number = Date.now()): string {
  if (!endDate) return "Resolution date pending";
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return "Resolution date pending";
  const ms = end - now;
  if (ms <= 0) return "Settling";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `Live · ${days}d ${hours}h left`;
  const mins = minutes % 60;
  if (hours > 0) return `Live · ${hours}h ${mins}m left`;
  return `Live · ${mins}m left`;
}

export function formatPredictionHistoryLabel(timestamp: string | number, days: number): string {
  const numeric = Number(timestamp);
  const epochMs = Number.isFinite(numeric) ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric) : NaN;
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return "Latest";
  return days === 1
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Source-market category values are inconsistent. This gives the discovery UI
 * a stable, user-readable taxonomy while preserving a meaningful non-generic
 * source label when the question does not match a known Vanta category. */
export function predictionCategory(question: string, sourceCategory: string | null | undefined): string {
  const matched = CATEGORY_RULES.find((rule) => rule.pattern.test(question));
  if (matched) return matched.category;
  const source = sourceCategory?.trim();
  return source && !/^general$/i.test(source) ? source : "General";
}
