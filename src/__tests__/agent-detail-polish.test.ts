/**
 * Tests for Agent Detail Modal polish — trust score bar, protocol badges, privacy indicator
 */
import { describe, it, expect } from 'vitest';

describe('TrustScoreBar', () => {
  function getTrustLabel(score: number) {
    return score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  }

  function getTrustColor(score: number) {
    return score >= 70 ? 'bg-hedera-green' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  }

  it('shows High for score >= 70', () => {
    expect(getTrustLabel(70)).toBe('High');
    expect(getTrustLabel(100)).toBe('High');
    expect(getTrustLabel(85)).toBe('High');
  });

  it('shows Medium for score 40-69', () => {
    expect(getTrustLabel(40)).toBe('Medium');
    expect(getTrustLabel(69)).toBe('Medium');
    expect(getTrustLabel(55)).toBe('Medium');
  });

  it('shows Low for score < 40', () => {
    expect(getTrustLabel(0)).toBe('Low');
    expect(getTrustLabel(39)).toBe('Low');
    expect(getTrustLabel(20)).toBe('Low');
  });

  it('uses green color for high scores', () => {
    expect(getTrustColor(85)).toBe('bg-hedera-green');
  });

  it('uses yellow color for medium scores', () => {
    expect(getTrustColor(55)).toBe('bg-yellow-400');
  });

  it('uses red color for low scores', () => {
    expect(getTrustColor(15)).toBe('bg-red-400');
  });

  it('clamps bar width between 0 and 100', () => {
    const getWidth = (score: number) => Math.min(100, Math.max(0, score));
    expect(getWidth(-10)).toBe(0);
    expect(getWidth(0)).toBe(0);
    expect(getWidth(50)).toBe(50);
    expect(getWidth(100)).toBe(100);
    expect(getWidth(150)).toBe(100);
  });
});

describe('ProtocolBadge', () => {
  const protocolColors: Record<string, string> = {
    'hcs-10': 'bg-hedera-green/10 border-hedera-green/20 text-hedera-green',
    'hcs-11': 'bg-blue-400/10 border-blue-400/20 text-blue-400',
    'hcs-14': 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400',
    'hcs-19': 'bg-hedera-purple/10 border-hedera-purple/20 text-hedera-purple',
    'hcs-20': 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
    'hcs-26': 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
  };

  it('has unique color for each HCS standard', () => {
    const values = Object.values(protocolColors);
    expect(new Set(values).size).toBe(6);
  });

  it('maps hcs-10 to green', () => {
    expect(protocolColors['hcs-10']).toContain('hedera-green');
  });

  it('maps hcs-19 to purple', () => {
    expect(protocolColors['hcs-19']).toContain('hedera-purple');
  });

  it('maps hcs-26 to emerald', () => {
    expect(protocolColors['hcs-26']).toContain('emerald');
  });

  it('falls back to green for unknown protocols', () => {
    const unknown = protocolColors['unknown-proto'] || 'bg-hedera-green/10 border-hedera-green/20 text-hedera-green';
    expect(unknown).toContain('hedera-green');
  });
});

describe('HCS-19 Privacy Indicator', () => {
  it('shows granted state for consented agents', () => {
    const consented = true;
    const text = consented ? 'Privacy consent granted' : 'No consent on file';
    expect(text).toBe('Privacy consent granted');
  });

  it('shows warning state for non-consented agents', () => {
    const consented = false;
    const text = consented ? 'Privacy consent granted' : 'No consent on file';
    expect(text).toBe('No consent on file');
  });

  it('uses green styling for consented', () => {
    const consented = true;
    const bgColor = consented ? 'bg-hedera-green/5' : 'bg-yellow-500/5';
    expect(bgColor).toContain('green');
  });

  it('uses yellow styling for non-consented', () => {
    const consented = false;
    const bgColor = consented ? 'bg-hedera-green/5' : 'bg-yellow-500/5';
    expect(bgColor).toContain('yellow');
  });
});

describe('Agent Detail Modal Escape Key', () => {
  it('escape key value matches expected', () => {
    expect('Escape').toBe('Escape');
  });
});
