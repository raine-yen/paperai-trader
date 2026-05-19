import Foundation

@MainActor
final class AppModel: ObservableObject {
    @Published var checkedSession = false
    @Published var isAuthenticated = false
    @Published var isBusy = false
    @Published var lastError: String?
    @Published var me: MeResponse?
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var keys: [APIKey] = []

    let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func checkSession() async {
        do {
            me = try await client.me()
            isAuthenticated = true
        } catch APIError.unauthorized {
            isAuthenticated = false
            me = nil
        } catch {
            lastError = error.localizedDescription
            isAuthenticated = false
        }
        checkedSession = true
    }

    func login(email: String, password: String) async {
        await runBusy {
            try await client.login(email: email, password: password)
            me = try await client.me()
            isAuthenticated = true
        }
    }

    func signup(email: String, password: String, displayName: String) async {
        await runBusy {
            try await client.signup(email: email, password: password, displayName: displayName)
            me = try await client.me()
            isAuthenticated = true
        }
    }

    func logout() async {
        await client.logout()
        me = nil
        leaderboard = []
        keys = []
        isAuthenticated = false
    }

    func loadDashboard() async {
        do {
            me = try await client.me()
            isAuthenticated = true
        } catch APIError.unauthorized {
            await logout()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func loadLeaderboard() async {
        do {
            leaderboard = try await client.leaderboard().entries
        } catch {
            lastError = error.localizedDescription
        }
    }

    func loadKeys() async {
        do {
            keys = try await client.apiKeys().keys
        } catch APIError.unauthorized {
            await logout()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func createKey(label: String?) async -> NewAPIKey? {
        do {
            let key = try await client.createAPIKey(label: label)
            await loadKeys()
            return key
        } catch {
            lastError = error.localizedDescription
            return nil
        }
    }

    func revokeKey(id: String) async {
        do {
            try await client.revokeAPIKey(id: id)
            await loadKeys()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func fetchQuote(symbol: String) async throws -> Quote {
        try await client.quote(symbol: symbol)
    }

    func fetchChart(symbol: String, range: String) async throws -> ChartResponse {
        try await client.chart(symbol: symbol, range: range)
    }

    func placeOrder(symbol: String, qty: Double, side: String, type: String, limitPrice: Double?) async throws -> Order {
        let order = try await client.placeOrder(
            TradeRequest(
                symbol: symbol,
                qty: qty,
                side: side,
                type: type,
                limitPrice: limitPrice
            )
        )
        await loadDashboard()
        return order
    }

    private func runBusy(_ operation: () async throws -> Void) async {
        isBusy = true
        lastError = nil
        defer { isBusy = false }
        do {
            try await operation()
        } catch {
            lastError = error.localizedDescription
        }
    }
}
