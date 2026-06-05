import SwiftUI
import UIKit

extension Color {
    static let ptBackground = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.020, green: 0.024, blue: 0.027, alpha: 1)
            : UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 1)
    })
    static let ptCard = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.047, green: 0.059, blue: 0.071, alpha: 1)
            : UIColor(red: 0.961, green: 0.961, blue: 0.973, alpha: 1)
    })
    static let ptElevated = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.071, green: 0.086, blue: 0.102, alpha: 1)
            : UIColor(red: 0.941, green: 0.941, blue: 0.957, alpha: 1)
    })
    static let ptBorder = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.126, green: 0.149, blue: 0.176, alpha: 1)
            : UIColor(red: 0.902, green: 0.902, blue: 0.922, alpha: 1)
    })
    static let ptGreen = Color(red: 0.000, green: 0.784, blue: 0.325)
    static let ptRed = Color(red: 1.000, green: 0.322, blue: 0.322)
    static let ptBlue = Color(red: 0.212, green: 0.596, blue: 1.000)
    static let ptYellow = Color(red: 1.000, green: 0.816, blue: 0.278)
}

enum Haptics {
    static func lightTap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
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
