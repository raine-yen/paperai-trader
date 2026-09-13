import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Group {
            if !model.checkedSession {
                SplashView()
                    .task { await model.checkSession() }
            } else if model.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .background(Color.ptBackground.ignoresSafeArea())
    }
}

private struct SplashView: View {
    var body: some View {
        VStack(spacing: 18) {
            LogoMark(size: 64)
            ProgressView()
                .tint(Color.ptGreen)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.ptBackground)
    }
}

struct MainTabView: View {
    @AppStorage("paperTraderAppearance") private var appearance = "dark"

    private var colorScheme: ColorScheme? {
        appearance == "light" ? .light : .dark
    }

    var body: some View {
        TabView {
            NavigationStack {
                DashboardView(appearance: $appearance)
            }
            .tabItem { Label("Dashboard", systemImage: "chart.line.uptrend.xyaxis") }

            NavigationStack {
                MarketView()
            }
            .tabItem { Label("Market", systemImage: "list.bullet.rectangle") }

            NavigationStack {
                TradeView()
            }
            .tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }

            NavigationStack {
                LeaderboardView()
            }
            .tabItem { Label("Leaders", systemImage: "trophy") }

            NavigationStack {
                APIKeysView()
            }
            .tabItem { Label("Keys", systemImage: "key") }
        }
        .tint(Color.ptGreen)
        .preferredColorScheme(colorScheme)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarBackground(Color.ptBackground, for: .tabBar)
    }
}

struct LogoMark: View {
    let size: CGFloat

    var body: some View {
        Text("P")
            .font(.system(size: size * 0.46, weight: .black, design: .rounded))
            .foregroundStyle(.black)
            .frame(width: size, height: size)
            .background(Color.ptGreen)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.22, style: .continuous))
    }
}
