import SwiftUI

@main
struct PaperTraderApp: App {
    @StateObject private var model = AppModel(
        client: APIClient(baseURL: AppConfig.apiBaseURL)
    )

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
        }
    }
}
