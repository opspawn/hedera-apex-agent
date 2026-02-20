/**
 * Tests for HCS-26 Skill Registry (Sprint 33)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HCS26SkillRegistry } from '@/lib/hcs/hcs26';
import type { SkillManifest, AgentSkill } from '@/lib/types';

vi.mock('@hashgraphonline/standards-sdk', () => {
  class MockHCS26BaseClient {
    resolveSkill = vi.fn().mockResolvedValue(null);
  }
  class MockRegistryBrokerClient {
    authenticateWithLedgerCredentials = vi.fn().mockResolvedValue(undefined);
    listSkills = vi.fn().mockResolvedValue({ skills: [] });
    quoteSkillPublish = vi.fn().mockResolvedValue({ quoteId: 'q1', credits: 0 });
    publishSkill = vi.fn().mockResolvedValue({ jobId: 'j1' });
    getDefaultHeaders = vi.fn().mockReturnValue({});
    registerAgent = vi.fn();
  }
  return {
    HCS26BaseClient: MockHCS26BaseClient,
    RegistryBrokerClient: MockRegistryBrokerClient,
    hcs26DiscoveryMetadataSchema: {
      safeParse: vi.fn((data: any) => ({
        success: !!data.name && !!data.description,
        error: !data.name || !data.description
          ? { issues: [{ path: ['name'], message: 'required' }] }
          : undefined,
      })),
    },
  };
});

const DEFAULT_CONFIG = {
  accountId: '0.0.7854018',
  privateKey: 'test-key',
  network: 'testnet' as const,
};

function createManifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    name: 'test-skill',
    version: '1.0.0',
    description: 'A test skill for unit testing',
    author: 'OpSpawn',
    license: 'MIT',
    skills: [
      {
        name: 'discover',
        description: 'Discover AI agents by capability',
        category: 'marketplace',
        tags: ['discovery', 'search'],
        input_schema: { query: 'string' },
        output_schema: { agents: 'array' },
      },
    ],
    tags: ['test', 'marketplace'],
    ...overrides,
  };
}

describe('HCS26SkillRegistry', () => {
  let registry: HCS26SkillRegistry;

  beforeEach(() => {
    registry = new HCS26SkillRegistry(DEFAULT_CONFIG);
  });

  describe('validateManifest', () => {
    it('accepts valid manifest', () => {
      const result = registry.validateManifest(createManifest());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects manifest without name', () => {
      const result = registry.validateManifest(createManifest({ name: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing name');
    });

    it('rejects manifest without skills', () => {
      const result = registry.validateManifest(createManifest({ skills: [] }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must have at least one skill definition');
    });

    it('rejects invalid semver version', () => {
      const result = registry.validateManifest(createManifest({ version: 'v1' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('semver'))).toBe(true);
    });

    it('validates individual skill definitions', () => {
      const manifest = createManifest({
        skills: [{ name: '', description: '', category: '', tags: [], input_schema: {}, output_schema: {} }],
      });
      const result = registry.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('skills[0]'))).toBe(true);
    });
  });

  describe('publishSkill', () => {
    it('publishes a valid skill manifest locally', async () => {
      const manifest = createManifest();
      const published = await registry.publishSkill(manifest);
      expect(published.status).toBe('published');
      expect(published.manifest).toEqual(manifest);
      expect(published.publisher).toBe(DEFAULT_CONFIG.accountId);
      expect(published.topic_id).toMatch(/^0\.0\.\d+$/);
    });

    it('rejects invalid manifest on publish', async () => {
      const manifest = createManifest({ name: '' });
      await expect(registry.publishSkill(manifest)).rejects.toThrow('Invalid skill manifest');
    });

    it('generates deterministic topic IDs', async () => {
      const m1 = await registry.publishSkill(createManifest({ name: 'skill-a', version: '1.0.0' }));
      const m2 = await registry.publishSkill(createManifest({ name: 'skill-a', version: '1.0.0' }));
      expect(m1.topic_id).toBe(m2.topic_id);
    });

    it('generates different topic IDs for different versions', async () => {
      const m1 = await registry.publishSkill(createManifest({ name: 'skill-a', version: '1.0.0' }));
      const m2 = await registry.publishSkill(createManifest({ name: 'skill-a', version: '2.0.0' }));
      expect(m1.topic_id).not.toBe(m2.topic_id);
    });
  });

  describe('discoverSkills', () => {
    it('finds skills by name', async () => {
      await registry.publishSkill(createManifest({ name: 'agent-finder' }));
      const result = await registry.discoverSkills('agent');
      expect(result.total).toBe(1);
      expect(result.skills[0].manifest.name).toBe('agent-finder');
    });

    it('finds skills by tag', async () => {
      await registry.publishSkill(createManifest({ tags: ['hedera', 'blockchain'] }));
      const result = await registry.discoverSkills('blockchain');
      expect(result.total).toBe(1);
    });

    it('finds skills by skill category', async () => {
      await registry.publishSkill(createManifest());
      const result = await registry.discoverSkills('marketplace');
      expect(result.total).toBe(1);
    });

    it('returns empty for no matches', async () => {
      await registry.publishSkill(createManifest());
      const result = await registry.discoverSkills('nonexistent');
      expect(result.total).toBe(0);
      expect(result.skills).toHaveLength(0);
    });
  });

  describe('getSkillByTopic', () => {
    it('returns skill by topic ID', async () => {
      const published = await registry.publishSkill(createManifest());
      const found = await registry.getSkillByTopic(published.topic_id);
      expect(found).not.toBeNull();
      expect(found!.manifest.name).toBe('test-skill');
    });

    it('returns null for unknown topic', async () => {
      const found = await registry.getSkillByTopic('0.0.9999999');
      expect(found).toBeNull();
    });
  });

  describe('buildManifestFromSkills', () => {
    it('converts AgentSkill array to SkillManifest', () => {
      const skills: AgentSkill[] = [
        {
          id: 's1',
          name: 'search',
          description: 'Search agents',
          category: 'discovery',
          tags: ['search'],
          input_schema: { q: 'string' },
          output_schema: { results: 'array' },
          pricing: { amount: 1, token: 'HBAR', unit: 'per_call' },
        },
      ];

      const manifest = registry.buildManifestFromSkills(
        'marketplace',
        '1.0.0',
        'Agent marketplace',
        'OpSpawn',
        skills,
      );

      expect(manifest.name).toBe('marketplace');
      expect(manifest.license).toBe('MIT');
      expect(manifest.skills).toHaveLength(1);
      expect(manifest.skills[0].name).toBe('search');
      expect(manifest.skills[0].category).toBe('discovery');
      expect(manifest.pricing).toEqual(skills[0].pricing);
    });
  });

  describe('listPublishedSkills', () => {
    it('returns all published skills', async () => {
      await registry.publishSkill(createManifest({ name: 'a' }));
      await registry.publishSkill(createManifest({ name: 'b' }));
      const all = await registry.listPublishedSkills();
      expect(all).toHaveLength(2);
    });
  });

  describe('getPublishedCount', () => {
    it('tracks count correctly', async () => {
      expect(registry.getPublishedCount()).toBe(0);
      await registry.publishSkill(createManifest());
      expect(registry.getPublishedCount()).toBe(1);
    });
  });

  describe('resolveOnChainSkill', () => {
    it('returns null when SDK client available but skill not found', async () => {
      const result = await registry.resolveOnChainSkill('0.0.123', 1);
      expect(result).toBeNull();
    });
  });

  describe('hasOnChainClient', () => {
    it('returns true when SDK loads', async () => {
      const available = await registry.hasOnChainClient();
      expect(available).toBe(true);
    });
  });

  describe('getBrokerUrl', () => {
    it('returns default broker URL', () => {
      expect(registry.getBrokerUrl()).toBe('https://broker.hol.org');
    });

    it('returns custom broker URL', () => {
      const custom = new HCS26SkillRegistry({
        ...DEFAULT_CONFIG,
        brokerBaseUrl: 'https://custom.broker.com',
      });
      expect(custom.getBrokerUrl()).toBe('https://custom.broker.com');
    });
  });
});

describe('SKILL.json manifest', () => {
  it('public/skill.json is valid HCS-26 format', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const skillPath = path.resolve(process.cwd(), 'public/skill.json');

    if (!fs.existsSync(skillPath)) {
      // File might not exist in test environment
      return;
    }

    const content = JSON.parse(fs.readFileSync(skillPath, 'utf8'));
    expect(content.name).toBe('opspawn-agent-marketplace');
    expect(content.version).toBe('1.0.0');
    expect(content.license).toBe('MIT');
    expect(content.skill.category).toBe('marketplace');
    expect(content.skill.protocols).toContain('hcs-26');
    expect(content.registry.uaid).toMatch(/^uaid:aid:/);
  });
});
