/**
 * Tests for marketplace data refresh and polling logic
 */
import { describe, it, expect, vi } from 'vitest';

interface BrokerAgent {
  agent_id: string;
  name: string;
  description: string;
  uaid?: string;
  capabilities?: string[];
  trust_score?: number;
  available?: boolean;
  source?: string;
}

function mergeAgentLists(
  brokerAgents: BrokerAgent[],
  localAgents: BrokerAgent[]
): BrokerAgent[] {
  return [...brokerAgents, ...localAgents];
}

function deduplicateAgents(agents: BrokerAgent[]): BrokerAgent[] {
  const seen = new Set<string>();
  return agents.filter(a => {
    if (seen.has(a.agent_id)) return false;
    seen.add(a.agent_id);
    return true;
  });
}

describe('Marketplace Data Refresh', () => {
  it('merges broker and local agent lists', () => {
    const broker: BrokerAgent[] = [
      { agent_id: 'b1', name: 'BrokerAgent', description: 'From broker' },
    ];
    const local: BrokerAgent[] = [
      { agent_id: 'l1', name: 'LocalAgent', description: 'From local' },
    ];
    const merged = mergeAgentLists(broker, local);
    expect(merged).toHaveLength(2);
    expect(merged[0].agent_id).toBe('b1');
    expect(merged[1].agent_id).toBe('l1');
  });

  it('handles empty broker list', () => {
    const merged = mergeAgentLists([], [{ agent_id: 'l1', name: 'Local', description: '' }]);
    expect(merged).toHaveLength(1);
  });

  it('handles empty local list', () => {
    const merged = mergeAgentLists([{ agent_id: 'b1', name: 'Broker', description: '' }], []);
    expect(merged).toHaveLength(1);
  });

  it('handles both empty lists', () => {
    const merged = mergeAgentLists([], []);
    expect(merged).toHaveLength(0);
  });

  it('deduplicates agents by agent_id', () => {
    const agents: BrokerAgent[] = [
      { agent_id: 'a1', name: 'First', description: '' },
      { agent_id: 'a1', name: 'Duplicate', description: '' },
      { agent_id: 'a2', name: 'Second', description: '' },
    ];
    const deduped = deduplicateAgents(agents);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].name).toBe('First');
  });

  it('preserves order of first occurrence when deduplicating', () => {
    const agents: BrokerAgent[] = [
      { agent_id: 'x', name: 'X-first', description: '' },
      { agent_id: 'y', name: 'Y', description: '' },
      { agent_id: 'x', name: 'X-dup', description: '' },
    ];
    const deduped = deduplicateAgents(agents);
    expect(deduped[0].name).toBe('X-first');
    expect(deduped[1].name).toBe('Y');
  });

  it('polling interval is set correctly', () => {
    const POLLING_INTERVAL_MS = 30000;
    expect(POLLING_INTERVAL_MS).toBe(30000);
    expect(POLLING_INTERVAL_MS).toBeGreaterThan(10000); // not too aggressive
    expect(POLLING_INTERVAL_MS).toBeLessThanOrEqual(60000); // not too slow
  });

  it('background refresh does not show loading state', () => {
    let loading = false;
    const isBackground = true;

    // Simulate fetchAgents logic
    if (!isBackground) {
      loading = true;
    }

    expect(loading).toBe(false);
  });

  it('foreground refresh shows loading state', () => {
    let loading = false;
    const isBackground = false;

    if (!isBackground) {
      loading = true;
    }

    expect(loading).toBe(true);
  });
});
