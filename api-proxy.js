const http = require('http');
const PORT = 3098;

// ── Demo Data ───────────────────────────────
const BARBERS = [
  { id: 'b1', name: 'אבי ישראלי', base_price: 80 },
  { id: 'b2', name: 'דניאל כהן', base_price: 60 },
  { id: 'b3', name: 'עידו לוי', base_price: 60 },
  { id: 'b4', name: 'יוסי מזרחי', base_price: 100 },
];

const SERVICES = [
  { id: 's1', name: 'תספורת גבר', price: 60 },
  { id: 's2', name: 'תספורת ועיצוב זקן', price: 110 },
  { id: 's3', name: 'עיצוב זקן בלבד', price: 60 },
  { id: 's4', name: 'תספורת חייל', price: 60 },
  { id: 's5', name: 'תספורת ילד', price: 60 },
  { id: 's6', name: 'ניקוי שעווה / גבות', price: 30 },
  { id: 's7', name: 'צבע / גוונים לגבר', price: 100 },
  { id: 's8', name: 'החלקה לגבר', price: 250 },
];

const DEMO_APPOINTMENTS = [
  { id: 'a1', barber_id: 'b1', service_id: 's1', customer_name: 'ישראל כהן', phone: '0501234567', appointment_date: getTodayISO(), appointment_time: '10:00:00', status: 'confirmed', services: { name: 'תספורת גבר', price: 60 }, created_at: new Date().toISOString() },
  { id: 'a2', barber_id: 'b1', service_id: 's2', customer_name: 'משה לוי', phone: '0509876543', appointment_date: getTodayISO(), appointment_time: '10:30:00', status: 'pending', services: { name: 'תספורת ועיצוב זקן', price: 110 }, created_at: new Date().toISOString() },
  { id: 'a3', barber_id: 'b4', service_id: 's1', customer_name: 'דוד אברהם', phone: '0521111111', appointment_date: getTodayISO(), appointment_time: '11:00:00', status: 'completed', services: { name: 'תספורת גבר', price: 60 }, created_at: new Date().toISOString() },
];

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Default working hours
const DEFAULT_HOURS = {
  0: { open: true, start: '08:00', end: '20:00', slotInterval: 20 },
  1: { open: false },
  2: { open: true, start: '08:00', end: '20:00', slotInterval: 20 },
  3: { open: true, start: '08:00', end: '20:00', slotInterval: 20 },
  4: { open: true, start: '08:00', end: '20:00', slotInterval: 20 },
  5: { open: true, start: '08:00', end: '14:00', slotInterval: 20 },
  6: { open: false },
};

// ── CORS ────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Content-Type': 'application/json',
  };
}

function json(res, data, status = 200) {
  res.writeHead(status, corsHeaders());
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

// ── Server ──────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  const params = new URL(req.url, 'http://localhost').searchParams;

  // Barbers
  if (url === '/api/barbers' && req.method === 'GET') {
    return json(res, BARBERS);
  }
  if (url === '/api/barbers' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const newBarber = { id: 'b' + Date.now(), name: body.name, base_price: body.base_price || 60 };
    BARBERS.push(newBarber);
    return json(res, [newBarber]);
  }
  const barberDel = url.match(/^\/api\/barbers\/(.+)$/);
  if (barberDel && req.method === 'DELETE') {
    const idx = BARBERS.findIndex(b => b.id === barberDel[1]);
    if (idx >= 0) BARBERS.splice(idx, 1);
    return json(res, { ok: true });
  }

  // Services
  if (url === '/api/supabase/services' || (req.url.includes('/rest/v1/services') && req.method === 'GET')) {
    return json(res, SERVICES);
  }

  // Working hours
  const hoursMatch = url.match(/^\/api\/hours\/(.+)$/);
  if (hoursMatch && req.method === 'GET') {
    return json(res, DEFAULT_HOURS);
  }
  if (hoursMatch && (req.method === 'PUT' || req.method === 'POST')) {
    return json(res, { ok: true });
  }

  // Overrides
  const overridesMatch = url.match(/^\/api\/overrides\/(.+)$/);
  if (overridesMatch) {
    return json(res, {});
  }

  // Appointments
  if (req.url.includes('/rest/v1/appointments') && req.method === 'GET') {
    const date = params.get('appointment_date') || `eq.${getTodayISO()}`;
    const dateVal = date.replace('eq.', '');
    const barberId = params.get('barber_id')?.replace('eq.', '');
    let filtered = DEMO_APPOINTMENTS;
    if (dateVal) filtered = filtered.filter(a => a.appointment_date === dateVal);
    if (barberId) filtered = filtered.filter(a => a.barber_id === barberId);
    return json(res, filtered);
  }

  // Supabase demo routes (from demo client)
  if (url === '/api/supabase/services' || url === '/api/supabase/services/') {
    return json(res, SERVICES);
  }
  if (url === '/api/supabase/barbers' || url === '/api/supabase/barbers/') {
    const name = params.get('name')?.replace('eq.','');
    if (name) return json(res, BARBERS.filter(b => b.name === name));
    return json(res, BARBERS);
  }
  if (url === '/api/supabase/customers' || url === '/api/supabase/customers/') {
    return json(res, [{ id: 'c-demo', phone: '0501234567', name: 'Demo User' }]);
  }
  if (url === '/api/supabase/appointments' || url === '/api/supabase/appointments/') {
    if (req.method === 'GET') {
      const date = params.get('appointment_date')?.replace('eq.','');
      const barberId = params.get('barber_id')?.replace('eq.','');
      let filtered = DEMO_APPOINTMENTS;
      if (date) filtered = filtered.filter(a => a.appointment_date === date);
      if (barberId) filtered = filtered.filter(a => a.barber_id === barberId);
      return json(res, filtered);
    }
  }
  // Catch-all supabase demo
  if (url.startsWith('/api/supabase/') && req.method === 'GET') {
    return json(res, []);
  }
  if (url.startsWith('/api/supabase/') && (req.method === 'POST' || req.method === 'PATCH')) {
    return json(res, [{ id: 'demo-' + Date.now() }]);
  }

  // Supabase proxy (catch-all for reads)
  if (req.url.includes('/rest/v1/') && req.method === 'GET') {
    return json(res, []);
  }

  // Supabase proxy (catch-all for writes) 
  if (req.url.includes('/rest/v1/') && (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE')) {
    return json(res, [{ id: 'demo-' + Date.now() }]);
  }

  // Customer appointments
  if (url === '/api/customer/appointments' && req.method === 'GET') {
    const phone = params.get('phone');
    const filtered = DEMO_APPOINTMENTS.filter(a => a.phone === phone);
    return json(res, filtered.map(a => ({
      id: a.id,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      status: a.status,
      service_name: a.services?.name || '',
      barber_name: BARBERS.find(b => b.id === a.barber_id)?.name || ''
    })));
  }

  // Loyalty
  const loyaltyMatch = url.match(/^\/api\/loyalty\/(.+)$/);
  if (loyaltyMatch && req.method === 'GET') {
    return json(res, { enabled: true, visitsForReward: 10, rewardType: 'free_cut', rewardDescription: 'תספורת חינם' });
  }

  // Push
  if (url === '/api/push/vapid-key') return json(res, { publicKey: '' });
  if (url === '/api/push/subscribe') return json(res, { ok: true });
  if (url === '/api/push/send') return json(res, { ok: true, sent: 0, total: 0 });

  // Email
  if (url === '/api/email/send') return json(res, { ok: true });

  // Fallback
  json(res, { ok: true });
});

server.listen(PORT, () => {
  console.log(`✅ Demo API running on http://127.0.0.1:${PORT}`);
});
