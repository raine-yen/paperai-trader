import { STOCK_BRANDS, getStockBrand as baseStockBrand, logoUrl } from "./marketBrand";

export const MARKET_GROUPS: Record<string, string[]> = {
  Popular: ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "SPY", "NFLX", "AMD"],
  Owned: [],
  Watchlist: [],
  "Active traders": ["GME", "AMC", "SOFI", "PLTR", "RKLB", "IONQ", "MARA", "RIOT", "BBAI"],
  Crypto: ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "SHIB-USD", "PEPE-USD", "BONK-USD"],
  Tech: ["AAPL", "MSFT", "NVDA", "AMD", "INTC", "ORCL", "CRM", "SNOW", "PLTR", "UBER"],
  Finance: ["JPM", "BAC", "GS", "MS", "V", "MA", "BRK-B", "WFC", "AXP", "C"],
  ETFs: ["SPY", "QQQ", "VTI", "IWM", "GLD", "TLT", "ARKK", "DIA", "XLK", "XLF"],
  Consumer: ["AMZN", "WMT", "HD", "NKE", "SBUX", "MCD", "TGT", "COST", "LOW", "DG"],
};

export const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  MSFT: "Microsoft Corp.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms",
  SPY: "S&P 500 ETF",
  NFLX: "Netflix Inc.",
  AMD: "Advanced Micro Devices",
  INTC: "Intel Corp.",
  ORCL: "Oracle Corp.",
  CRM: "Salesforce",
  SNOW: "Snowflake Inc.",
  PLTR: "Palantir Technologies",
  UBER: "Uber Technologies",
  JPM: "JPMorgan Chase",
  BAC: "Bank of America",
  GS: "Goldman Sachs",
  MS: "Morgan Stanley",
  V: "Visa Inc.",
  MA: "Mastercard Inc.",
  "BRK-B": "Berkshire Hathaway",
  WFC: "Wells Fargo",
  AXP: "American Express",
  C: "Citigroup Inc.",
  QQQ: "Nasdaq 100 ETF",
  VTI: "Vanguard Total Market",
  IWM: "Russell 2000 ETF",
  GLD: "SPDR Gold Shares",
  TLT: "iShares 20+ Year Treasury",
  ARKK: "ARK Innovation ETF",
  DIA: "Dow Jones ETF",
  XLK: "Technology Select SPDR",
  XLF: "Financial Select SPDR",
  WMT: "Walmart Inc.",
  HD: "Home Depot",
  NKE: "Nike Inc.",
  SBUX: "Starbucks Corp.",
  MCD: "McDonald's Corp.",
  TGT: "Target Corp.",
  COST: "Costco Wholesale",
  LOW: "Lowe's Cos.",
  DG: "Dollar General",
  GME: "GameStop Corp.",
  AMC: "AMC Entertainment",
  SOFI: "SoFi Technologies",
  RKLB: "Rocket Lab",
  IONQ: "IonQ",
  MARA: "MARA Holdings",
  RIOT: "Riot Platforms",
  BBAI: "BigBear.ai",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "SOL-USD": "Solana",
  "XRP-USD": "XRP",
  "DOGE-USD": "Dogecoin",
  "SHIB-USD": "Shiba Inu",
  "PEPE-USD": "Pepe",
  "BONK-USD": "Bonk",
};

const extraBrands: typeof STOCK_BRANDS = {
  NFLX: { name: "Netflix", domain: "netflix.com", color: "#e50914" },
  JPM: { name: "JPMorgan", domain: "jpmorganchase.com", color: "#2c5aa0" },
  BAC: { name: "Bank of America", domain: "bankofamerica.com", color: "#e31837" },
  GS: { name: "Goldman Sachs", domain: "goldmansachs.com", color: "#7399c6" },
  MS: { name: "Morgan Stanley", domain: "morganstanley.com", color: "#1f6fb2" },
  V: { name: "Visa", domain: "visa.com", color: "#1434cb" },
  MA: { name: "Mastercard", domain: "mastercard.com", color: "#eb001b" },
  JPMX: { name: "JPMorgan", domain: "jpmorganchase.com", color: "#2c5aa0" },
};

export function getCompanyName(symbol: string) {
  return COMPANY_NAMES[symbol.toUpperCase()] ?? baseStockBrand(symbol).name ?? symbol.toUpperCase();
}

export function getStockBrand(symbol: string) {
  return STOCK_BRANDS[symbol.toUpperCase()] ?? extraBrands[symbol.toUpperCase()] ?? {
    name: getCompanyName(symbol),
    color: "#1c221f",
  };
}

export { logoUrl };
