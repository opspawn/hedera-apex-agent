export default function StandardsLoading() {
  return (
    <main className="min-h-screen bg-hedera-dark text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-10 text-center animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-hedera-border mx-auto mb-4" />
          <div className="h-8 w-64 bg-hedera-border rounded mx-auto mb-3" />
          <div className="h-4 w-96 bg-hedera-border rounded mx-auto" />
        </div>

        {/* Architecture overview skeleton */}
        <div className="mb-12 bg-hedera-card border border-hedera-border rounded-2xl p-6 animate-pulse">
          <div className="h-5 w-48 bg-hedera-border rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-hedera-border bg-hedera-dark/50">
                <div className="h-4 w-16 bg-hedera-border rounded mb-1" />
                <div className="h-3 w-24 bg-hedera-border rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Standard sections skeleton */}
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-hedera-card border border-hedera-border rounded-2xl animate-pulse">
              <div className="p-6 border-b border-hedera-border">
                <div className="h-6 w-20 bg-hedera-border rounded mb-2" />
                <div className="h-5 w-48 bg-hedera-border rounded mb-3" />
                <div className="h-3 w-full bg-hedera-border rounded mb-1" />
                <div className="h-3 w-4/5 bg-hedera-border rounded" />
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 bg-hedera-border rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
