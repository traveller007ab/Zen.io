// This is a Deno module for a Supabase Edge Function.
// It handles CORS and securely generates text embeddings using the Gemini API.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// Use npm specifier for Deno to import the Google AI SDK
import { GoogleGenAI } from 'npm:@google/genai@1.19.0';

// FIX: Declare Deno global to address TypeScript error "Cannot find name 'Deno'".
declare const Deno: any;

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
    console.log("Embed function started.");

    const API_KEY = Deno.env.get('API_KEY');
    if (!API_KEY) {
      console.error("CRITICAL: API_KEY environment variable not set.");
      throw new Error("API_KEY environment variable not set. Please set this secret in your Supabase project dashboard.");
    }
    console.log("Step 1: API_KEY found.");

    const body = await req.json();
    const { text, taskType } = body;
    console.log(`Step 2: Received request with taskType: ${taskType}`);

    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.error("Validation failed: Text is missing or empty.");
      throw new Error('Text is a required parameter and cannot be empty.');
    }
    console.log("Step 3: Text validation passed.");
    
    const MAX_TEXT_LENGTH = 8000;
    const truncatedText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'text-embedding-004';
    
    // This is the correct, robust structure for the embedContent API call.
    const content = { parts: [{ text: truncatedText }] };
    let embedding;

    try {
      console.log("Step 4: Attempting to call Gemini API for embedding...");
      const result = await ai.models.embedContent({
        model: model,
        content: content,
        taskType: taskType,
      });
      embedding = result.embedding.values;
      console.log("Step 5: Successfully received embedding from Gemini API.");
    } catch (apiError) {
      console.error("CRITICAL: Gemini API call failed.", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      throw new Error(`Failed to generate embedding from Gemini API. Reason: ${errorMessage}`);
    }

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL: An error occurred in the embed function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});