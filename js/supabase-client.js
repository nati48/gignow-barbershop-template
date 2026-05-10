/* ============================================
   SUPABASE CLIENT INITIALIZATION
   ============================================ */

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// UMD bundle creates global `var supabase = { createClient, ... }`
// We create the client as `db` to avoid name collision
var db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client ready');
