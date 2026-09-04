// Adaptive price precision — show the digits an asset is actually worth.
// Sub-dollar assets (penny stocks, memecoins) need 4–8 decimals to be useful;
// large-cap stocks stay clean at 2. Rounding is only ever "too coarse" when it
// would hide movement a day trader is trying to see.

export function decimalsFor(price: number): number {
  const p = Math.abs(price);
  // Convention: $1+ quotes to cents; sub-$1 quotes carry at least 4 significant
  // digits so a memecoin at $0.0000245 never collapses to "$0.00".
  if (p >= 1) return 2;
  if (p >= 0.1) return 4;
  if (p >= 0.01) return 5;
  if (p >= 0.001) return 6;
  if (p >= 0.0001) return 7;
  if (p >= 0.00001) return 8;
  if (p === 0) return 2;
  return 10;
}

/** Currency string with adaptive precision. `maxDecimals` clamps for tight layouts. */
export function formatPrice(price: number | null | undefined, opts: { maxDecimals?: number } = {}): string {
  if (price == null || !Number.isFinite(price)) return "--";
  let d = decimalsFor(price);
  if (opts.maxDecimals != null) d = Math.min(d, opts.maxDecimals);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(2, d),
    maximumFractionDigits: d,
  }).format(price);
}

/** Raw decimal string (no $) for the odometer component. */
export function priceToString(price: number, opts: { maxDecimals?: number } = {}): string {
  if (!Number.isFinite(price)) return "--";
  let d = decimalsFor(price);
  if (opts.maxDecimals != null) d = Math.min(d, opts.maxDecimals);
  return price.toFixed(d);
}

/** Smallest visible increment for a price at this precision (used by the simulator). */
export function priceTickSize(price: number): number {
  const d = decimalsFor(price);
  return Math.pow(10, -d);
}
