import SwiftUI

struct APIKeysView: View {
    @EnvironmentObject private var model: AppModel
    @State private var label = ""
    @State private var newKey: NewAPIKey?

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Bot API keys")
                        .font(.headline)
                    Text("Create Alpaca-compatible credentials for trading agents. The secret is shown once.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    TextField("Label, optional", text: $label)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task {
                            newKey = await model.createKey(label: label)
                            label = ""
                        }
                    } label: {
                        Label("Generate key", systemImage: "plus")
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.ptGreen)
                    .foregroundStyle(.black)
                }
                .padding()
                .cardStyle()

                if model.keys.isEmpty {
                    EmptyState(title: "No keys yet", message: "Generate a key to connect a bot to the /v2 API.")
                } else {
                    VStack(spacing: 10) {
                        ForEach(model.keys) { key in
                            APIKeyRow(key: key)
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color.ptBackground)
        .navigationTitle("API Keys")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Sign out") {
                    Task { await model.logout() }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await model.loadKeys() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task { await model.loadKeys() }
        .refreshable { await model.loadKeys() }
        .sheet(item: $newKey) { key in
            NewKeySheet(key: key)
        }
    }
}

private struct APIKeyRow: View {
    @EnvironmentObject private var model: AppModel
    let key: APIKey

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(key.label ?? "Trading bot")
                        .font(.headline)
                    Text(key.keyID)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                }
                Spacer()
                StatusPill(text: key.isRevoked ? "Revoked" : "Active", color: key.isRevoked ? .gray : .ptGreen)
            }

            HStack {
                Text("Created \(Format.compactDate(key.createdAt))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                if !key.isRevoked {
                    Button(role: .destructive) {
                        Task { await model.revokeKey(id: key.id) }
                    } label: {
                        Text("Revoke")
                    }
                    .font(.caption.weight(.bold))
                }
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

private struct NewKeySheet: View {
    @Environment(\.dismiss) private var dismiss
    let key: NewAPIKey

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Save this secret now. It cannot be recovered later.")
                    .font(.headline)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Key ID")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text(key.keyID)
                        .font(.body.monospaced())
                        .textSelection(.enabled)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Secret")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text(key.secret)
                        .font(.body.monospaced())
                        .textSelection(.enabled)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.ptElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                Spacer()
            }
            .padding()
            .background(Color.ptBackground)
            .navigationTitle("New API Key")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
