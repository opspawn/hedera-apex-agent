/**
 * Reusable loading skeleton component for data-fetching states.
 * Supports card, text, and stat variants.
 */

interface SkeletonProps {
  variant?: 'card' | 'text' | 'stat' | 'row'
  count?: number
  className?: string
}

function SkeletonCard() {
  return (
    <div className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-pulse">
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
  )
}

function SkeletonStat() {
  return (
    <div className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-pulse">
      <div className="h-3 w-20 bg-hedera-border rounded mb-3" />
      <div className="h-8 w-16 bg-hedera-border rounded" />
    </div>
  )
}

function SkeletonText() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-full bg-hedera-border rounded" />
      <div className="h-4 w-5/6 bg-hedera-border rounded" />
      <div className="h-4 w-3/4 bg-hedera-border rounded" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 py-3 border-b border-hedera-border/50">
      <div className="h-3 w-24 bg-hedera-border rounded" />
      <div className="h-5 w-16 bg-hedera-border rounded-full" />
      <div className="h-3 w-32 bg-hedera-border rounded hidden sm:block" />
      <div className="h-3 w-40 bg-hedera-border rounded hidden md:block" />
    </div>
  )
}

export function Skeleton({ variant = 'card', count = 1, className = '' }: SkeletonProps) {
  const Component = {
    card: SkeletonCard,
    text: SkeletonText,
    stat: SkeletonStat,
    row: SkeletonRow,
  }[variant]

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  )
}
