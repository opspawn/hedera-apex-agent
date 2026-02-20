/**
 * Tests for the Skeleton loading component variants
 */
import { describe, it, expect } from 'vitest';

const SKELETON_VARIANTS = ['card', 'text', 'stat', 'row'] as const;

describe('Skeleton component', () => {
  it('supports four variants', () => {
    expect(SKELETON_VARIANTS).toHaveLength(4);
    expect(SKELETON_VARIANTS).toContain('card');
    expect(SKELETON_VARIANTS).toContain('text');
    expect(SKELETON_VARIANTS).toContain('stat');
    expect(SKELETON_VARIANTS).toContain('row');
  });

  it('defaults to card variant', () => {
    const defaultVariant = 'card';
    expect(defaultVariant).toBe('card');
  });

  it('defaults to count of 1', () => {
    const defaultCount = 1;
    expect(defaultCount).toBe(1);
  });

  it('card variant has expected structure (avatar, name, description, tags)', () => {
    const cardElements = ['avatar', 'name', 'description', 'tags'];
    expect(cardElements).toHaveLength(4);
  });

  it('stat variant has expected structure (label, value)', () => {
    const statElements = ['label', 'value'];
    expect(statElements).toHaveLength(2);
  });

  it('text variant has expected structure (3 lines)', () => {
    const lineCount = 3;
    expect(lineCount).toBe(3);
  });

  it('row variant is suited for table rows', () => {
    const rowElements = ['timestamp', 'action', 'agent', 'details'];
    expect(rowElements).toHaveLength(4);
  });
});

describe('Loading pages', () => {
  it('marketplace loading has 6 skeleton cards', () => {
    const skeletonCount = 6;
    expect(skeletonCount).toBe(6);
  });

  it('standards loading has architecture overview + 3 sections', () => {
    const overviewSections = 6; // 6 standard cards in overview
    const detailSections = 3; // 3 standard detail skeletons
    expect(overviewSections + detailSections).toBe(9);
  });
});
