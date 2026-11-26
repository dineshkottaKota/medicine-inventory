import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Lightweight IntersectionObserver test double that supports triggering
 * visibility callbacks in jsdom while tracking observe/unobserve calls.
 */
class MockIntersectionObserver {
  static instances = [];

  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observedElements = new Set();
    this.unobservedElements = new Set();
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((element) => {
    this.observedElements.add(element);
  });

  unobserve = vi.fn((element) => {
    this.observedElements.delete(element);
    this.unobservedElements.add(element);
  });

  disconnect = vi.fn(() => {
    this.observedElements.clear();
  });

  triggerAll(isIntersecting = true) {
    const entries = Array.from(this.observedElements).map((target) => ({
      target,
      isIntersecting,
    }));
    this.callback(entries, this);
  }
}

globalThis.__MockIntersectionObserver = MockIntersectionObserver;

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = MockIntersectionObserver;
  window.IntersectionObserver = MockIntersectionObserver;
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});
