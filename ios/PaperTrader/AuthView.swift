import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var model: AppModel
    @State private var mode: AuthMode = .login
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 12) {
                    LogoMark(size: 58)
                    Text("Paper Trader")
                        .font(.largeTitle.weight(.black))
                    Text("Real market data. Paper money. Bot friendly.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 34)

                VStack(spacing: 16) {
                    Picker("Mode", selection: $mode) {
                        ForEach(AuthMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    if mode == .signup {
                        TextField("Display name", text: $displayName)
                            .textContentType(.name)
                            .textInputAutocapitalization(.words)
                            .textFieldStyle(.roundedBorder)
                    }

                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    SecureField("Password", text: $password)
                        .textContentType(mode == .login ? .password : .newPassword)
                        .textFieldStyle(.roundedBorder)

                    if let error = model.lastError {
                        ErrorBanner(message: error)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if model.isBusy {
                                ProgressView()
                                    .tint(.black)
                            }
                            Text(mode.buttonTitle)
                                .fontWeight(.black)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.ptGreen)
                    .foregroundStyle(.black)
                    .disabled(model.isBusy || !canSubmit)
                }
                .padding()
                .cardStyle()

                VStack(spacing: 6) {
                    Text(AppConfig.apiBaseURL.absoluteString)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                    Text("Configure API_BASE_URL in Info.plist for production.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding()
        }
        .background(Color.ptBackground)
    }

    private var canSubmit: Bool {
        let hasCredentials = email.contains("@") && password.count >= 6
        if mode == .signup {
            return hasCredentials && displayName.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
        }
        return hasCredentials
    }

    private func submit() async {
        switch mode {
        case .login:
            await model.login(email: email, password: password)
        case .signup:
            await model.signup(email: email, password: password, displayName: displayName)
        }
    }
}

private enum AuthMode: String, CaseIterable, Identifiable {
    case login
    case signup

    var id: String { rawValue }
    var title: String { self == .login ? "Log in" : "Sign up" }
    var buttonTitle: String { self == .login ? "Sign in" : "Create account" }
}
