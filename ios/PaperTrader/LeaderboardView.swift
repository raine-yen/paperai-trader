import SwiftUI

struct LeaderboardView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let first = model.leaderboard.first {
                    PodiumCard(entry: first, rank: 1)
                }

                VStack(spacing: 10) {
                    ForEach(Array(model.leaderboard.enumerated()), id: \.element.id) { index, entry in
                        LeaderboardRow(entry: entry, rank: index + 1)
                    }
                }
            }
            .padding()
        }
        .background(Color.ptBackground)
        .navigationTitle("Leaderboard")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await model.loadLeaderboard() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task { await model.loadLeaderboard() }
        .refreshable { await model.loadLeaderboard() }
    }
}

private struct PodiumCard: View {
    let entry: LeaderboardEntry
    let rank: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Rank \(rank)", systemImage: "trophy.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.ptGreen)
            Text(entry.displayName)
                .font(.title2.weight(.black))
            HStack {
                MetricCard(title: "Equity", value: Format.usd(entry.equity))
                MetricCard(title: "Return", value: Format.percent(entry.returnPct), color: entry.returnPct >= 0 ? .ptGreen : .ptRed)
            }
        }
        .padding()
        .cardStyle()
    }
}

private struct LeaderboardRow: View {
    let entry: LeaderboardEntry
    let rank: Int

    private var profitLoss: Double { entry.equity - entry.startingCash }

    var body: some View {
        HStack(spacing: 12) {
            Text("#\(rank)")
                .font(.headline.monospaced())
                .foregroundStyle(rank <= 3 ? Color.ptGreen : .secondary)
                .frame(width: 48, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.displayName)
                    .font(.headline)
                Text(entry.email ?? "Starting \(Format.usd(entry.startingCash))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(Format.percent(entry.returnPct))
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(entry.returnPct >= 0 ? Color.ptGreen : Color.ptRed)
                Text(Format.usd(profitLoss))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
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
}
