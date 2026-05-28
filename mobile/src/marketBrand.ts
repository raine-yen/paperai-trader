export type StockBrand = {
  name: string;
  domain?: string;
  color: string;
};

export const STOCK_BRANDS: Record<string, StockBrand> = {
  AAPL: { name: "Apple", domain: "apple.com", color: "#a2aaad" },
  NVDA: { name: "NVIDIA", domain: "nvidia.com", color: "#76b900" },
  TSLA: { name: "Tesla", domain: "tesla.com", color: "#e82127" },
  MSFT: { name: "Microsoft", domain: "microsoft.com", color: "#00a4ef" },
  AMD: { name: "AMD", domain: "amd.com", color: "#ed1c24" },
  META: { name: "Meta", domain: "meta.com", color: "#0866ff" },
  GOOGL: { name: "Alphabet", domain: "abc.xyz", color: "#4285f4" },
  AMZN: { name: "Amazon", domain: "amazon.com", color: "#ff9900" },
  SPY: { name: "S&P 500 ETF", domain: "ssga.com", color: "#4aa3ff" },
  QQQ: { name: "Nasdaq 100 ETF", domain: "invesco.com", color: "#7c5cff" },
};

export function getStockBrand(symbol: string): StockBrand {
  return STOCK_BRANDS[symbol.toUpperCase()] ?? { name: symbol.toUpperCase(), color: "#1f2933" };
}

export function logoUrl(symbol: string) {
  const domain = getStockBrand(symbol).domain;
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}
