import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <Nav email={data.user.email ?? undefined} />
      <main className="mx-auto w-full max-w-[1540px] px-4 py-5 lg:ml-72 lg:px-7 lg:py-7">{children}</main>
    </div>
  );
}
