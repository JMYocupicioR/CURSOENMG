import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase no configurado. Copia .env.example a .env y agrega tus credenciales.'
  );
}

const authOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
} as const;

/**
 * supabase-js 2.108+ throws in validateSupabaseUrl if the URL is empty.
 * Skip createClient when env is missing so unit tests can import services
 * that only need pure helpers.
 */
function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, authOptions);
}

function createUnconfiguredClient(): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      throw new Error(
        'Supabase no configurado. Copia .env.example a .env y agrega tus credenciales.'
      );
    },
  });
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createBrowserClient()
  : createUnconfiguredClient();

/** Alias tipado de `supabase` para compatibilidad con servicios existentes. */
export const sb: SupabaseClient<Database> = supabase;
