"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LineChart, Trophy, KeyRound, BookOpen, LogOut, TrendingUp, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
  { href: "/market", label: "Market", icon: BarChart2 },
  { href: "/trade", label: "Trade", icon: TrendingUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Nav({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-bg-border bg-bg-card/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link href="/dashboard" className="flex items-center gap-2 mr-6">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-accent to-accent-green flex items-center justify-center font-bold text-black text-sm">
            P
          </div>
          <span className="font-semibold tracking-tight">Paper Trader</span>
        </Link>
        <div className="flex items-center gap-1 flex-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  active ? "bg-bg-elevated text-white" : "text-gray-400 hover:text-white hover:bg-bg-elevated/60"
                )}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="text-xs text-gray-500 hidden md:inline">{email}</span>}
          <button onClick={logout} className="btn-ghost text-xs px-2 py-1">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
