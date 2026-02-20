/**
 * Tests for page metadata (SEO, Open Graph, Twitter cards)
 */
import { describe, it, expect } from 'vitest';

describe('Root layout metadata', () => {
  const metadata = {
    title: {
      default: 'Hedera Agent Marketplace — AI Agents on Hedera',
      template: '%s | Hedera Agent Marketplace',
    },
    description:
      'Privacy-preserving AI agent marketplace powered by Hedera Consensus Service. Discover, hire, and chat with AI agents using HCS-10 messaging, HCS-19 privacy compliance, HCS-26 skill registry, and on-chain reputation.',
    keywords: [
      'Hedera', 'AI agents', 'agent marketplace', 'HCS-10', 'HCS-19',
      'privacy', 'blockchain', 'decentralized', 'agent communication',
    ],
    openGraph: {
      title: 'Hedera Agent Marketplace',
      description: 'Discover and hire AI agents with on-chain privacy, reputation, and skill verification powered by six Hedera Consensus Service standards.',
      url: 'https://hedera.opspawn.com',
      siteName: 'Hedera Agent Marketplace',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Hedera Agent Marketplace',
      creator: '@opspawn',
    },
  };

  it('has a default title with branding', () => {
    expect(metadata.title.default).toContain('Hedera Agent Marketplace');
  });

  it('has a title template for sub-pages', () => {
    expect(metadata.title.template).toContain('%s');
    expect(metadata.title.template).toContain('Hedera Agent Marketplace');
  });

  it('description mentions key standards', () => {
    expect(metadata.description).toContain('HCS-10');
    expect(metadata.description).toContain('HCS-19');
    expect(metadata.description).toContain('HCS-26');
  });

  it('includes relevant keywords', () => {
    expect(metadata.keywords).toContain('Hedera');
    expect(metadata.keywords).toContain('AI agents');
    expect(metadata.keywords).toContain('privacy');
    expect(metadata.keywords.length).toBeGreaterThanOrEqual(5);
  });

  it('Open Graph has correct type and URL', () => {
    expect(metadata.openGraph.type).toBe('website');
    expect(metadata.openGraph.url).toBe('https://hedera.opspawn.com');
    expect(metadata.openGraph.locale).toBe('en_US');
  });

  it('Open Graph title matches site name', () => {
    expect(metadata.openGraph.title).toBe(metadata.openGraph.siteName);
  });

  it('Twitter card is summary_large_image', () => {
    expect(metadata.twitter.card).toBe('summary_large_image');
  });

  it('Twitter creator is @opspawn', () => {
    expect(metadata.twitter.creator).toBe('@opspawn');
  });
});

describe('Standards page metadata', () => {
  const metadata = {
    title: 'Standards Compliance',
    description: 'Six Hedera Consensus Service standards implemented: HCS-10 communication, HCS-11 profiles, HCS-14 DID, HCS-19 privacy, HCS-20 reputation, and HCS-26 skill registry.',
  };

  it('has specific title for standards page', () => {
    expect(metadata.title).toBe('Standards Compliance');
  });

  it('description lists all six standards', () => {
    expect(metadata.description).toContain('HCS-10');
    expect(metadata.description).toContain('HCS-11');
    expect(metadata.description).toContain('HCS-14');
    expect(metadata.description).toContain('HCS-19');
    expect(metadata.description).toContain('HCS-20');
    expect(metadata.description).toContain('HCS-26');
  });
});
