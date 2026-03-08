/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for database operations.
 * Configure your Supabase project URL and anon key in environment variables.
 *
 * The client is created lazily to avoid errors when environment variables are not set.
 */

import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
}

// Lazy-initialized client
let _supabaseClient: SupabaseClientType | null = null;

/**
 * Get the Supabase client instance.
 * Returns null if Supabase is not configured.
 */
export function getSupabaseClient(): SupabaseClientType | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return _supabaseClient;
}

/**
 * Get the Supabase client, throwing an error if not configured.
 * Use this when Supabase is required.
 */
export function getSupabaseClientOrThrow(): SupabaseClientType {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }
  return client;
}

// Export for backward compatibility (lazy getter)
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
};

// Export type
export type SupabaseClient = SupabaseClientType;
