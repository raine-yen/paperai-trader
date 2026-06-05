import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var model: AppModel
    @Binding var appearance: String
    @State private var selectedSymbol: DashboardSymbol?
    @State private var showRecentOrders = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let error = model.lastError {
                    ErrorBanner(message: error)
                        .padding(.bottom, 16)
                }

                if let data = model.me, let account = data.account {
                    PortfolioHeader(account: account, snapshots: data.snapshots)
                    HoldingsSection(positions: data.positions) { symbol in
                        Haptics.lightTap()
                        selectedSymbol = DashboardSymbol(symbol: symbol)
                    }
                    OrdersSection(orders: data.orders, isExpanded: $showRecentOrders)
                } else if model.me?.account == nil && model.me != nil {
                    EmptyState(
                        title: "No trading account found",
                        message: "Ask your club admin to activate your paper account."
                    )
                } else {
                    ProgressView()
                        .tint(Color.ptGreen)
                        .frame(maxWidth: .infinity, minHeight: 260)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Color.ptBackground)
        .navigationTitle("Dashboard")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Haptics.lightTap()
                    appearance = appearance == "dark" ? "light" : "dark"
                } label: {
                    Image(systemName: appearance == "dark" ? "sun.max" : "moon")
                }
                .accessibilityLabel(appearance == "dark" ? "Switch to light mode" : "Switch to dark mode")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Haptics.lightTap()
                    Task { await model.loadDashboard() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task { await model.loadDashboard() }
        .refreshable { await model.loadDashboard() }
        .sheet(item: $selectedSymbol) { selected in
            NavigationStack {
                SymbolDetailView(symbol: selected.symbol)
            }
        }
    }
}

private struct PortfolioHeader: View {
    let account: Account
    let snapshots: [EquitySnapshot]

    private var totalReturn: Double { account.equity - account.startingCash }
    private var totalReturnPct: Double { account.startingCash > 0 ? totalReturn / account.startingCash * 100 : 0 }
    private var isUp: Bool { totalReturn >= 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Total net worth")
                    .font(.caption.weight(.bold))
                    .textCase(.uppercase)
                    .foregroundStyle(.secondary)
                Text(Format.usd(account.equity))
                    .font(.system(size: 44, weight: .black, design: .rounded))
                    .monospacedDigit()
                    .minimumScaleFactor(0.68)
                    .lineLimit(1)
                Label("\(Format.usd(totalReturn)) (\(Format.percent(totalReturnPct))) all time", systemImage: isUp ? "arrow.up.right" : "arrow.down.right")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(isUp ? Color.ptGreen : Color.ptRed)
            }

            Sparkline(values: snapshots.map(\.equity), positive: isUp)

            VStack(spacing: 0) {
                MetricLine(title: "Cash", value: Format.usd(account.cash))
                MetricLine(title: "Invested", value: Format.usd(account.positionsValue))
                MetricLine(title: "Return", value: Format.percent(totalReturnPct), color: isUp ? .ptGreen : .ptRed)
            }
        }
        .padding(.bottom, 22)
        .sectionDivider()
    }
}

private struct HoldingsSection: View {
    let positions: [Position]
    let openSymbol: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(title: "Holdings", subtitle: "Tap a symbol for detail")

            if positions.isEmpty {
                Text("No open positions yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 18)
            } else {
                ForEach(positions.prefix(4)) { position in
                    Button {
                        openSymbol(position.symbol)
                    } label: {
                        PositionRow(position: position)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 22)
        .sectionDivider()
    }
}

private struct OrdersSection: View {
    let orders: [Order]
    @Binding var isExpanded: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                Haptics.lightTap()
                withAnimation(.smooth(duration: 0.24)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    SectionHeader(title: "Recent Orders", subtitle: isExpanded ? "Hide activity" : "Show latest activity")
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.bold))
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                if orders.isEmpty {
                    Text("No orders yet.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 18)
                } else {
                    ForEach(Array(orders.prefix(6))) { order in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(order.symbol)
                                        .font(.headline.monospaced())
                                    StatusPill(text: order.side.uppercased(), color: order.side == "buy" ? .ptGreen : .ptRed)
                                }
                                Text("\(Format.shares(order.qty)) shares")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                StatusPill(text: order.status.replacingOccurrences(of: "_", with: " "), color: order.status == "filled" ? .ptGreen : .ptBlue)
                                Text(order.filledAvgPrice.map(Format.usd) ?? order.type)
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 12)
                        .overlay(alignment: .bottom) {
                            Color.ptBorder.frame(height: 1)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 22)
    }
}

private struct DashboardSymbol: Identifiable {
    let symbol: String
    var id: String { symbol }
}

private struct SectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.bottom, 12)
    }
}

private struct PositionRow: View {
    let position: Position

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(position.symbol)
                    .font(.headline.monospaced())
                Text(MarketData.name(for: position.symbol))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(Format.usd(position.marketValue))
                    .font(.headline.monospacedDigit())
                Text("\(Format.usd(position.unrealizedPL)) \(Format.percent(position.unrealizedPLPC))")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(position.unrealizedPL >= 0 ? Color.ptGreen : Color.ptRed)
            }
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Color.ptBorder.frame(height: 1)
        }
    }
}

private struct MetricLine: View {
    let title: String
    let value: String
    var color: Color = .primary

    var body: some View {
        HStack {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Spacer()
            Text(value)
                .font(.subheadline.monospacedDigit().weight(.bold))
                .foregroundStyle(color)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) {
            Color.ptBorder.frame(height: 1)
        }
    }
}

private extension View {
    func sectionDivider() -> some View {
        overlay(alignment: .bottom) {
            Color.ptBorder.frame(height: 1)
        }
    }
}
