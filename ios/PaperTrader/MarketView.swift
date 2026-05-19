import SwiftUI

struct MarketView: View {
    @EnvironmentObject private var model: AppModel
    @State private var category = "Popular"
    @State private var quotes: [String: Quote] = [:]
    @State private var search = ""
    @State private var selected: SelectedSymbol?
    @State private var loadingSymbols = Set<String>()

    private var categories: [String] {
        ["Owned"] + MarketData.groups.keys.sorted { lhs, rhs in
            if lhs == "Popular" { return true }
            if rhs == "Popular" { return false }
            return lhs < rhs
        }
    }

    private var symbols: [String] {
        if category == "Owned" {
            return model.me?.positions.map(\.symbol).sorted() ?? []
        }
        return MarketData.groups[category] ?? []
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    SearchBox(search: $search) {
                        let symbol = search.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                        if !symbol.isEmpty {
                            selected = SelectedSymbol(symbol: symbol)
                        }
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(categories, id: \.self) { item in
                                Button(item) {
                                    category = item
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(category == item ? .white : Color.ptElevated)
                                .foregroundStyle(category == item ? .black : .white)
                            }
                        }
                    }

                    if symbols.isEmpty {
                        EmptyState(title: "No symbols here", message: "Switch to Popular or search for any ticker.")
                    } else {
                        VStack(spacing: 10) {
                            ForEach(symbols, id: \.self) { symbol in
                                MarketRow(
                                    symbol: symbol,
                                    quote: quotes[symbol],
                                    position: model.me?.positions.first(where: { $0.symbol == symbol }),
                                    isLoading: loadingSymbols.contains(symbol)
                                ) {
                                    selected = SelectedSymbol(symbol: symbol)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.ptBackground)
        .navigationTitle("Market")
        .task { await model.loadDashboard() }
        .task(id: category) { await loadQuotes() }
        .refreshable {
            await model.loadDashboard()
            await loadQuotes(force: true)
        }
        .sheet(item: $selected) { selected in
            NavigationStack {
                SymbolDetailView(symbol: selected.symbol)
            }
        }
    }

    private func loadQuotes(force: Bool = false) async {
        for symbol in symbols where force || quotes[symbol] == nil {
            loadingSymbols.insert(symbol)
            defer { loadingSymbols.remove(symbol) }
            if let quote = try? await model.fetchQuote(symbol: symbol) {
                quotes[symbol] = quote
            }
        }
    }
}

private struct SearchBox: View {
    @Binding var search: String
    let submit: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search any symbol", text: $search)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .font(.body.monospaced())
                .onSubmit(submit)
            Button("Open", action: submit)
                .font(.subheadline.weight(.bold))
        }
        .padding()
        .background(Color.ptElevated)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct MarketRow: View {
    let symbol: String
    let quote: Quote?
    let position: Position?
    let isLoading: Bool
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(spacing: 12) {
                Text(String(symbol.prefix(2)))
                    .font(.caption.weight(.black).monospaced())
                    .foregroundStyle(.black)
                    .frame(width: 42, height: 42)
                    .background(Color.ptGreen)
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(symbol)
                            .font(.headline.monospaced())
                        if position != nil {
                            StatusPill(text: "Owned", color: .ptGreen)
                        }
                    }
                    Text(MarketData.name(for: symbol))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    if isLoading {
                        ProgressView()
                            .tint(Color.ptGreen)
                    } else {
                        Text(quote.map { Format.usd($0.price) } ?? "-")
                            .font(.headline.monospacedDigit())
                        if let quote, let prev = quote.prevClose {
                            let pct = (quote.price - prev) / prev * 100
                            Text(Format.percent(pct))
                                .font(.caption.weight(.bold))
                                .foregroundStyle(pct >= 0 ? Color.ptGreen : Color.ptRed)
                        }
                    }
                }
            }
            .padding()
            .background(Color.ptCard)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.ptBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct SymbolDetailView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    let symbol: String
    @State private var quote: Quote?
    @State private var bars: [PriceBar] = []
    @State private var range = "1mo"

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(alignment: .leading, spacing: 14) {
                    Text(symbol)
                        .font(.system(size: 42, weight: .black, design: .rounded))
                        .monospaced()
                    Text(MarketData.name(for: symbol))
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    if let quote {
                        Text(Format.usd(quote.price))
                            .font(.system(size: 38, weight: .black, design: .rounded))
                            .monospacedDigit()
                    }
                    Picker("Range", selection: $range) {
                        Text("1D").tag("1d")
                        Text("1W").tag("5d")
                        Text("1M").tag("1mo")
                        Text("3M").tag("3mo")
                        Text("1Y").tag("1y")
                    }
                    .pickerStyle(.segmented)
                    Sparkline(values: bars.map(\.close), positive: isUp)
                }
                .padding()
                .cardStyle()

                OrderTicketView(initialSymbol: symbol)
            }
            .padding()
        }
        .background(Color.ptBackground)
        .navigationTitle(symbol)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Done") { dismiss() }
            }
        }
        .task { await load() }
        .task(id: range) { await loadChart() }
    }

    private var isUp: Bool {
        guard let first = bars.first?.close, let last = bars.last?.close else { return true }
        return last >= first
    }

    private func load() async {
        quote = try? await model.fetchQuote(symbol: symbol)
        await loadChart()
    }

    private func loadChart() async {
        bars = (try? await model.fetchChart(symbol: symbol, range: range).bars) ?? []
    }
}

private struct SelectedSymbol: Identifiable {
    let symbol: String
    var id: String { symbol }
}
