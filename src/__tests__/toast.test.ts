/**
 * Tests for Toast notification system logic
 */
import { describe, it, expect } from 'vitest';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function createToast(type: ToastMessage['type'], message: string): ToastMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
  };
}

function removeToast(toasts: ToastMessage[], id: string): ToastMessage[] {
  return toasts.filter(t => t.id !== id);
}

describe('Toast System', () => {
  it('creates a success toast', () => {
    const toast = createToast('success', 'Agent registered!');
    expect(toast.type).toBe('success');
    expect(toast.message).toBe('Agent registered!');
    expect(toast.id).toBeTruthy();
  });

  it('creates an error toast', () => {
    const toast = createToast('error', 'Registration failed');
    expect(toast.type).toBe('error');
    expect(toast.message).toBe('Registration failed');
  });

  it('creates an info toast', () => {
    const toast = createToast('info', 'Loading agents...');
    expect(toast.type).toBe('info');
    expect(toast.message).toBe('Loading agents...');
  });

  it('each toast has a unique id', () => {
    const t1 = createToast('success', 'msg1');
    const t2 = createToast('success', 'msg2');
    expect(t1.id).not.toBe(t2.id);
  });

  it('removes toast by id', () => {
    const t1 = createToast('success', 'First');
    const t2 = createToast('error', 'Second');
    const t3 = createToast('info', 'Third');
    const toasts = [t1, t2, t3];

    const remaining = removeToast(toasts, t2.id);
    expect(remaining).toHaveLength(2);
    expect(remaining.find(t => t.id === t2.id)).toBeUndefined();
  });

  it('removing non-existent id returns same array length', () => {
    const t1 = createToast('success', 'Only one');
    const toasts = [t1];
    const remaining = removeToast(toasts, 'non-existent');
    expect(remaining).toHaveLength(1);
  });

  it('removes all toasts one by one', () => {
    const t1 = createToast('success', 'First');
    const t2 = createToast('error', 'Second');
    let toasts = [t1, t2];

    toasts = removeToast(toasts, t1.id);
    expect(toasts).toHaveLength(1);
    toasts = removeToast(toasts, t2.id);
    expect(toasts).toHaveLength(0);
  });

  it('toast types are limited to three valid values', () => {
    const validTypes: ToastMessage['type'][] = ['success', 'error', 'info'];
    validTypes.forEach(type => {
      const toast = createToast(type, 'test');
      expect(validTypes).toContain(toast.type);
    });
  });
});
