/**
 * Tests for marketplace-level HCS-26 skill publishing.
 * Verifies that the marketplace publishes its own skills (marketplace-search, agent-chat).
 */
import { describe, it, expect } from 'vitest';
import { HCS26SkillRegistry } from '@/lib/hcs/hcs26';
import type { SkillManifest } from '@/lib/types';

const DEFAULT_CONFIG = {
  accountId: '0.0.7854018',
  privateKey: 'test-key',
  network: 'testnet' as const,
};

describe('Marketplace skill publishing', () => {
  it('publishes marketplace-search skill', async () => {
    const registry = new HCS26SkillRegistry(DEFAULT_CONFIG);

    const manifest: SkillManifest = {
      name: 'marketplace-search',
      version: '1.0.0',
      description: 'Search and discover AI agents by skill, category, or reputation',
      author: 'OpSpawn Marketplace',
      license: 'MIT',
      skills: [
        {
          name: 'marketplace-search',
          description: 'Full-text search across registered agents',
          category: 'discovery',
          tags: ['search', 'discovery', 'marketplace', 'agents', 'hedera'],
          input_schema: { type: 'object', properties: { q: { type: 'string' } } },
          output_schema: { type: 'object', properties: { agents: { type: 'array' } } },
        },
      ],
      tags: ['marketplace', 'discovery', 'hedera', 'hcs-26'],
    };

    const published = await registry.publishSkill(manifest);

    expect(published.status).toBe('published');
    expect(published.manifest.name).toBe('marketplace-search');
    expect(published.manifest.skills[0].category).toBe('discovery');
    expect(published.publisher).toBe(DEFAULT_CONFIG.accountId);
    expect(published.topic_id).toMatch(/^0\.0\.\d+$/);
  });

  it('publishes agent-chat skill', async () => {
    const registry = new HCS26SkillRegistry(DEFAULT_CONFIG);

    const manifest: SkillManifest = {
      name: 'agent-chat',
      version: '1.0.0',
      description: 'Interactive chat with AI agents via HCS-10 messaging',
      author: 'OpSpawn Marketplace',
      license: 'MIT',
      skills: [
        {
          name: 'agent-chat',
          description: 'Real-time conversational interaction with registered agents',
          category: 'communication',
          tags: ['chat', 'messaging', 'hcs-10', 'agents', 'real-time'],
          input_schema: { type: 'object', properties: { agent_id: { type: 'string' }, message: { type: 'string' } } },
          output_schema: { type: 'object', properties: { response: { type: 'string' }, session_id: { type: 'string' } } },
        },
      ],
      tags: ['chat', 'communication', 'hedera', 'hcs-10'],
    };

    const published = await registry.publishSkill(manifest);

    expect(published.status).toBe('published');
    expect(published.manifest.name).toBe('agent-chat');
    expect(published.manifest.skills[0].category).toBe('communication');
  });

  it('marketplace skills are discoverable after publishing', async () => {
    const registry = new HCS26SkillRegistry(DEFAULT_CONFIG);

    await registry.publishSkill({
      name: 'marketplace-search',
      version: '1.0.0',
      description: 'Search agents',
      author: 'OpSpawn',
      license: 'MIT',
      skills: [{ name: 'marketplace-search', description: 'Search', category: 'discovery', tags: ['search'], input_schema: {}, output_schema: {} }],
      tags: ['marketplace'],
    });

    await registry.publishSkill({
      name: 'agent-chat',
      version: '1.0.0',
      description: 'Chat with agents',
      author: 'OpSpawn',
      license: 'MIT',
      skills: [{ name: 'agent-chat', description: 'Chat', category: 'communication', tags: ['chat'], input_schema: {}, output_schema: {} }],
      tags: ['chat'],
    });

    // Both should be listed
    const all = await registry.listPublishedSkills();
    expect(all).toHaveLength(2);

    // Discovery by name
    const searchResult = await registry.discoverSkills('marketplace');
    expect(searchResult.total).toBeGreaterThanOrEqual(1);

    const chatResult = await registry.discoverSkills('chat');
    expect(chatResult.total).toBeGreaterThanOrEqual(1);

    // Published count
    expect(registry.getPublishedCount()).toBe(2);
  });

  it('marketplace-search and agent-chat get different topic IDs', async () => {
    const registry = new HCS26SkillRegistry(DEFAULT_CONFIG);

    const search = await registry.publishSkill({
      name: 'marketplace-search',
      version: '1.0.0',
      description: 'Search',
      author: 'OpSpawn',
      license: 'MIT',
      skills: [{ name: 'search', description: 'Search', category: 'discovery', tags: [], input_schema: {}, output_schema: {} }],
    });

    const chat = await registry.publishSkill({
      name: 'agent-chat',
      version: '1.0.0',
      description: 'Chat',
      author: 'OpSpawn',
      license: 'MIT',
      skills: [{ name: 'chat', description: 'Chat', category: 'communication', tags: [], input_schema: {}, output_schema: {} }],
    });

    expect(search.topic_id).not.toBe(chat.topic_id);
  });
});
