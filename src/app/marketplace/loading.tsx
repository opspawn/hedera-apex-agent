export default function MarketplaceLoading() {
  return (
    <main className="min-h-screen bg-hedera-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-56 bg-hedera-border rounded mb-2" />
          <div className="h-4 w-80 bg-hedera-border rounded" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-12 w-full bg-hedera-card border border-hedera-border rounded-xl" />
        </div>

        {/* Stats bar skeleton */}
        <div className="flex items-center gap-4 mb-6 animate-pulse">
          <div className="h-4 w-24 bg-hedera-border rounded" />
          <div className="h-5 w-20 bg-hedera-border rounded-full" />
        </div>

        {/* Agent grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-hedera-border" />
                <div>
                  <div className="h-4 w-32 bg-hedera-border rounded mb-1" />
                  <div className="h-3 w-24 bg-hedera-border rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-hedera-border rounded mb-2" />
              <div className="h-3 w-2/3 bg-hedera-border rounded mb-4" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 bg-hedera-border rounded-full" />
                <div className="h-5 w-12 bg-hedera-border rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
