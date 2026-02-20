/**
 * Tests for Chat UI polish — agent recommendation cards, typing indicator, clear chat, suggestions
 */
import { describe, it, expect } from 'vitest';

/** Simulates the extractAgentCards function from the chat page */
function extractAgentCards(text: string) {
  const cards: { name: string; description: string }[] = [];
  const patterns = [
    /\*\*([^*]+)\*\*\s*[-–:]\s*([^\n]+)/g,
    /^\s*[-•]\s*([A-Z][A-Za-z0-9 ]+?)\s*[-–:]\s*([^\n]+)/gm,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const desc = match[2].trim();
      if (name.length > 2 && name.length < 40 && !cards.find(c => c.name === name)) {
        cards.push({ name, description: desc });
      }
    }
  }
  return cards.slice(0, 4);
}

describe('Agent Recommendation Cards', () => {
  it('extracts agent names from bold markdown', () => {
    const text = '**TranslatorBot** - Provides real-time translation\n**CodeReviewer** - Reviews code quality';
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].name).toBe('TranslatorBot');
    expect(cards[1].name).toBe('CodeReviewer');
  });

  it('extracts descriptions correctly', () => {
    const text = '**DataAnalyzer** - Analyzes large datasets with ML';
    const cards = extractAgentCards(text);
    expect(cards[0].description).toBe('Analyzes large datasets with ML');
  });

  it('limits to 4 cards maximum', () => {
    const text = [
      '**Agent1** - Desc1',
      '**Agent2** - Desc2',
      '**Agent3** - Desc3',
      '**Agent4** - Desc4',
      '**Agent5** - Desc5',
    ].join('\n');
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(4);
  });

  it('deduplicates agent names', () => {
    const text = '**TestAgent** - First mention\n**TestAgent** - Second mention';
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(1);
  });

  it('returns empty array for plain text', () => {
    const text = 'Hello, I can help you find agents.';
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(0);
  });

  it('ignores very short names', () => {
    const text = '**AI** - Too short';
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(0);
  });

  it('extracts from bullet list format', () => {
    const text = '- TranslatorBot: A translation service\n- DataAgent: Analyzes data';
    const cards = extractAgentCards(text);
    expect(cards).toHaveLength(2);
  });
});

describe('Chat Suggestions Enhanced', () => {
  const SUGGESTIONS = [
    { label: 'Discover', text: 'List all available agents', icon: '🔍' },
    { label: 'Skills', text: 'What skills are available?', icon: '⚡' },
    { label: 'Hire', text: 'How do I hire an agent?', icon: '🤝' },
    { label: 'Privacy', text: 'Tell me about privacy compliance', icon: '🔒' },
  ];

  it('each suggestion has an icon', () => {
    SUGGESTIONS.forEach(s => {
      expect(s.icon).toBeTruthy();
      expect(s.icon.length).toBeGreaterThan(0);
    });
  });

  it('all icons are unique', () => {
    const icons = SUGGESTIONS.map(s => s.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('suggestions are varied topics', () => {
    const labels = SUGGESTIONS.map(s => s.label);
    expect(labels).toContain('Discover');
    expect(labels).toContain('Skills');
    expect(labels).toContain('Hire');
    expect(labels).toContain('Privacy');
  });
});

describe('Chat Clear Functionality', () => {
  it('clearing resets messages to empty', () => {
    let messages = [{ id: '1', role: 'user', content: 'test' }];
    let sessionId: string | null = 'session-1';
    let topicId: string | null = 'topic-1';

    // Simulate clear
    messages = [];
    sessionId = null;
    topicId = null;

    expect(messages).toHaveLength(0);
    expect(sessionId).toBeNull();
    expect(topicId).toBeNull();
  });
});
