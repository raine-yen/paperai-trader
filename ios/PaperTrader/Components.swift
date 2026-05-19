import SwiftUI

enum Format {
    static let usdFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static let percentFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter
    }()

    static func usd(_ value: Double) -> String {
        Self.usdFormatter.string(from: NSNumber(value: value)) ?? "$\(value)"
    }

    static func percent(_ value: Double) -> String {
        Self.percentFormatter.string(from: NSNumber(value: value / 100)) ?? "\(value)%"
    }

    static func shares(_ value: Double) -> String {
        String(format: "%.4f", value)
    }

    static func compactDate(_ iso: String) -> String {
        guard let date = ISODateParser.date(from: iso) else { return iso }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

enum ISODateParser {
    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let standard = ISO8601DateFormatter()

    static func date(from value: String) -> Date? {
        fractional.date(from: value) ?? standard.date(from: value)
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    var caption: String?
    var color: Color = .white

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline.monospacedDigit().weight(.bold))
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            if let caption {
                Text(caption)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.ptElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Color.ptRed)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.ptRed.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct EmptyState: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .cardStyle()
    }
}

struct Sparkline: View {
    let values: [Double]
    var positive: Bool = true

    var body: some View {
        GeometryReader { proxy in
            if values.count < 2 {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.ptElevated)
                    Text("Chart data unavailable")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                let minValue = values.min() ?? 0
                let maxValue = values.max() ?? 1
                let span = max(maxValue - minValue, 1)
                let points = values.enumerated().map { index, value in
                    let x = proxy.size.width * CGFloat(index) / CGFloat(max(values.count - 1, 1))
                    let y = proxy.size.height - (proxy.size.height * CGFloat((value - minValue) / span))
                    return CGPoint(x: x, y: y)
                }
                ZStack {
                    LinearGradient(
                        colors: [(positive ? Color.ptGreen : Color.ptRed).opacity(0.24), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    Path { path in
                        guard let first = points.first else { return }
                        path.move(to: first)
                        for point in points.dropFirst() {
                            path.addLine(to: point)
                        }
                    }
                    .stroke(positive ? Color.ptGreen : Color.ptRed, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                }
            }
        }
        .frame(height: 170)
    }
}

struct StatusPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.16))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
