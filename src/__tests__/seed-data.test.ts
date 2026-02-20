/**
 * Tests for seed data system (demo-agents + seed loader)
 */
import { describe, it, expect } from 'vitest';
import { DEMO_AGENTS, SeedAgent } from '@/lib/seed/demo-agents';

describe('Seed Demo Agents', () => {
  it('has exactly 8 demo agents', () => {
    expect(DEMO_AGENTS).toHaveLength(8);
  });

  it('each agent has a unique name', () => {
    const names = DEMO_AGENTS.map(a => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('each agent has a unique payment address', () => {
    const addresses = DEMO_AGENTS.map(a => a.payment_address);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it('each agent has at least one skill', () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.skills.length).toBeGreaterThan(0);
    }
  });

  it('all skills have pricing in HBAR', () => {
    for (const agent of DEMO_AGENTS) {
      for (const skill of agent.skills) {
        expect(skill.pricing.token).toBe('HBAR');
        expect(skill.pricing.amount).toBeGreaterThan(0);
        expect(skill.pricing.unit).toBe('per_call');
      }
    }
  });

  it('each agent has a category', () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.category).toBeDefined();
      expect(agent.category.length).toBeGreaterThan(0);
    }
  });

  it('categories cover the expected set', () => {
    const categories = new Set(DEMO_AGENTS.map(a => a.category));
    expect(categories.has('Security Audit')).toBe(true);
    expect(categories.has('Translation')).toBe(true);
    expect(categories.has('Data Analysis')).toBe(true);
    expect(categories.has('AI Assistant')).toBe(true);
    expect(categories.has('Content Creation')).toBe(true);
    expect(categories.has('Code Review')).toBe(true);
  });

  it('reputation scores are within valid range', () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.reputation).toBeGreaterThanOrEqual(0);
      expect(agent.reputation).toBeLessThanOrEqual(100);
    }
  });

  it('agents with privacy consent have purposes defined', () => {
    for (const agent of DEMO_AGENTS) {
      if (agent.hasPrivacyConsent) {
        expect(agent.consentPurposes).toBeDefined();
        expect(agent.consentPurposes!.length).toBeGreaterThan(0);
      }
    }
  });

  it('agents without privacy consent have no purposes', () => {
    const noConsent = DEMO_AGENTS.filter(a => !a.hasPrivacyConsent);
    expect(noConsent.length).toBeGreaterThan(0);
    for (const agent of noConsent) {
      expect(agent.consentPurposes).toBeUndefined();
    }
  });

  it('all agents have valid endpoints', () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.endpoint).toMatch(/^https:\/\//);
    }
  });

  it('all agents have protocols including hcs-10', () => {
    for (const agent of DEMO_AGENTS) {
      expect(agent.protocols).toContain('hcs-10');
    }
  });

  it('all skills have input and output schemas', () => {
    for (const agent of DEMO_AGENTS) {
      for (const skill of agent.skills) {
        expect(skill.input_schema).toBeDefined();
        expect(skill.output_schema).toBeDefined();
      }
    }
  });

  it('all skills have unique IDs within each agent', () => {
    for (const agent of DEMO_AGENTS) {
      const ids = agent.skills.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('total skill count across all agents is reasonable', () => {
    const totalSkills = DEMO_AGENTS.reduce((sum, a) => sum + a.skills.length, 0);
    expect(totalSkills).toBeGreaterThanOrEqual(10);
    expect(totalSkills).toBeLessThanOrEqual(40);
  });
});
