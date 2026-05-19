import SwiftUI

struct OrderTicketView: View {
    @EnvironmentObject private var model: AppModel
    @State private var symbol: String
    @State private var side: OrderSide
    @State private var orderType: OrderType = .market
    @State private var amount = "1"
    @State private var limitPrice = ""
    @State private var quote: Quote?
    @State private var loadingQuote = false
    @State private var submitting = false
    @State private var result: String?
    @State private var resultIsSuccess = true

    init(initialSymbol: String = "AAPL", initialSide: OrderSide = .buy) {
        _symbol = State(initialValue: initialSymbol.uppercased())
        _side = State(initialValue: initialSide)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Order Ticket")
                    .font(.headline)
                TextField("Symbol", text: $symbol)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.headline.monospaced())
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { Task { await refreshQuote() } }
            }

            if let quote {
                VStack(alignment: .leading, spacing: 4) {
                    Text(MarketData.name(for: quote.symbol.isEmpty ? symbol : quote.symbol))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(Format.usd(quote.price))
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .monospacedDigit()
                    if let prevClose = quote.prevClose {
                        let change = quote.price - prevClose
                        Text("\(change >= 0 ? "+" : "")\(Format.usd(change)) today")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(change >= 0 ? Color.ptGreen : Color.ptRed)
                    }
                }
            } else {
                Button {
                    Task { await refreshQuote() }
                } label: {
                    Label(loadingQuote ? "Loading quote" : "Load quote", systemImage: "waveform.path.ecg")
                }
                .disabled(loadingQuote || cleanSymbol.isEmpty)
            }

            Picker("Side", selection: $side) {
                ForEach(OrderSide.allCases) { side in
                    Text(side.title).tag(side)
                }
            }
            .pickerStyle(.segmented)

            Picker("Order type", selection: $orderType) {
                ForEach(OrderType.allCases) { type in
                    Text(type.title).tag(type)
                }
            }
            .pickerStyle(.segmented)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Quantity")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    TextField("0", text: $amount)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                }

                if orderType == .limit {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Limit")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                        TextField("0.00", text: $limitPrice)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }
            }

            VStack(spacing: 8) {
                SummaryRow(label: "Buying power", value: Format.usd(account?.cash ?? 0))
                SummaryRow(label: "Owned", value: "\(Format.shares(ownedQty)) \(cleanSymbol)")
                SummaryRow(label: side == .buy ? "Estimated cost" : "Estimated proceeds", value: Format.usd(notional), bold: true)
            }
            .padding()
            .background(Color.ptElevated)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            if let validationMessage {
                ErrorBanner(message: validationMessage)
            }

            if let result {
                Text(result)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(resultIsSuccess ? Color.ptGreen : Color.ptRed)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background((resultIsSuccess ? Color.ptGreen : Color.ptRed).opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button {
                Task { await submit() }
            } label: {
                HStack {
                    if submitting {
                        ProgressView()
                            .tint(side == .buy ? .black : .white)
                    }
                    Text("\(side.title) \(cleanSymbol)")
                        .fontWeight(.black)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(side == .buy ? Color.ptGreen : Color.ptRed)
            .foregroundStyle(side == .buy ? .black : .white)
            .disabled(!canSubmit)
        }
        .padding()
        .cardStyle()
        .task { await refreshQuote() }
        .onChange(of: cleanSymbol) { _, _ in
            quote = nil
            result = nil
        }
    }

    private var account: Account? {
        model.me?.account
    }

    private var cleanSymbol: String {
        symbol.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    }

    private var quantity: Double {
        Double(amount) ?? 0
    }

    private var ownedQty: Double {
        model.me?.positions.first(where: { $0.symbol == cleanSymbol })?.qty ?? 0
    }

    private var notional: Double {
        quantity * (quote?.price ?? 0)
    }

    private var limitValue: Double? {
        guard orderType == .limit else { return nil }
        return Double(limitPrice)
    }

    private var validationMessage: String? {
        if cleanSymbol.isEmpty { return "Enter a ticker symbol." }
        if quote == nil { return "Load a valid quote before submitting." }
        if quantity <= 0 { return "Quantity must be greater than zero." }
        if side == .sell && ownedQty <= 0 { return "You do not own \(cleanSymbol)." }
        if side == .sell && quantity > ownedQty + 0.00001 { return "You can sell up to \(Format.shares(ownedQty)) shares." }
        if side == .buy && notional > (account?.cash ?? 0) + 0.01 { return "This order is above your buying power." }
        if orderType == .limit && (limitValue ?? 0) <= 0 { return "Enter a valid limit price." }
        return nil
    }

    private var canSubmit: Bool {
        validationMessage == nil && !submitting
    }

    private func refreshQuote() async {
        guard !cleanSymbol.isEmpty else { return }
        loadingQuote = true
        defer { loadingQuote = false }
        do {
            let next = try await model.fetchQuote(symbol: cleanSymbol)
            quote = next
            if limitPrice.isEmpty {
                limitPrice = String(format: "%.2f", next.price)
            }
        } catch {
            result = error.localizedDescription
            resultIsSuccess = false
        }
    }

    private func submit() async {
        guard canSubmit else { return }
        submitting = true
        defer { submitting = false }
        do {
            let order = try await model.placeOrder(
                symbol: cleanSymbol,
                qty: quantity,
                side: side.rawValue,
                type: orderType.rawValue,
                limitPrice: limitValue
            )
            result = "\(side.title) order \(order.status == "filled" ? "filled" : "submitted") for \(Format.shares(order.qty)) \(order.symbol)."
            resultIsSuccess = true
            amount = ""
        } catch {
            result = error.localizedDescription
            resultIsSuccess = false
        }
    }
}

private struct SummaryRow: View {
    let label: String
    let value: String
    var bold = false

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(bold ? .bold : .medium)
                .monospacedDigit()
        }
        .font(.subheadline)
    }
}

enum OrderSide: String, CaseIterable, Identifiable {
    case buy
    case sell

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum OrderType: String, CaseIterable, Identifiable {
    case market
    case limit

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}
