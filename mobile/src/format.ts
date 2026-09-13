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
