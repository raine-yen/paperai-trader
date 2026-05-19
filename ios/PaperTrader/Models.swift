import Foundation

struct EmptyResponse: Decodable {}

struct BasicResponse: Decodable {
    let ok: Bool?
}

struct ServerError: Decodable {
    let error: String?
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct SignupRequest: Encodable {
    let email: String
    let password: String
    let displayName: String

    enum CodingKeys: String, CodingKey {
        case email
        case password
        case displayName = "display_name"
    }
}

struct CreateAPIKeyRequest: Encodable {
    let label: String?
}

struct TradeRequest: Encodable {
    let symbol: String
    let qty: Double
    let side: String
    let type: String
    let limitPrice: Double?

    enum CodingKeys: String, CodingKey {
        case symbol
        case qty
        case side
        case type
        case limitPrice = "limit_price"
    }
}

struct MeResponse: Decodable {
    let user: UserSummary?
    let account: Account?
    let positions: [Position]
    let orders: [Order]
    let fills: [Fill]
    let snapshots: [EquitySnapshot]

    enum CodingKeys: String, CodingKey {
        case user
        case account
        case positions
        case orders
        case fills
        case snapshots
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        user = try container.decodeIfPresent(UserSummary.self, forKey: .user)
        account = try container.decodeIfPresent(Account.self, forKey: .account)
        positions = try container.decodeIfPresent([Position].self, forKey: .positions) ?? []
        orders = try container.decodeIfPresent([Order].self, forKey: .orders) ?? []
        fills = try container.decodeIfPresent([Fill].self, forKey: .fills) ?? []
        snapshots = try container.decodeIfPresent([EquitySnapshot].self, forKey: .snapshots) ?? []
    }
}

struct UserSummary: Decodable {
    let id: String
    let email: String?
}

struct Account: Decodable, Identifiable {
    let id: String
    let displayName: String
    let cash: Double
    let startingCash: Double
    let equity: Double
    let positionsValue: Double

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case cash
        case startingCash = "starting_cash"
        case equity
        case positionsValue = "positions_value"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        displayName = try container.decode(String.self, forKey: .displayName)
        cash = try container.decodeFlexibleDouble(forKey: .cash)
        startingCash = try container.decodeFlexibleDouble(forKey: .startingCash)
        equity = try container.decodeFlexibleDouble(forKey: .equity)
        positionsValue = try container.decodeFlexibleDoubleIfPresent(forKey: .positionsValue) ?? max(0, equity - cash)
    }
}

struct Position: Decodable, Identifiable {
    var id: String { symbol }
    let symbol: String
    let qty: Double
    let avgEntryPrice: Double
    let currentPrice: Double
    let marketValue: Double
    let unrealizedPL: Double
    let unrealizedPLPC: Double

    enum CodingKeys: String, CodingKey {
        case symbol
        case qty
        case avgEntryPrice = "avg_entry_price"
        case currentPrice = "current_price"
        case marketValue = "market_value"
        case unrealizedPL = "unrealized_pl"
        case unrealizedPLPC = "unrealized_plpc"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        symbol = try container.decode(String.self, forKey: .symbol)
        qty = try container.decodeFlexibleDouble(forKey: .qty)
        avgEntryPrice = try container.decodeFlexibleDouble(forKey: .avgEntryPrice)
        currentPrice = try container.decodeFlexibleDouble(forKey: .currentPrice)
        marketValue = try container.decodeFlexibleDouble(forKey: .marketValue)
        unrealizedPL = try container.decodeFlexibleDouble(forKey: .unrealizedPL)
        unrealizedPLPC = try container.decodeFlexibleDouble(forKey: .unrealizedPLPC)
    }
}

struct Order: Decodable, Identifiable {
    let id: String
    let symbol: String
    let qty: Double
    let side: String
    let type: String
    let status: String
    let createdAt: String
    let filledAvgPrice: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case symbol
        case qty
        case side
        case type
        case status
        case createdAt = "created_at"
        case filledAvgPrice = "filled_avg_price"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        symbol = try container.decode(String.self, forKey: .symbol)
        qty = try container.decodeFlexibleDouble(forKey: .qty)
        side = try container.decode(String.self, forKey: .side)
        type = try container.decode(String.self, forKey: .type)
        status = try container.decode(String.self, forKey: .status)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        filledAvgPrice = try container.decodeFlexibleDoubleIfPresent(forKey: .filledAvgPrice)
    }
}

struct Fill: Decodable, Identifiable {
    let id: String
    let symbol: String
    let qty: Double
    let price: Double
    let side: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case symbol
        case qty
        case price
        case side
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        symbol = try container.decode(String.self, forKey: .symbol)
        qty = try container.decodeFlexibleDouble(forKey: .qty)
        price = try container.decodeFlexibleDouble(forKey: .price)
        side = try container.decode(String.self, forKey: .side)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
    }
}

struct EquitySnapshot: Decodable, Identifiable {
    var id: String { createdAt }
    let equity: Double
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case equity
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        equity = try container.decodeFlexibleDouble(forKey: .equity)
        createdAt = try container.decode(String.self, forKey: .createdAt)
    }
}

struct Quote: Decodable {
    let symbol: String
    let price: Double
    let prevClose: Double?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case symbol
        case price
        case prevClose
        case updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        symbol = try container.decodeIfPresent(String.self, forKey: .symbol) ?? ""
        price = try container.decodeFlexibleDouble(forKey: .price)
        prevClose = try container.decodeFlexibleDoubleIfPresent(forKey: .prevClose)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

struct ChartResponse: Decodable {
    let symbol: String
    let range: String
    let bars: [PriceBar]
}

struct PriceBar: Decodable, Identifiable {
    var id: String { t }
    let t: String
    let close: Double

    enum CodingKeys: String, CodingKey {
        case t
        case close = "c"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        t = try container.decode(String.self, forKey: .t)
        close = try container.decodeFlexibleDouble(forKey: .close)
    }
}

struct LeaderboardResponse: Decodable {
    let entries: [LeaderboardEntry]
}

struct LeaderboardEntry: Decodable, Identifiable {
    var id: String { accountID }
    let accountID: String
    let displayName: String
    let email: String?
    let equity: Double
    let startingCash: Double
    let returnPct: Double

    enum CodingKeys: String, CodingKey {
        case accountID = "account_id"
        case displayName = "display_name"
        case email
        case equity
        case startingCash = "starting_cash"
        case returnPct = "return_pct"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accountID = try container.decode(String.self, forKey: .accountID)
        displayName = try container.decode(String.self, forKey: .displayName)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        equity = try container.decodeFlexibleDouble(forKey: .equity)
        startingCash = try container.decodeFlexibleDouble(forKey: .startingCash)
        returnPct = try container.decodeFlexibleDouble(forKey: .returnPct)
    }
}

struct APIKeysResponse: Decodable {
    let keys: [APIKey]
}

struct APIKey: Decodable, Identifiable {
    let id: String
    let keyID: String
    let label: String?
    let lastUsedAt: String?
    let revokedAt: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case keyID = "key_id"
        case label
        case lastUsedAt = "last_used_at"
        case revokedAt = "revoked_at"
        case createdAt = "created_at"
    }

    var isRevoked: Bool { revokedAt != nil }
}

struct NewAPIKey: Decodable, Identifiable {
    var id: String { keyID }
    let keyID: String
    let secret: String

    enum CodingKeys: String, CodingKey {
        case keyID = "key_id"
        case secret
    }
}

extension KeyedDecodingContainer {
    func decodeFlexibleDouble(forKey key: Key) throws -> Double {
        if let value = try? decode(Double.self, forKey: key) {
            return value
        }
        if let value = try? decode(Int.self, forKey: key) {
            return Double(value)
        }
        if let value = try? decode(String.self, forKey: key), let number = Double(value) {
            return number
        }
        throw DecodingError.dataCorruptedError(
            forKey: key,
            in: self,
            debugDescription: "Expected a numeric value."
        )
    }

    func decodeFlexibleDoubleIfPresent(forKey key: Key) throws -> Double? {
        if !contains(key) {
            return nil
        }
        if try decodeNil(forKey: key) {
            return nil
        }
        return try decodeFlexibleDouble(forKey: key)
    }
}

extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
