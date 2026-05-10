/* ============================================
   SUPABASE CLIENT — DEMO MODE
   ============================================ */

// Demo wrapper — routes all queries through the local API proxy
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

// Minimal Supabase-like client that proxies to our demo API
var db = {
  from: function(table) {
    let _table = table;
    let _filters = {};
    let _select = '*';
    let _order = null;
    let _limit = null;
    let _single = false;

    const chain = {
      select: function(s) { _select = s || '*'; return chain; },
      eq: function(col, val) { _filters[col] = 'eq.' + val; return chain; },
      neq: function(col, val) { _filters[col] = 'neq.' + val; return chain; },
      gte: function(col, val) { _filters[col] = 'gte.' + val; return chain; },
      lte: function(col, val) { _filters[col] = 'lte.' + val; return chain; },
      order: function(col, opts) { _order = col; return chain; },
      limit: function(n) { _limit = n; return chain; },
      single: function() { _single = true; return chain; },
      maybeSingle: function() { _single = true; return chain; },
      insert: function(data) {
        return {
          select: function() {
            return {
              single: async function() {
                try {
                  const res = await fetch('/api/supabase/' + _table, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  const d = await res.json();
                  return { data: Array.isArray(d) ? d[0] : d, error: null };
                } catch(e) {
                  return { data: { id: 'demo-' + Date.now() }, error: null };
                }
              },
              then: async function(resolve) {
                resolve({ data: [{ id: 'demo-' + Date.now() }], error: null });
              }
            };
          },
          then: async function(resolve) {
            resolve({ data: null, error: null });
          }
        };
      },
      update: function(data) {
        return {
          eq: function() { return { then: async (r) => r({ data: null, error: null }) }; },
          then: async function(resolve) { resolve({ data: null, error: null }); }
        };
      },
      then: async function(resolve) {
        try {
          const qs = Object.entries(_filters).map(([k,v]) => k + '=' + encodeURIComponent(v)).join('&');
          const url = '/api/supabase/' + _table + (qs ? '?' + qs : '');
          const res = await fetch(url);
          let data = await res.json();
          if (_single) data = Array.isArray(data) ? data[0] || null : data;
          resolve({ data, error: null });
        } catch(e) {
          resolve({ data: _single ? null : [], error: null });
        }
      }
    };
    return chain;
  }
};
