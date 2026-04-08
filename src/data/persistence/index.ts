/**
 * Persistence Layer - v4
 *
 * This module provides the data persistence abstraction.
 * It automatically switches between:
 * - LocalStorageAdapter: For development or when Supabase is not configured
 * - SupabaseAdapter: For production with persistent cloud storage
 *
 * The adapter is selected based on the NEXT_PUBLIC_SUPABASE_URL environment variable.
 */

export * from './types';
export * from './PersistenceAdapter';

import type { PersistenceAdapter } from './PersistenceAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';
import { isSupabaseConfigured } from '@/lib/supabase';

// Re-export adapters for direct access if needed
export { LocalStorageAdapter } from './LocalStorageAdapter';
export { SupabaseAdapter } from './SupabaseAdapter';

// Singleton instances
let localStorageAdapter: LocalStorageAdapter | null = null;
let supabaseAdapter: SupabaseAdapter | null = null;

/**
 * Get the appropriate persistence adapter based on configuration.
 *
 * Priority:
 * 1. If Supabase is configured (NEXT_PUBLIC_SUPABASE_URL is set), use SupabaseAdapter
 * 2. Otherwise, fall back to LocalStorageAdapter
 *
 * This allows seamless switching between local development and production.
 */
export function getAdapter(): PersistenceAdapter {
  // Check if Supabase is configured
  const useSupabase = isSupabaseConfigured();

  if (useSupabase) {
    if (!supabaseAdapter) {
      supabaseAdapter = new SupabaseAdapter();
      console.log('📦 Using Supabase for data persistence');
    }
    return supabaseAdapter;
  }

  // Fall back to LocalStorage
  if (!localStorageAdapter) {
    localStorageAdapter = new LocalStorageAdapter();
    console.log('📦 Using LocalStorage for data persistence (Supabase not configured)');
  }
  return localStorageAdapter;
}

/**
 * Force use of LocalStorage adapter (useful for testing or offline mode)
 */
export function getLocalStorageAdapter(): PersistenceAdapter {
  if (!localStorageAdapter) {
    localStorageAdapter = new LocalStorageAdapter();
  }
  return localStorageAdapter;
}

/**
 * Force use of Supabase adapter (throws if not configured)
 */
export function getSupabaseAdapterOrThrow(): PersistenceAdapter {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }
  if (!supabaseAdapter) {
    supabaseAdapter = new SupabaseAdapter();
  }
  return supabaseAdapter;
}

/**
 * Check which adapter is currently in use
 */
export function getCurrentAdapterType(): 'supabase' | 'localStorage' {
  return isSupabaseConfigured() ? 'supabase' : 'localStorage';
}
