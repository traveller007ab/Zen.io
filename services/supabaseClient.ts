import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// IMPORTANT: Make sure you have created the 'canvases' table in your Supabase project.
// If you are migrating from a text-only version to the multi-modal version, you MUST
// run the following SQL command to update your table structure.
// This is a non-reversible data migration.
/*
  -- Alters the 'content' column to support storing complex data like text and images.
  ALTER TABLE public.canvases
  ALTER COLUMN content TYPE JSONB USING to_jsonb(content);
*/


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in config.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);