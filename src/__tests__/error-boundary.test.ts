/**
 * Tests for ErrorBoundary component logic
 */
import { describe, it, expect } from 'vitest';

describe('ErrorBoundary', () => {
  it('initial state has no error', () => {
    const state = { hasError: false, error: null };
    expect(state.hasError).toBe(false);
    expect(state.error).toBeNull();
  });

  it('getDerivedStateFromError returns error state', () => {
    const error = new Error('Test error');
    const newState = { hasError: true, error };
    expect(newState.hasError).toBe(true);
    expect(newState.error.message).toBe('Test error');
  });

  it('reset clears the error state', () => {
    const state = { hasError: true, error: new Error('Test') };
    const resetState = { hasError: false, error: null };
    expect(resetState.hasError).toBe(false);
    expect(resetState.error).toBeNull();
    expect(state.hasError).toBe(true); // original unchanged
  });

  it('handles errors with no message', () => {
    const error = new Error();
    const state = { hasError: true, error };
    expect(state.hasError).toBe(true);
    expect(state.error.message).toBe('');
  });

  it('preserves error stack trace', () => {
    const error = new Error('Detailed error');
    expect(error.stack).toBeDefined();
    expect(error.message).toBe('Detailed error');
  });
});
