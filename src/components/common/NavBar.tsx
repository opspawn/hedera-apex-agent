'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditsDisplay } from './CreditsDisplay'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/chat', label: 'Chat' },
  { href: '/privacy', label: 'Privacy' },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-hedera-dark/95 backdrop-blur border-b border-hedera-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hedera-green to-hedera-purple flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-white hidden sm:block">
                Agent Marketplace
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-hedera-card text-hedera-green'
                      : 'text-gray-400 hover:text-white hover:bg-hedera-card/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CreditsDisplay />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-hedera-green animate-pulse-glow" />
              <span className="text-xs text-gray-400">Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
