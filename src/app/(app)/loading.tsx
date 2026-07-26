export default function AppLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading your trading dashboard">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 animate-pulse rounded-full bg-accent-green" />
        <span className="text-sm font-semibold text-gray-400">Loading live paper portfolio…</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="card h-96 animate-pulse bg-bg-card" />
        <div className="card h-96 animate-pulse bg-bg-card" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card h-32 animate-pulse bg-bg-card" />
        <div className="card h-32 animate-pulse bg-bg-card" />
        <div className="card h-32 animate-pulse bg-bg-card" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
