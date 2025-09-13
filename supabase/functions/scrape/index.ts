// This is a Deno module for a Supabase Edge Function.
// It securely fetches the content of a URL provided by the client.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { Readability } from 'npm:@mozilla/readability@0.5.0';
import { JSDOM } from 'npm:jsdom@24.1.0';


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
    console.log("Scrape function started.");
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      console.error("Validation failed: URL is missing or not a string.");
      throw new Error('URL is a required parameter.');
    }
    console.log(`Step 1: Received request for URL: ${url}`);

    let response;
    try {
      console.log("Step 2: Attempting to fetch URL content...");
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      console.log(`Step 3: Fetch completed with status: ${response.status}`);
    } catch (fetchError) {
      console.error("CRITICAL: Fetch operation failed.", fetchError);
      throw new Error(`Network error while trying to fetch URL. Reason: ${fetchError.message}`);
    }

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();
    console.log("Step 4: Successfully retrieved HTML content.");

    // Use JSDOM and Readability to parse the HTML and extract the main article content
    const doc = new JSDOM(htmlContent, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    let contentToReturn = '';
    if (article && article.textContent) {
        contentToReturn = article.textContent;
        console.log("Step 5: Successfully extracted article content using Readability.");
    } else {
        // Fallback for pages where Readability fails
        contentToReturn = doc.window.document.body.textContent || '';
        console.log("Step 5 (Fallback): Readability failed, using raw text content.");
    }
    
    const MAX_CONTENT_LENGTH = 20000;
    const finalContent = contentToReturn.substring(0, MAX_CONTENT_LENGTH);
    console.log(`Step 6: Content truncated to ${finalContent.length} characters.`);

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL: An error occurred in the scrape function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
