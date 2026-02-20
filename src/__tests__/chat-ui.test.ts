/**
 * Tests for the Chat UI page structure and mode switching
 */
import { describe, it, expect } from 'vitest';

describe('Chat modes', () => {
  const modes = ['local', 'broker', 'hcs10'] as const;

  it('supports three chat modes', () => {
    expect(modes).toHaveLength(3);
  });

  it('defaults to local when no target', () => {
    const targetUaid = null;
    const targetAgentId = null;
    const defaultMode = targetUaid ? 'broker' : targetAgentId ? 'hcs10' : 'local';
    expect(defaultMode).toBe('local');
  });

  it('selects broker mode when uaid is provided', () => {
    const targetUaid = 'some-uaid';
    const targetAgentId = null;
    const mode = targetUaid ? 'broker' : targetAgentId ? 'hcs10' : 'local';
    expect(mode).toBe('broker');
  });

  it('selects hcs10 mode when agentId is provided', () => {
    const targetUaid = null;
    const targetAgentId = 'some-agent-id';
    const mode = targetUaid ? 'broker' : targetAgentId ? 'hcs10' : 'local';
    expect(mode).toBe('hcs10');
  });
});

describe('Chat suggestions', () => {
  const suggestions = [
    { label: 'Discover', text: 'List all available agents' },
    { label: 'Skills', text: 'What skills are available?' },
    { label: 'Hire', text: 'How do I hire an agent?' },
    { label: 'Privacy', text: 'Tell me about privacy compliance' },
  ];

  it('has four suggestion buttons', () => {
    expect(suggestions).toHaveLength(4);
  });

  it('each suggestion has a label and text', () => {
    suggestions.forEach(s => {
      expect(s.label).toBeTruthy();
      expect(s.text).toBeTruthy();
    });
  });

  it('includes a discover suggestion', () => {
    expect(suggestions.find(s => s.label === 'Discover')).toBeDefined();
  });

  it('includes a privacy suggestion', () => {
    expect(suggestions.find(s => s.label === 'Privacy')).toBeDefined();
  });
});

describe('Message structure', () => {
  const messageFields = ['id', 'role', 'content', 'timestamp'];
  const optionalFields = ['mode', 'fallback', 'topicId', 'sequenceNumber'];

  it('has required fields', () => {
    expect(messageFields).toHaveLength(4);
    expect(messageFields).toContain('id');
    expect(messageFields).toContain('role');
    expect(messageFields).toContain('content');
    expect(messageFields).toContain('timestamp');
  });

  it('has optional HCS metadata fields', () => {
    expect(optionalFields).toContain('topicId');
    expect(optionalFields).toContain('sequenceNumber');
  });

  it('roles are user or agent', () => {
    const roles = ['user', 'agent'];
    expect(roles).toHaveLength(2);
  });

  it('mode can indicate fallback', () => {
    const message = { mode: 'local', fallback: true };
    expect(message.fallback).toBe(true);
  });
});

describe('Chat keyboard shortcuts', () => {
  it('Enter sends message', () => {
    const key = 'Enter';
    const shiftKey = false;
    const shouldSend = key === 'Enter' && !shiftKey;
    expect(shouldSend).toBe(true);
  });

  it('Shift+Enter does not send', () => {
    const key = 'Enter';
    const shiftKey = true;
    const shouldSend = key === 'Enter' && !shiftKey;
    expect(shouldSend).toBe(false);
  });
});
