import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export const getSupabase = (url?: string, key?: string) => {
  // If we already have a client and the credentials haven't changed, return it.
  if (supabase && currentUrl === url && currentKey === key) {
    return supabase;
  }

  if (!url || !key) return null;
  
  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false // For ERP/POS, we usually handle session-less anon access for sync
      }
    });
    currentUrl = url;
    currentKey = key;
    return supabase;
  } catch (err) {
    console.error('Supabase client initialization failed:', err);
    return null;
  }
};

export const resetSupabase = () => {
  supabase = null;
  currentUrl = null;
  currentKey = null;
};