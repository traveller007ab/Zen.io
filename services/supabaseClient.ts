
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// IMPORTANT: Make sure you have created the 'canvases' table in your Supabase project.
// If you have an existing table from a previous version, you need to add the chat_history column.
// You can use the following SQL in the Supabase SQL Editor:
/*
  -- 1. Create the table (if you are starting fresh)
  CREATE TABLE public.canvases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    content TEXT,
    output TEXT
  );

  -- 2. Add the chat history column (if you are upgrading)
  ALTER TABLE public.canvases
  ADD COLUMN chat_history JSONB;

  -- 3. Enable Row Level Security (RLS)
  ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

  -- 4. Create policies to allow all access for this demo
  CREATE POLICY "Allow all access"
  ON public.canvases
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in config.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);