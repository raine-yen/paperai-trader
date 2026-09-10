import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { WatchlistRail } from "@/components/watchlist-rail";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <Nav email={data.user.email ?? undefined} />
      <main className="vanta-app-main">{children}</main>
      <WatchlistRail />
    </div>
  );
}
