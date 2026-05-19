import SwiftUI

struct TradeView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if let account = model.me?.account {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        MetricCard(title: "Buying power", value: Format.usd(account.cash), color: .ptGreen)
                        MetricCard(title: "Holdings", value: "\(model.me?.positions.count ?? 0)")
                    }
                }

                OrderTicketView()

                if let positions = model.me?.positions, !positions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Available to sell")
                            .font(.headline)
                        ForEach(positions) { position in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(position.symbol)
                                        .font(.headline.monospaced())
                                    Text(MarketData.name(for: position.symbol))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("\(Format.shares(position.qty)) shares")
                                    .font(.subheadline.monospacedDigit())
                            }
                            .padding()
                            .background(Color.ptElevated)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                    .padding()
                    .cardStyle()
                }
            }
            .padding()
        }
        .background(Color.ptBackground)
        .navigationTitle("Trade")
        .task { await model.loadDashboard() }
        .refreshable { await model.loadDashboard() }
    }
}
