import SwiftUI

extension Color {
    static let ptBackground = Color(red: 0.020, green: 0.024, blue: 0.027)
    static let ptCard = Color(red: 0.047, green: 0.059, blue: 0.071)
    static let ptElevated = Color(red: 0.071, green: 0.086, blue: 0.102)
    static let ptBorder = Color(red: 0.126, green: 0.149, blue: 0.176)
    static let ptGreen = Color(red: 0.000, green: 0.784, blue: 0.325)
    static let ptRed = Color(red: 1.000, green: 0.322, blue: 0.322)
    static let ptBlue = Color(red: 0.212, green: 0.596, blue: 1.000)
    static let ptYellow = Color(red: 1.000, green: 0.816, blue: 0.278)
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.ptCard)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.ptBorder, lineWidth: 1)
            )
    }
}
