// SERVER-ONLY. Never import this from a "use client" component or anything
// that ends up in a browser bundle — it holds the service-role key, which
// bypasses every RLS policy in the database.
//
// This file is only ever imported from Server Actions ('use server' files
// under app/actions/), which Next.js guarantees never ship to the client.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Bulk user creation and admin actions need it — ' +
      'set it as a server-only environment variable (never NEXT_PUBLIC_) and redeploy.'
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** A random, readable temporary password — e.g. "X7p9-Km2q". Meets Supabase's default min length. */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}
