import Link from 'next/link'

const standards = [
  { code: 'HCS-10', label: 'Messaging' },
  { code: 'HCS-11', label: 'Profiles' },
  { code: 'HCS-14', label: 'DID' },
  { code: 'HCS-19', label: 'Privacy' },
  { code: 'HCS-20', label: 'Reputation' },
  { code: 'HCS-26', label: 'Skills' },
]

export function Footer() {
  return (
    <footer className="bg-hedera-card border-t border-hedera-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hedera-green to-hedera-purple flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Hedera Agent Marketplace</p>
              <p className="text-[10px] text-gray-500">Powered by Hedera Consensus Service</p>
            </div>
          </div>

          {/* Standards Badges */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {standards.map((s) => (
              <Link
                key={s.code}
                href={`/standards#${s.code.toLowerCase()}`}
                className="text-[10px] px-2 py-1 rounded bg-hedera-dark border border-hedera-border text-gray-400 hover:text-hedera-green hover:border-hedera-green/20 transition-colors"
              >
                {s.code}
              </Link>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-hedera-green transition-colors">Privacy</Link>
            <Link href="/standards" className="hover:text-hedera-green transition-colors">Standards</Link>
            <span>Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
