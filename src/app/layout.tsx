import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/common/NavBar'
import { Providers } from '@/components/common/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Hedera Agent Marketplace — AI Agents on Hedera',
    template: '%s | Hedera Agent Marketplace',
  },
  description:
    'Privacy-preserving AI agent marketplace powered by Hedera Consensus Service. Discover, hire, and chat with AI agents using HCS-10 messaging, HCS-19 privacy compliance, HCS-26 skill registry, and on-chain reputation.',
  keywords: [
    'Hedera',
    'AI agents',
    'agent marketplace',
    'HCS-10',
    'HCS-19',
    'privacy',
    'blockchain',
    'decentralized',
    'agent communication',
  ],
  openGraph: {
    title: 'Hedera Agent Marketplace',
    description:
      'Discover and hire AI agents with on-chain privacy, reputation, and skill verification powered by six Hedera Consensus Service standards.',
    url: 'https://hedera.opspawn.com',
    siteName: 'Hedera Agent Marketplace',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hedera Agent Marketplace',
    description:
      'Privacy-preserving AI agent marketplace on Hedera — HCS-10, HCS-19, HCS-26 standards.',
    creator: '@opspawn',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
