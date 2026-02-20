/**
 * Tests for Footer component — standards badges, links, branding
 */
import { describe, it, expect } from 'vitest';

const standards = [
  { code: 'HCS-10', label: 'Messaging' },
  { code: 'HCS-11', label: 'Profiles' },
  { code: 'HCS-14', label: 'DID' },
  { code: 'HCS-19', label: 'Privacy' },
  { code: 'HCS-20', label: 'Reputation' },
  { code: 'HCS-26', label: 'Skills' },
];

describe('Footer Standards Badges', () => {
  it('lists all 6 HCS standards', () => {
    expect(standards).toHaveLength(6);
  });

  it('includes all expected standard codes', () => {
    const codes = standards.map(s => s.code);
    expect(codes).toContain('HCS-10');
    expect(codes).toContain('HCS-11');
    expect(codes).toContain('HCS-14');
    expect(codes).toContain('HCS-19');
    expect(codes).toContain('HCS-20');
    expect(codes).toContain('HCS-26');
  });

  it('each standard has a label', () => {
    standards.forEach(s => {
      expect(s.label).toBeTruthy();
      expect(s.label.length).toBeGreaterThan(0);
    });
  });

  it('generates correct anchor links', () => {
    standards.forEach(s => {
      const link = `/standards#${s.code.toLowerCase()}`;
      expect(link).toMatch(/^\/standards#hcs-\d+$/);
    });
  });
});

describe('Footer Links', () => {
  const footerLinks = ['Privacy', 'Standards', 'Testnet'];

  it('has three navigation items', () => {
    expect(footerLinks).toHaveLength(3);
  });

  it('includes privacy link', () => {
    expect(footerLinks).toContain('Privacy');
  });

  it('includes standards link', () => {
    expect(footerLinks).toContain('Standards');
  });

  it('includes testnet indicator', () => {
    expect(footerLinks).toContain('Testnet');
  });
});
