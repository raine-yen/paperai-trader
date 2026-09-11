export function usd(value: number | string | null | undefined, digits = 2) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);
}

export function maybeUsd(value: number | string | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return usd(Number(value));
}

export function signedUsd(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${usd(Math.abs(n))}`;
}

export function pct(value: number | string | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `${Number(value).toFixed(digits)}%`;
}

export function signedPct(value: number | string | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  const n = Number(value);
  return `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(digits)}%`;
}

export function compactNumber(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

export function compactMoney(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return `$${compactNumber(n)}`;
}

export function metric(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(2);
}

export function firstName(name?: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function timeAgo(value?: string | null) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function rangeLabel(low: number | null | undefined, high: number | null | undefined) {
  if (low == null || high == null) return "--";
  return `${usd(low, 0)} - ${usd(high, 0)}`;
}

export function cents(value: number | string | null | undefined) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}¢`;
}

export function probability(value: number | string | null | undefined) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export function predictionEndLabel(endDate: string | null | undefined) {
  if (!endDate) return "Resolution date pending";
  const date = new Date(endDate);
  return Number.isNaN(date.getTime())
    ? endDate
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function predictionCategory(question: string, sourceCategory: string | null | undefined): string {
  const rules: Array<[RegExp, string]> = [
    [/\b(election|president|congress|senate|house|governor|parliament|minister|democrat|republican|trump|biden|tariff|government|bill)\b/i, "Politics"],
    [/\b(fed|federal reserve|interest rate|inflation|gdp|jobs report|unemployment|recession|cpi|yield|central bank)\b/i, "Economics"],
    [/\b(bitcoin|ethereum|crypto|solana|token|fdv|market cap|s&p|nasdaq|dow|stock market|ipo)\b/i, "Crypto & Markets"],
    [/\b(ai|artificial intelligence|nvidia|model|openai|anthropic|apple|google|microsoft|laptop|chip|semiconductor|technology)\b/i, "Technology"],
    [/\b(nfl|nba|mlb|nhl|soccer|football|baseball|basketball|tennis|ufc|formula 1|fifa|champions league|super bowl|seahawks|dodgers|fc)\b/i, "Sports"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(question));
  if (matched) return matched[1];
  const source = sourceCategory?.trim();
  return source && !/^general$/i.test(source) ? source : "General";
}
