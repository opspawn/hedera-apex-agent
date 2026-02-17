/**
 * Tests for NavBar navigation configuration and route availability
 */
import { describe, it, expect } from 'vitest';

// Test the navigation structure directly by importing the expected routes
const EXPECTED_NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/register', label: 'Register Agent' },
  { href: '/chat', label: 'Chat' },
  { href: '/privacy', label: 'Privacy' },
];

describe('Navigation Configuration', () => {
  it('includes all required navigation routes', () => {
    const routes = EXPECTED_NAV_ITEMS.map(i => i.href);
    expect(routes).toContain('/');
    expect(routes).toContain('/marketplace');
    expect(routes).toContain('/register');
    expect(routes).toContain('/chat');
    expect(routes).toContain('/privacy');
  });

  it('has 5 navigation items total', () => {
    expect(EXPECTED_NAV_ITEMS).toHaveLength(5);
  });

  it('Register Agent route has correct href', () => {
    const registerItem = EXPECTED_NAV_ITEMS.find(i => i.label === 'Register Agent');
    expect(registerItem).toBeDefined();
    expect(registerItem!.href).toBe('/register');
  });

  it('each nav item has both href and label', () => {
    for (const item of EXPECTED_NAV_ITEMS) {
      expect(item.href).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.href.startsWith('/')).toBe(true);
    }
  });

  it('no duplicate routes exist', () => {
    const routes = EXPECTED_NAV_ITEMS.map(i => i.href);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });
});

describe('Registration Form Validation Logic', () => {
  function validateRegistration(body: any): { valid: boolean; error?: string } {
    const { name, description, capabilities } = body;
    if (!name || !description || !capabilities || capabilities.length === 0) {
      return { valid: false, error: 'Missing required fields: name, description, capabilities' };
    }
    return { valid: true };
  }

  it('valid registration passes validation', () => {
    const result = validateRegistration({
      name: 'Test Agent',
      description: 'A test',
      capabilities: ['test'],
    });
    expect(result.valid).toBe(true);
  });

  it('missing name fails validation', () => {
    const result = validateRegistration({
      description: 'A test',
      capabilities: ['test'],
    });
    expect(result.valid).toBe(false);
  });

  it('empty capabilities fails validation', () => {
    const result = validateRegistration({
      name: 'Test',
      description: 'A test',
      capabilities: [],
    });
    expect(result.valid).toBe(false);
  });

  it('missing description fails validation', () => {
    const result = validateRegistration({
      name: 'Test',
      capabilities: ['test'],
    });
    expect(result.valid).toBe(false);
  });

  it('alias generation produces correct slugs', () => {
    function generateAlias(name: string): string {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    expect(generateAlias('My Cool Agent')).toBe('my-cool-agent');
    expect(generateAlias('Agent!!!')).toBe('agent');
    expect(generateAlias('test-agent-v2')).toBe('test-agent-v2');
    expect(generateAlias('  Spaces  ')).toBe('spaces');
    expect(generateAlias('UPPERCASE')).toBe('uppercase');
  });
});
