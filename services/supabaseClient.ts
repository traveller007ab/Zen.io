import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// --- IMPORTANT DATABASE SETUP ---
// To enable all features, including long-term memory, please run the following
// SQL commands in your Supabase project's SQL Editor.

/*
-- 1. (RUN ONCE) Enable the pgvector extension for similarity search.
create extension vector with schema extensions;


-- 2. (RUN ONCE) Create the table to store AI memories.
-- Gemini's text-embedding-004 model uses 768 dimensions.
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- Reserved for future multi-user support
  created_at timestamptz default now() not null,
  content text not null,
  embedding vector(768)
);


-- 3. (RUN ONCE) Create a function to search memories by similarity.
create or replace function match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    memories.id,
    memories.content,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where 1 - (memories.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;


-- 4. (REQUIRED FOR MIGRATION) Update 'canvases' table for multi-modal content.
-- If you are migrating from a text-only version, run this command.
-- This is a non-reversible data migration.
ALTER TABLE public.canvases
ALTER COLUMN content TYPE JSONB USING to_jsonb(content);


-- 5. (REQUIRED FOR AGENT) Deploy the Edge Functions.
-- The agent requires server-side functions for memory and tool use.
--
-- a. Make sure you have the Supabase CLI installed and are logged in.
-- b. Place the provided `embed` and `scrape` function code into
--    `supabase/functions/embed/index.ts` and `supabase/functions/scrape/index.ts`.
-- c. Run the following commands from your project's root directory:
--    supabase functions deploy embed --no-verify-jwt
--    supabase functions deploy scrape --no-verify-jwt
--
--    Note: The `--no-verify-jwt` flag is used for simplicity. In a production
--    application with user authentication, you would handle JWT verification.
--
-- d. Set the Gemini API key as a secret for the function to use:
--    supabase secrets set API_KEY=your_gemini_api_key_here

*/


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in config.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
