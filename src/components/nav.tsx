"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, BookOpen, KeyRound, LineChart, LogOut, Menu, MessageCircle, Search, Settings, ShieldCheck, Trophy, X } from "lucide-react";
import { useState } from "react";
import { isAdminEmail } from "@/lib/admin";
import { cn } from "@/lib/utils";

const BASE_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LineChart },
  { href: "/market", label: "Discover", icon: Search },
  { href: "/trade", label: "Trade", icon: BarChart2 },
  { href: "/leaderboard", label: "Compete", icon: Trophy },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Nav({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = isAdminEmail(email);
  const items = isAdmin ? [...BASE_ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : BASE_ITEMS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = (
    <>
      {items.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-accent-green text-black shadow-[0_0_24px_rgba(0,200,83,.18)]" : "text-gray-400 hover:bg-white/[0.045] hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-bg-border bg-bg/90 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r lg:bg-black/30">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 lg:h-full lg:flex-col lg:items-stretch lg:px-4 lg:py-5">
          <button className="btn-ghost px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex min-w-fit items-center gap-3 lg:px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-green font-black text-black">P</div>
            <div className="hidden sm:block lg:block">
              <div className="font-black leading-tight tracking-tight">Paper <span className="text-accent-green">Trader</span></div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Simulate. Compete.</div>
            </div>
          </Link>

          <div className="ml-4 hidden flex-1 items-center gap-1 lg:ml-0 lg:mt-7 lg:flex lg:flex-col lg:items-stretch">{links}</div>

          <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:mt-auto lg:flex-col lg:items-stretch">
            <div className="hidden items-center gap-2 rounded-full border border-bg-border bg-bg-card px-3 py-1.5 text-xs text-gray-400 md:flex lg:rounded-lg">
              <span className="h-2 w-2 rounded-full bg-accent-green shadow-[0_0_16px_rgba(0,200,83,.75)]" />
              Market data online
            </div>
            {email && <span className="hidden max-w-[220px] truncate text-xs text-gray-500 xl:inline lg:block">{email}</span>}
            <button onClick={logout} className="btn-ghost px-2.5 lg:justify-start" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full w-80 max-w-[84vw] border-r border-bg-border bg-bg-card p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green font-black text-black">P</div>
                <div className="font-semibold">Paper Trader</div>
              </div>
              <button className="btn-ghost px-2" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">{links}</div>
          </div>
        </div>
      )}
    </>
  );
}
