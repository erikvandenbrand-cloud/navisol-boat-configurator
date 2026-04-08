/**
 * Test Utilities for Library v4 Tests
 */

// ============================================
// MOCK localStorage and window for Node/Bun environment
// ============================================

const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
};

// Override global localStorage for Node/Bun environment (always assign to ensure consistency)
(globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

// Mock window object so LocalStorageAdapter.isClient() returns true
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: typeof globalThis }).window = globalThis;
}

/**
 * Clear all test data from localStorage
 * This ensures tests start with a clean slate
 */
export async function clearAllTestData(): Promise<void> {
  // Clear all navisol-related keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('navisol_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
