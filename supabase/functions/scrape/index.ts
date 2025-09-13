// This is a Deno module for a Supabase Edge Function.
// It securely fetches the content of a URL provided by the client.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      throw new Error('URL is a required parameter.');
    }

    // Use Deno's native fetch to get the content of the URL.
    // Add a user-agent to avoid being blocked by some sites.
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    // We are interested in the text content.
    // In a more advanced version, you could use a library to parse HTML and extract main content.
    const content = await response.text();
    
    // For now, let's return a slice of the content to avoid being too verbose.
    // The AI model can handle large contexts, but this is a safeguard.
    const summarizedContent = content.substring(0, 8000);

    return new Response(JSON.stringify({ content: summarizedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
