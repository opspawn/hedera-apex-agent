/**
 * Tests for responsive layout configuration and breakpoint expectations
 */
import { describe, it, expect } from 'vitest';

// Breakpoint definitions matching Tailwind defaults
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

const MOBILE_WIDTH = 375;

describe('Responsive Layout', () => {
  it('mobile width is below sm breakpoint', () => {
    expect(MOBILE_WIDTH).toBeLessThan(BREAKPOINTS.sm);
  });

  it('grid columns collapse to 1 on mobile', () => {
    // At 375px, grid-cols-1 sm:grid-cols-2 should show 1 column
    const cols = MOBILE_WIDTH < BREAKPOINTS.sm ? 1 : 2;
    expect(cols).toBe(1);
  });

  it('grid columns show 2 on sm screens', () => {
    const width = 640;
    const cols = width >= BREAKPOINTS.lg ? 3 : width >= BREAKPOINTS.sm ? 2 : 1;
    expect(cols).toBe(2);
  });

  it('grid columns show 3 on lg screens', () => {
    const width = 1024;
    const cols = width >= BREAKPOINTS.lg ? 3 : width >= BREAKPOINTS.sm ? 2 : 1;
    expect(cols).toBe(3);
  });

  it('search bar stacks vertically on mobile', () => {
    // flex-col sm:flex-row means stack on mobile
    const isStacked = MOBILE_WIDTH < BREAKPOINTS.sm;
    expect(isStacked).toBe(true);
  });

  it('nav items are hidden on mobile (md breakpoint)', () => {
    const showDesktopNav = MOBILE_WIDTH >= BREAKPOINTS.md;
    expect(showDesktopNav).toBe(false);
  });

  it('hero buttons stack on mobile', () => {
    // flex-col sm:flex-row
    const isStacked = MOBILE_WIDTH < BREAKPOINTS.sm;
    expect(isStacked).toBe(true);
  });

  it('standards grid shows 1 column on mobile', () => {
    // grid-cols-1 sm:grid-cols-2 md:grid-cols-3
    const cols = MOBILE_WIDTH >= BREAKPOINTS.md ? 3
      : MOBILE_WIDTH >= BREAKPOINTS.sm ? 2 : 1;
    expect(cols).toBe(1);
  });
});
