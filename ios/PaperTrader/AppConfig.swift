import Foundation

enum AppConfig {
    static var apiBaseURL: URL {
        if let override = ProcessInfo.processInfo.environment["PAPER_TRADER_API_BASE_URL"],
           let url = URL(string: override), !override.isEmpty {
            return url
        }

        if let value = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: value), !value.isEmpty {
            return url
        }

        return URL(string: "http://localhost:3000")!
    }
}
