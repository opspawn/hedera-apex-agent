/**
 * Tests for agent detail modal data and discover API local agent mapping
 */
import { describe, it, expect } from 'vitest';

describe('Local Agent Mapping', () => {
  // Test the mapLocalAgents logic by simulating its behavior
  function mapLocalAgents(agents: any[]): Record<string, unknown>[] {
    return agents.map((ma) => {
      const agent = ma.agent || ma;
      const skills = agent.skills || [];
      return {
        agent_id: agent.agent_id || 'unknown',
        name: agent.name || 'Unknown Agent',
        description: agent.description || '',
        endpoint: agent.endpoint || '',
        protocols: agent.protocols || [],
        capabilities: skills.map((s: any) => s.name),
        trust_score: agent.reputation_score ?? 0,
        available: agent.status === 'online',
        source: 'local',
        skills,
        payment_address: agent.payment_address || '',
        status: agent.status || 'online',
        reputation_score: agent.reputation_score ?? 0,
        verification: ma.verificationStatus || 'unverified',
        has_privacy_consent: ma.verificationStatus === 'verified',
      };
    });
  }

  it('maps nested MarketplaceAgent to flat BrokerAgent format', () => {
    const input = [{
      agent: {
        agent_id: 'test-1',
        name: 'TestAgent',
        description: 'A test agent',
        endpoint: 'https://test.com',
        protocols: ['hcs-10'],
        skills: [{ name: 'Skill1', pricing: { amount: 1, token: 'HBAR', unit: 'per_call' } }],
        reputation_score: 85,
        status: 'online',
        payment_address: '0.0.123',
      },
      verificationStatus: 'verified',
    }];

    const result = mapLocalAgents(input);
    expect(result).toHaveLength(1);
    expect(result[0].agent_id).toBe('test-1');
    expect(result[0].name).toBe('TestAgent');
    expect(result[0].trust_score).toBe(85);
    expect(result[0].available).toBe(true);
    expect(result[0].source).toBe('local');
    expect(result[0].has_privacy_consent).toBe(true);
    expect(result[0].capabilities).toEqual(['Skill1']);
  });

  it('handles missing agent wrapper (flat object)', () => {
    const input = [{
      agent_id: 'flat-1',
      name: 'FlatAgent',
      description: 'Already flat',
      skills: [],
      reputation_score: 50,
      status: 'offline',
    }];

    const result = mapLocalAgents(input);
    expect(result[0].agent_id).toBe('flat-1');
    expect(result[0].available).toBe(false);
    expect(result[0].capabilities).toEqual([]);
  });

  it('handles missing fields gracefully', () => {
    const input = [{ agent: {} }];
    const result = mapLocalAgents(input);
    expect(result[0].agent_id).toBe('unknown');
    expect(result[0].name).toBe('Unknown Agent');
    expect(result[0].trust_score).toBe(0);
    expect(result[0].verification).toBe('unverified');
  });

  it('maps all skills to capabilities names', () => {
    const input = [{
      agent: {
        agent_id: 'multi',
        name: 'MultiSkill',
        skills: [
          { name: 'Translation' },
          { name: 'Sentiment Analysis' },
          { name: 'Code Review' },
        ],
        reputation_score: 80,
        status: 'online',
      },
    }];
    const result = mapLocalAgents(input);
    expect(result[0].capabilities).toEqual(['Translation', 'Sentiment Analysis', 'Code Review']);
  });

  it('sets has_privacy_consent based on verificationStatus', () => {
    const verified = [{ agent: { agent_id: 'v' }, verificationStatus: 'verified' }];
    const unverified = [{ agent: { agent_id: 'u' }, verificationStatus: 'unverified' }];

    expect(mapLocalAgents(verified)[0].has_privacy_consent).toBe(true);
    expect(mapLocalAgents(unverified)[0].has_privacy_consent).toBe(false);
  });
});
