import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let error = model.lastError {
                    ErrorBanner(message: error)
                }

                if let data = model.me, let account = data.account {
                    PortfolioHeader(account: account, snapshots: data.snapshots)
                    HoldingsSection(positions: data.positions)
                    OrdersSection(orders: data.orders)
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
            .padding()
        }
        .background(Color.ptBackground)
        .navigationTitle("Dashboard")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await model.loadDashboard() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task { await model.loadDashboard() }
        .refreshable { await model.loadDashboard() }
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
                Text("Portfolio")
                    .font(.caption.weight(.bold))
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

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCard(title: "Cash", value: Format.usd(account.cash))
                MetricCard(title: "Invested", value: Format.usd(account.positionsValue))
                MetricCard(title: "Return", value: Format.percent(totalReturnPct), color: isUp ? .ptGreen : .ptRed)
                MetricCard(title: "Account", value: account.displayName)
            }
        }
        .padding()
        .cardStyle()
    }
}

private struct HoldingsSection: View {
    let positions: [Position]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Holdings")
                .font(.headline)

            if positions.isEmpty {
                Text("No open positions yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.ptElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                ForEach(positions) { position in
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
                    }
                    .padding()
                    .background(Color.ptElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
        .padding()
        .cardStyle()
    }
}

private struct OrdersSection: View {
    let orders: [Order]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Orders")
                .font(.headline)

            if orders.isEmpty {
                Text("No orders yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.ptElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                ForEach(Array(orders.prefix(12))) { order in
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
                    .padding()
                    .background(Color.ptElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
        .padding()
        .cardStyle()
    }
}
