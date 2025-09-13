// This is a Deno module for a Supabase Edge Function.
// It handles CORS and securely generates text embeddings using the Gemini API.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Use npm specifier for Deno to import the Google AI SDK
import { GoogleGenAI } from 'npm:@google/genai@0.12.0';

// FIX: Declare Deno global to address TypeScript error "Cannot find name 'Deno'".
// This is necessary because the static analysis environment isn't aware of the Deno runtime globals.
declare const Deno: any;

// Define CORS headers for browser-based client access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      throw new Error('Text is a required parameter.');
    }

    // Retrieve the Gemini API key securely from Supabase's environment variables.
    const API_KEY = Deno.env.get('API_KEY');
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set in Supabase secrets.");
    }

    // Initialize the Google AI client
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Use the recommended model for text embeddings, which generates 768-dimension vectors.
    const model = 'text-embedding-004'; 

    const result = await ai.embedding.embedContent({
        model: model,
        content: text,
    });

    // Extract the embedding vector from the API response.
    const embedding = result.embedding.values;

    // Return the embedding to the client.
    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Return a generic error response if anything goes wrong.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
