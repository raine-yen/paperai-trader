import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg">
      <Nav email={data.user.email ?? undefined} />
      <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
