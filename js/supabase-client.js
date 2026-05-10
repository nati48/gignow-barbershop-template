/* ============================================
   SUPABASE CLIENT INITIALIZATION
   ============================================ */

const SUPABASE_URL = 'https://yaboiwxuhhfkbjmqgeet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYm9pd3h1aGhma2JqbXFnZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzc3MjcsImV4cCI6MjA5Mzc1MzcyN30.d5zYcYr-1-CtQRg4fNlznLmBbzVwYpEidJrlGUoszOc';

// UMD bundle creates global `var supabase = { createClient, ... }`
// We create the client as `db` to avoid name collision
var db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client ready');
