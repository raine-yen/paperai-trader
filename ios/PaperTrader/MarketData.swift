import Foundation

enum MarketData {
    static let groups: [String: [String]] = [
        "Popular": ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "SPY"],
        "AI": ["NVDA", "MSFT", "GOOGL", "META", "AMD", "AVGO", "TSM", "PLTR"],
        "Indexes": ["SPY", "QQQ", "DIA", "IWM", "VOO", "VTI"],
        "Consumer": ["AMZN", "COST", "NKE", "SBUX", "MCD", "WMT", "TGT"],
        "Finance": ["JPM", "BAC", "V", "MA", "GS", "MS", "BRK-B"]
    ]

    static let companyNames: [String: String] = [
        "AAPL": "Apple",
        "MSFT": "Microsoft",
        "NVDA": "NVIDIA",
        "TSLA": "Tesla",
        "AMZN": "Amazon",
        "GOOGL": "Alphabet",
        "META": "Meta Platforms",
        "NFLX": "Netflix",
        "AMD": "Advanced Micro Devices",
        "SPY": "S&P 500 ETF",
        "QQQ": "Nasdaq 100 ETF",
        "DIA": "Dow Jones ETF",
        "IWM": "Russell 2000 ETF",
        "VOO": "Vanguard S&P 500 ETF",
        "VTI": "Vanguard Total Market ETF",
        "AVGO": "Broadcom",
        "TSM": "Taiwan Semiconductor",
        "PLTR": "Palantir",
        "COST": "Costco",
        "NKE": "Nike",
        "SBUX": "Starbucks",
        "MCD": "McDonald's",
        "WMT": "Walmart",
        "TGT": "Target",
        "JPM": "JPMorgan Chase",
        "BAC": "Bank of America",
        "V": "Visa",
        "MA": "Mastercard",
        "GS": "Goldman Sachs",
        "MS": "Morgan Stanley",
        "BRK-B": "Berkshire Hathaway"
    ]

    static func name(for symbol: String) -> String {
        companyNames[symbol.uppercased()] ?? "Stock"
    }
}
