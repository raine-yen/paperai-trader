import Foundation

enum APIError: LocalizedError {
    case badURL
    case unauthorized
    case server(status: Int, message: String)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .badURL:
            return "The backend URL is invalid."
        case .unauthorized:
            return "Please sign in again."
        case .server(_, let message):
            return message
        case .emptyResponse:
            return "The server returned an empty response."
        }
    }
}

final class APIClient {
    let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(baseURL: URL) {
        self.baseURL = baseURL
        let configuration = URLSessionConfiguration.default
        configuration.httpShouldSetCookies = true
        configuration.httpCookieAcceptPolicy = .always
        configuration.httpCookieStorage = HTTPCookieStorage.shared
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: configuration)
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
        HTTPCookieStorage.shared.cookieAcceptPolicy = .always
    }

    func login(email: String, password: String) async throws {
        let _: BasicResponse = try await post(
            "/api/auth/login",
            body: LoginRequest(email: email, password: password)
        )
    }

    func signup(email: String, password: String, displayName: String) async throws {
        let _: BasicResponse = try await post(
            "/api/auth/signup",
            body: SignupRequest(email: email, password: password, displayName: displayName)
        )
        try await login(email: email, password: password)
    }

    func logout() async {
        let _: BasicResponse? = try? await post("/api/auth/logout")
        clearCookies()
    }

    func me() async throws -> MeResponse {
        try await get("/api/me")
    }

    func quote(symbol: String) async throws -> Quote {
        try await get("/api/quote", queryItems: [URLQueryItem(name: "symbol", value: symbol)])
    }

    func chart(symbol: String, range: String) async throws -> ChartResponse {
        try await get("/api/chart", queryItems: [
            URLQueryItem(name: "symbol", value: symbol),
            URLQueryItem(name: "range", value: range)
        ])
    }

    func leaderboard() async throws -> LeaderboardResponse {
        try await get("/api/leaderboard")
    }

    func placeOrder(_ order: TradeRequest) async throws -> Order {
        try await post("/api/trade", body: order)
    }

    func apiKeys() async throws -> APIKeysResponse {
        try await get("/api/keys")
    }

    func createAPIKey(label: String?) async throws -> NewAPIKey {
        try await post("/api/keys", body: CreateAPIKeyRequest(label: label?.nilIfBlank))
    }

    func revokeAPIKey(id: String) async throws {
        let _: BasicResponse = try await delete("/api/keys/\(id)")
    }

    func clearCookies() {
        guard let cookies = HTTPCookieStorage.shared.cookies else { return }
        for cookie in cookies where cookie.domain.contains(baseURL.host ?? "") {
            HTTPCookieStorage.shared.deleteCookie(cookie)
        }
    }

    private func get<T: Decodable>(_ path: String, queryItems: [URLQueryItem] = []) async throws -> T {
        var request = URLRequest(url: try url(path, queryItems: queryItems))
        request.httpMethod = "GET"
        return try await send(request)
    }

    private func post<T: Decodable>(_ path: String) async throws -> T {
        var request = URLRequest(url: try url(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await send(request)
    }

    private func post<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        var request = URLRequest(url: try url(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func delete<T: Decodable>(_ path: String) async throws -> T {
        var request = URLRequest(url: try url(path))
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await send(request)
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.emptyResponse
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            let message = (try? decoder.decode(ServerError.self, from: data).error) ?? "Request failed."
            throw APIError.server(status: http.statusCode, message: message)
        }

        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }

        return try decoder.decode(T.self, from: data)
    }

    private func url(_ path: String, queryItems: [URLQueryItem] = []) throws -> URL {
        var url = baseURL
        let cleaned = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        for component in cleaned.split(separator: "/") {
            url.appendPathComponent(String(component))
        }

        if !queryItems.isEmpty {
            guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
                throw APIError.badURL
            }
            components.queryItems = queryItems
            guard let queryURL = components.url else { throw APIError.badURL }
            return queryURL
        }

        return url
    }
}
