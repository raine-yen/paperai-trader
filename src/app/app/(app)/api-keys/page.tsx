"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Trash2, KeyRound, AlertTriangle } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface KeyRow {
  id: string;
  key_id: string;
  label: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<{ key_id: string; secret: string } | null>(null);

  async function load() {
    const r = await fetch("/api/keys", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setKeys(j.keys ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function createKey() {
    setCreating(true);
    const r = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || undefined }),
    });
    if (r.ok) {
      const j = await r.json();
      setNewSecret(j);
      setLabel("");
      load();
    }
    setCreating(false);
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Any bot using it will stop working immediately.")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold mb-1">API Keys</h1>
        <p className="text-sm text-gray-400">
          Generate Alpaca-style key pairs for your AI agent. Each key is tied to your trading account.
        </p>
      </div>

      {newSecret && (
        <div className="card p-5 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Save your secret now</h3>
              <p className="text-sm text-gray-400 mb-3">
                This is the only time we'll show your secret. If you lose it, generate a new key.
              </p>
              <div className="space-y-2 font-mono text-sm">
                <CopyRow label="APCA-API-KEY-ID" value={newSecret.key_id} />
                <CopyRow label="APCA-API-SECRET-KEY" value={newSecret.secret} />
              </div>
              <button onClick={() => setNewSecret(null)} className="btn-ghost mt-4 text-xs">
                I've saved it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Create new key</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Label (e.g. 'My RSI bot')"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button onClick={createKey} disabled={creating} className="btn-primary">
            <Plus className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No keys yet. Generate your first one to start trading.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wider bg-bg-elevated">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Label</th>
                <th className="text-left py-3 px-4 font-medium">Key ID</th>
                <th className="text-left py-3 px-4 font-medium">Last Used</th>
                <th className="text-left py-3 px-4 font-medium">Created</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {keys.map((k) => (
                <tr key={k.id} className={k.revoked_at ? "opacity-40" : ""}>
                  <td className="py-3 px-4">{k.label ?? <span className="text-gray-500">—</span>}</td>
                  <td className="py-3 px-4 font-mono text-xs">{k.key_id}</td>
                  <td className="py-3 px-4 text-gray-400">{k.last_used_at ? timeAgo(k.last_used_at) : "never"}</td>
                  <td className="py-3 px-4 text-gray-400">{timeAgo(k.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    {k.revoked_at ? (
                      <span className="text-xs text-gray-500">revoked</span>
                    ) : (
                      <button onClick={() => revoke(k.id)} className="text-gray-400 hover:text-accent-red">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-44 flex-shrink-0">{label}</span>
      <code className="flex-1 px-2 py-1.5 bg-bg-elevated rounded border border-bg-border text-xs break-all">{value}</code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-ghost text-xs px-2 py-1.5 flex-shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
