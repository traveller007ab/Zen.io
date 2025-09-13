
// --- Centralized Configuration ---
// This file securely manages all the secret keys and configuration variables for the application.
// By centralizing them here, we avoid hardcoding sensitive information directly into HTML or component files.

// IMPORTANT: In a real-world production application, these keys should be loaded from
// environment variables on a server or a secure vault, not stored in version control.
// For this self-contained project, this file serves as the single source of truth.

// FIX: Removed the hardcoded GEMINI_API_KEY to align with the guideline of
// sourcing the API key exclusively from environment variables.
/**
 * The unique URL for your Supabase project.
 */
export const SUPABASE_URL = "https://ejiwzdtksmgxmesenmli.supabase.co";

/**
 * The public "anonymous" key for your Supabase project.
 * This key is safe to be used in a browser environment.
 */
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXd6ZHRrc21neG1lc2VubWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTU5ODQsImV4cCI6MjA3MzA5MTk4NH0.UzWfkNbDkbDzkd8rhpngT6_PcGgPHemSZ0zZdKXvBu8";
