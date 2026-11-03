import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Administrative Supabase Client (Service Role).
 * CRITICAL SECURITY: Never import or execute this file in client components or browser bundles.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SECRET_KEY is not defined in environment variables.');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
