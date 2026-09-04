"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Compass, LogOut, Menu, Trophy, TrendingUp, UserRound, X } from "lucide-react";
import { useState } from "react";
import { ThemeSelector } from "@/components/theme-selector";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Investing", icon: TrendingUp },
  { href: "/market", label: "Discover", icon: Compass },
  { href: "/leaderboard", label: "Compete", icon: Trophy },
  { href: "/messages", label: "Activity", icon: Activity },
  { href: "/settings", label: "Account", icon: UserRound },
];

export function Nav({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = NAV_ITEMS.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("vanta-nav-link", active && "is-active")}>
        <Icon aria-hidden className="h-[18px] w-[18px]" />
        <span>{label}</span>
      </Link>
    );
  });

  return (
    <>
      <nav className="vanta-rail" aria-label="Primary navigation">
        <div className="vanta-rail-head">
          <button className="vanta-mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <Link href="/dashboard" className="vanta-lockup" aria-label="Vanta home">
            <span className="vanta-mark" aria-hidden>V</span>
            <span className="vanta-lockup-copy"><strong>Vanta</strong><small>PAPER</small></span>
          </Link>
        </div>
        <div className="vanta-rail-links">{links}</div>
        <div className="vanta-rail-bottom">
          <div className="vanta-safety-card" aria-label="Paper account safety status"><span>Starting balance</span><strong>$0,000</strong><small>Paper funds only</small></div>
          <div className="flex items-center justify-between gap-2 px-2"><ThemeSelector compact /><button onClick={logout} className="vanta-icon-button" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></div>
          {email ? <span className="truncate px-2 text-[10px] text-gray-500" title={email}>{email}</span> : null}
        </div>
      </nav>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <div className="vanta-mobile-drawer">
            <div className="flex items-center justify-between"><Link href="/dashboard" onClick={() => setOpen(false)} className="vanta-lockup"><span className="vanta-mark" aria-hidden>V</span><span className="vanta-lockup-copy"><strong>Vanta</strong><small>PAPER</small></span></Link><button className="vanta-icon-button" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button></div>
            <div className="mt-8 grid gap-1">{links}</div>
            <div className="mt-8 flex items-center justify-between border-t border-bg-border pt-4"><ThemeSelector compact /><button onClick={logout} className="vanta-icon-button" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
