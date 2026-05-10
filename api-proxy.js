const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const webPush = require('web-push');
const nodemailer = require('nodemailer');

// ── Load .env ───────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const PORT = 3098;
const SUPABASE_URL = 'https://yaboiwxuhhfkbjmqgeet.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const API_SECRET = process.env.API_SECRET || '';
const MAX_BODY = 100 * 1024; // 100KB

// ── Data directory ──────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Push notification setup ─────────────────
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:ron@ronamar.gignow.co.il';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('🔔 Push notifications configured');
}

// ── Email setup ─────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Ron Amar Barbershop <noreply@ronamar.co.il>';

let emailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  console.log('📧 Email configured via', SMTP_HOST);
} else {
  console.log('📧 Email not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)');
}

function buildConfirmationEmail(data) {
  const { customerName, barberName, serviceName, date, time } = data;
  return {
    subject: `✅ אישור תור — ${serviceName} אצל ${barberName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#C5A059;padding:20px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px">✂️ רון עמר — מספרת גברים</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#C5A059;margin-top:0">היי ${customerName}, התור שלך נקבע!</h2>
          <div style="background:#222;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0">💈 <strong>ספר:</strong> ${barberName}</p>
            <p style="margin:4px 0">✂️ <strong>שירות:</strong> ${serviceName}</p>
            <p style="margin:4px 0">📅 <strong>תאריך:</strong> ${date}</p>
            <p style="margin:4px 0">🕐 <strong>שעה:</strong> ${time}</p>
          </div>
          <p style="color:#999;font-size:13px">התור ממתין לאישור הספר. תקבל עדכון ברגע שהתור יאושר.</p>
        </div>
        <div style="background:#111;padding:12px;text-align:center;font-size:12px;color:#666">
          רון עמר | קרן קיימת לישראל 8, קרית מוצקין
        </div>
      </div>
    `
  };
}

function buildCancellationEmail(data) {
  const { customerName, barberName, serviceName, date, time } = data;
  return {
    subject: `❌ התור שלך בוטל — ${barberName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#e74c3c;padding:20px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px">✂️ רון עמר — מספרת גברים</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#e74c3c;margin-top:0">היי ${customerName}, התור שלך בוטל</h2>
          <div style="background:#222;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0">💈 <strong>ספר:</strong> ${barberName}</p>
            <p style="margin:4px 0">✂️ <strong>שירות:</strong> ${serviceName}</p>
            <p style="margin:4px 0">📅 <strong>תאריך:</strong> ${date}</p>
            <p style="margin:4px 0">🕐 <strong>שעה:</strong> ${time}</p>
          </div>
          <p style="color:#999;font-size:13px">ניתן לקבוע תור חדש דרך האתר בכל עת.</p>
        </div>
        <div style="background:#111;padding:12px;text-align:center;font-size:12px;color:#666">
          רון עמר | קרן קיימת לישראל 8, קרית מוצקין
        </div>
      </div>
    `
  };
}

function buildApprovalEmail(data) {
  const { customerName, barberName, serviceName, date, time } = data;
  return {
    subject: `🎉 התור שלך אושר — ${serviceName} אצל ${barberName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a1a;color:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#27ae60;padding:20px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px">✂️ רון עמר — מספרת גברים</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#27ae60;margin-top:0">היי ${customerName}, התור שלך אושר! 🎉</h2>
          <div style="background:#222;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0">💈 <strong>ספר:</strong> ${barberName}</p>
            <p style="margin:4px 0">✂️ <strong>שירות:</strong> ${serviceName}</p>
            <p style="margin:4px 0">📅 <strong>תאריך:</strong> ${date}</p>
            <p style="margin:4px 0">🕐 <strong>שעה:</strong> ${time}</p>
          </div>
          <p style="color:#999;font-size:13px">מחכים לראות אותך! 💈</p>
        </div>
        <div style="background:#111;padding:12px;text-align:center;font-size:12px;color:#666">
          רון עמר | קרן קיימת לישראל 8, קרית מוצקין
        </div>
      </div>
    `
  };
}

const PUSH_SUBS_PATH = path.join(DATA_DIR, 'push_subscriptions.json');

function readPushSubs() {
  try { return JSON.parse(fs.readFileSync(PUSH_SUBS_PATH, 'utf8')); } catch { return []; }
}

function writePushSubs(subs) {
  fs.writeFileSync(PUSH_SUBS_PATH, JSON.stringify(subs, null, 2));
}

async function sendPushToSubscription(sub, payload) {
  try {
    await webPush.sendNotification(sub.subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired, remove it
      const subs = readPushSubs();
      const filtered = subs.filter(s => s.subscription.endpoint !== sub.subscription.endpoint);
      writePushSubs(filtered);
    }
    return false;
  }
}

const ALLOWED_ORIGINS = [
  'https://barber.gignow.co.il',
  'https://barber.gignow.co.il',
];

const ALLOWED_OPERATIONS = [
  'PATCH /rest/v1/services',
  'POST /rest/v1/services',
  'DELETE /rest/v1/services',
  'PATCH /rest/v1/barbers',
  'POST /rest/v1/barbers',
  'DELETE /rest/v1/barbers',
  'GET /rest/v1/services',
  'PATCH /rest/v1/appointments',
  'DELETE /rest/v1/appointments',
  'GET /rest/v1/appointments',
];

// ── These operations require auth ───────────
const AUTH_REQUIRED_OPS = [
  'PATCH /rest/v1/appointments',
  'DELETE /rest/v1/appointments',
  'GET /rest/v1/appointments',
  'PATCH /rest/v1/services',
  'POST /rest/v1/services',
  'DELETE /rest/v1/services',
  'PATCH /rest/v1/barbers',
];

function proxyToSupabase(path, method, body, res, corsHeaders) {
  const op = `${method} ${path.split('?')[0]}`;
  if (!ALLOWED_OPERATIONS.some(a => op.startsWith(a))) {
    res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Operation not allowed' }));
    return;
  }

  const url = new URL(path, SUPABASE_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      ...corsHeaders,
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: e.message }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}

// ── Loyalty storage ─────────────────────────
function getLoyaltyPath(barberId) {
  const safe = barberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `loyalty_${safe}.json`);
}
function readLoyalty(barberId) {
  try { return JSON.parse(fs.readFileSync(getLoyaltyPath(barberId), 'utf8')); }
  catch { return { enabled: false, visitsForReward: 10, rewardType: 'free_cut', rewardDescription: 'תספורת חינם', customers: {} }; }
}
function writeLoyalty(barberId, data) {
  fs.writeFileSync(getLoyaltyPath(barberId), JSON.stringify(data, null, 2));
}

// ── Working hours storage ───────────────────
function getHoursPath(barberId) {
  const safe = barberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `hours_${safe}.json`);
}
function readHours(barberId) {
  try { return JSON.parse(fs.readFileSync(getHoursPath(barberId), 'utf8')); } catch { return null; }
}
function writeHours(barberId, data) {
  fs.writeFileSync(getHoursPath(barberId), JSON.stringify(data, null, 2));
}

function getOverridesPath(barberId) {
  const safe = barberId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `overrides_${safe}.json`);
}
function readOverrides(barberId) {
  try { return JSON.parse(fs.readFileSync(getOverridesPath(barberId), 'utf8')); } catch { return {}; }
}
function writeOverrides(barberId, data) {
  fs.writeFileSync(getOverridesPath(barberId), JSON.stringify(data, null, 2));
}

// ── Safe body reader ────────────────────────
function readBody(req, res, corsHeaders, cb) {
  let body = '';
  let aborted = false;
  req.on('data', chunk => {
    body += chunk;
    if (body.length > MAX_BODY) {
      aborted = true;
      res.writeHead(413, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Request too large' }));
      req.destroy();
    }
  });
  req.on('end', () => { if (!aborted) cb(body); });
}

// ── Auth check ──────────────────────────────
function checkAuth(req) {
  if (!API_SECRET) return true; // no secret configured = no auth
  const authHeader = req.headers['x-api-key'] || '';
  return authHeader === API_SECRET;
}

function denyAuth(res, corsHeaders) {
  res.writeHead(401, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

// ── CORS helper ─────────────────────────────
function getCorsHeaders(req) {
  const origin = req.headers['origin'] || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// ── Server ──────────────────────────────────
const server = http.createServer((req, res) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // ── Working hours (GET = public, PUT = auth required) ──
  const hoursMatch = req.url.match(/^\/api\/hours\/([a-zA-Z0-9_-]+)$/);
  if (hoursMatch) {
    const barberId = hoursMatch[1];
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(readHours(barberId) || {}));
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      if (!checkAuth(req)) return denyAuth(res, corsHeaders);
      readBody(req, res, corsHeaders, (body) => {
        try {
          writeHours(barberId, JSON.parse(body));
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // ── Overrides (GET = public, PUT = auth required) ──
  const overridesMatch = req.url.match(/^\/api\/overrides\/([a-zA-Z0-9_-]+)$/);
  if (overridesMatch) {
    const barberId = overridesMatch[1];
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(readOverrides(barberId)));
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      if (!checkAuth(req)) return denyAuth(res, corsHeaders);
      readBody(req, res, corsHeaders, (body) => {
        try {
          writeOverrides(barberId, JSON.parse(body));
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // ── VAPID public key (public, no auth) ──
  if (req.url === '/api/push/vapid-key' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ publicKey: VAPID_PUBLIC }));
    return;
  }

  // ── Push subscribe (public — anyone can subscribe) ──
  if (req.url === '/api/push/subscribe' && req.method === 'POST') {
    readBody(req, res, corsHeaders, (body) => {
      try {
        const data = JSON.parse(body);
        if (!data.subscription || !data.subscription.endpoint) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Missing subscription' }));
          return;
        }
        const subs = readPushSubs();
        // Avoid duplicates by endpoint
        const exists = subs.find(s => s.subscription.endpoint === data.subscription.endpoint);
        if (!exists) {
          subs.push({
            subscription: data.subscription,
            phone: data.phone || '',
            customerName: data.customerName || '',
            createdAt: new Date().toISOString()
          });
          writePushSubs(subs);
        } else {
          // Update metadata
          if (data.phone) exists.phone = data.phone;
          if (data.customerName) exists.customerName = data.customerName;
          writePushSubs(subs);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Push send (auth required) ──
  if (req.url === '/api/push/send' && req.method === 'POST') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    readBody(req, res, corsHeaders, async (body) => {
      try {
        const data = JSON.parse(body);
        const payload = {
          title: data.title || 'רון עמר מספרה',
          body: data.body || '',
          icon: '/images/icon-192.png',
          tag: data.tag || 'ronamar-notification',
          url: data.url || '/',
          appointmentId: data.appointmentId || null
        };
        const subs = readPushSubs();
        let targets = subs;
        // Filter by phone if specified
        if (data.phone) {
          targets = subs.filter(s => s.phone === data.phone);
        }
        let sent = 0;
        for (const sub of targets) {
          const ok = await sendPushToSubscription(sub, payload);
          if (ok) sent++;
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true, sent, total: targets.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: e.message || 'Error sending push' }));
      }
    });
    return;
  }

  // ── Push subscriptions list (auth required) ──
  if (req.url === '/api/push/subscriptions' && req.method === 'GET') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    const subs = readPushSubs();
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(subs));
    return;
  }

  // ── Loyalty endpoints ──
  const loyaltyMatch = req.url.match(/^\/api\/loyalty\/([a-zA-Z0-9_-]+)$/);
  if (loyaltyMatch) {
    const barberId = loyaltyMatch[1];
    if (req.method === 'GET') {
      const data = readLoyalty(barberId);
      // Public: return config without full customer list
      const publicData = { enabled: data.enabled, visitsForReward: data.visitsForReward, rewardType: data.rewardType, rewardDescription: data.rewardDescription };
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(publicData));
      return;
    }
    if (req.method === 'PUT') {
      if (!checkAuth(req)) return denyAuth(res, corsHeaders);
      readBody(req, res, corsHeaders, (body) => {
        try {
          const update = JSON.parse(body);
          const existing = readLoyalty(barberId);
          // Merge config fields only, preserve customers
          if (update.enabled !== undefined) existing.enabled = update.enabled;
          if (update.visitsForReward !== undefined) existing.visitsForReward = update.visitsForReward;
          if (update.rewardType !== undefined) existing.rewardType = update.rewardType;
          if (update.rewardDescription !== undefined) existing.rewardDescription = update.rewardDescription;
          writeLoyalty(barberId, existing);
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // ── Loyalty: record visit ──
  const loyaltyVisitMatch = req.url.match(/^\/api\/loyalty\/([a-zA-Z0-9_-]+)\/visit$/);
  if (loyaltyVisitMatch && req.method === 'POST') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    const barberId = loyaltyVisitMatch[1];
    readBody(req, res, corsHeaders, (body) => {
      try {
        const { phone, name } = JSON.parse(body);
        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Phone required' }));
          return;
        }
        const data = readLoyalty(barberId);
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        if (!data.customers[cleanPhone]) {
          data.customers[cleanPhone] = { name: name || '', visits: 0, totalRewards: 0, lastVisit: null };
        }
        data.customers[cleanPhone].visits++;
        data.customers[cleanPhone].lastVisit = new Date().toISOString().slice(0, 10);
        if (name) data.customers[cleanPhone].name = name;

        let rewardEarned = false;
        if (data.enabled && data.visitsForReward > 0 && data.customers[cleanPhone].visits >= data.visitsForReward) {
          data.customers[cleanPhone].visits -= data.visitsForReward;
          data.customers[cleanPhone].totalRewards++;
          rewardEarned = true;
        }

        writeLoyalty(barberId, data);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true, customer: data.customers[cleanPhone], rewardEarned }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Loyalty: redeem reward ──
  const loyaltyRedeemMatch = req.url.match(/^\/api\/loyalty\/([a-zA-Z0-9_-]+)\/redeem$/);
  if (loyaltyRedeemMatch && req.method === 'POST') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    const barberId = loyaltyRedeemMatch[1];
    readBody(req, res, corsHeaders, (body) => {
      try {
        const { phone } = JSON.parse(body);
        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Phone required' }));
          return;
        }
        const data = readLoyalty(barberId);
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const customer = data.customers[cleanPhone];
        if (!customer) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Customer not found' }));
          return;
        }
        if (customer.totalRewards <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'No rewards to redeem' }));
          return;
        }
        customer.totalRewards--;
        writeLoyalty(barberId, data);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true, customer }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Loyalty: check customer status (public) ──
  const loyaltyCheckMatch = req.url.match(/^\/api\/loyalty\/([a-zA-Z0-9_-]+)\/check\/([\d+]+)$/);
  if (loyaltyCheckMatch && req.method === 'GET') {
    const barberId = loyaltyCheckMatch[1];
    const phone = loyaltyCheckMatch[2];
    const data = readLoyalty(barberId);
    if (!data.enabled) {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ enabled: false }));
      return;
    }
    const customer = data.customers[phone] || null;
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      enabled: true,
      visitsForReward: data.visitsForReward,
      rewardDescription: data.rewardDescription,
      customer: customer ? { name: customer.name, visits: customer.visits, totalRewards: customer.totalRewards, lastVisit: customer.lastVisit } : null
    }));
    return;
  }

  // ── Loyalty: get all customers (auth required, for dashboard) ──
  const loyaltyCustomersMatch = req.url.match(/^\/api\/loyalty\/([a-zA-Z0-9_-]+)\/customers$/);
  if (loyaltyCustomersMatch && req.method === 'GET') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    const barberId = loyaltyCustomersMatch[1];
    const data = readLoyalty(barberId);
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(data));
    return;
  }

  // ── Email send (public — for booking confirmations) ──
  if (req.url === '/api/email/send' && req.method === 'POST') {
    readBody(req, res, corsHeaders, async (body) => {
      try {
        if (!emailTransporter) {
          res.writeHead(503, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Email not configured' }));
          return;
        }
        const data = JSON.parse(body);
        if (!data.to || !data.type) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Missing to or type' }));
          return;
        }
        let emailContent;
        if (data.type === 'confirmation') emailContent = buildConfirmationEmail(data);
        else if (data.type === 'cancellation') emailContent = buildCancellationEmail(data);
        else if (data.type === 'approval') emailContent = buildApprovalEmail(data);
        else {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Unknown email type' }));
          return;
        }
        await emailTransporter.sendMail({
          from: EMAIL_FROM,
          to: data.to,
          subject: emailContent.subject,
          html: emailContent.html
        });
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Email send error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: e.message || 'Email failed' }));
      }
    });
    return;
  }

  // ── Barbers: list (public) ──
  if (req.url === '/api/barbers' && req.method === 'GET') {
    const fetchUrl = new URL('/rest/v1/barbers?select=id,name,base_price&name=like.*%5BDEMO%5D*&order=created_at.asc', SUPABASE_URL);
    https.get({
      hostname: fetchUrl.hostname,
      path: fetchUrl.pathname + fetchUrl.search,
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    }, (proxyRes) => {
      let body = '';
      proxyRes.on('data', c => body += c);
      proxyRes.on('end', () => {
        try {
          // Strip [DEMO] tag from names for display
          const barbers = JSON.parse(body).map(b => ({ ...b, name: b.name.replace(' [DEMO]', '') }));
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify(barbers));
        } catch(e) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(body);
        }
      });
    }).on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // ── Barbers: add (auth required) ──
  if (req.url === '/api/barbers' && req.method === 'POST') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    readBody(req, res, corsHeaders, (body) => {
      try {
        const { name, base_price } = JSON.parse(body);
        if (!name || !name.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Name required' }));
          return;
        }
        proxyToSupabase(`/rest/v1/barbers`, 'POST', JSON.stringify({ name: name.trim(), base_price: base_price || 60 }), res, corsHeaders);
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Barbers: delete (auth required) ──
  const barberDeleteMatch = req.url.match(/^\/api\/barbers\/([a-zA-Z0-9_-]+)$/);
  if (barberDeleteMatch && req.method === 'DELETE') {
    if (!checkAuth(req)) return denyAuth(res, corsHeaders);
    const barberId = barberDeleteMatch[1];
    proxyToSupabase(`/rest/v1/barbers?id=eq.${barberId}`, 'DELETE', null, res, corsHeaders);
    return;
  }

  // ── Customer: get my appointments (public) ──
  if (req.url.startsWith('/api/customer/appointments') && req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const phone = params.get('phone');
    const name = params.get('name');
    if (!phone || !name) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Missing phone or name' }));
      return;
    }
    // Query Supabase for this customer's future appointments
    const now = new Date().toISOString().slice(0, 10);
    const query = `/rest/v1/appointments?phone=eq.${encodeURIComponent(phone)}&customer_name=eq.${encodeURIComponent(name)}&appointment_date=gte.${now}&order=appointment_date.asc,appointment_time.asc&select=id,appointment_date,appointment_time,status,customer_name,phone,barber_id,service_id,services(name),barbers(name)`;
    const url = new URL(query, SUPABASE_URL);
    https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    }, (proxyRes) => {
      let body = '';
      proxyRes.on('data', c => body += c);
      proxyRes.on('end', () => {
        try {
          const appts = JSON.parse(body).map(a => ({
            id: a.id,
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time,
            status: a.status,
            service_name: a.services?.name || '',
            barber_name: a.barbers?.name || ''
          }));
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify(appts));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Parse error' }));
        }
      });
    }).on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // ── Customer: cancel appointment (public, 4h rule) ──
  if (req.url === '/api/customer/cancel' && req.method === 'POST') {
    readBody(req, res, corsHeaders, async (body) => {
      try {
        const { appointmentId, phone, name } = JSON.parse(body);
        if (!appointmentId || !phone || !name) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Missing fields' }));
          return;
        }
        // Fetch the appointment to verify ownership + time
        const fetchUrl = new URL(`/rest/v1/appointments?id=eq.${appointmentId}&phone=eq.${encodeURIComponent(phone)}&select=id,appointment_date,appointment_time,status,customer_name,service_id,barber_id,services(name),barbers(name)`, SUPABASE_URL);
        const apptData = await new Promise((resolve, reject) => {
          https.get({
            hostname: fetchUrl.hostname,
            path: fetchUrl.pathname + fetchUrl.search,
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
          }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
          }).on('error', reject);
        });

        if (!apptData || !apptData.length) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: '\u05ea\u05d5\u05e8 \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0' }));
          return;
        }
        const appt = apptData[0];
        if (appt.status === 'cancelled' || appt.status === 'completed') {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d1\u05d8\u05dc \u05ea\u05d5\u05e8 \u05d6\u05d4' }));
          return;
        }
        // Check 4-hour rule
        const apptTime = new Date(appt.appointment_date + 'T' + appt.appointment_time);
        const now = new Date();
        const hoursUntil = (apptTime - now) / (1000*60*60);
        if (hoursUntil <= 4) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d1\u05d8\u05dc \u05ea\u05d5\u05e8 \u05e4\u05d7\u05d5\u05ea \u05de-4 \u05e9\u05e2\u05d5\u05ea \u05dc\u05e4\u05e0\u05d9 \u05d4\u05de\u05d5\u05e2\u05d3' }));
          return;
        }
        // Cancel it
        const patchUrl = new URL(`/rest/v1/appointments?id=eq.${appointmentId}`, SUPABASE_URL);
        await new Promise((resolve, reject) => {
          const patchReq = https.request({
            hostname: patchUrl.hostname,
            path: patchUrl.pathname + patchUrl.search,
            method: 'PATCH',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve(d));
          });
          patchReq.on('error', reject);
          patchReq.write(JSON.stringify({ status: 'cancelled' }));
          patchReq.end();
        });

        // Send cancellation email if customer has email
        if (emailTransporter) {
          try {
            const custUrl = new URL(`/rest/v1/customers?phone=eq.${encodeURIComponent(phone)}&select=email`, SUPABASE_URL);
            const custData = await new Promise((resolve, reject) => {
              https.get({
                hostname: custUrl.hostname,
                path: custUrl.pathname + custUrl.search,
                headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
              }, (r) => {
                let d = ''; r.on('data', c => d += c);
                r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve([]); } });
              }).on('error', () => resolve([]));
            });
            const email = custData[0]?.email;
            if (email) {
              const dateFormatted = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const content = buildCancellationEmail({
                customerName: appt.customer_name || name,
                barberName: appt.barbers?.name || '',
                serviceName: appt.services?.name || '',
                date: dateFormatted,
                time: appt.appointment_time.slice(0,5)
              });
              emailTransporter.sendMail({ from: EMAIL_FROM, to: email, subject: content.subject, html: content.html }).catch(() => {});
            }
          } catch(e) { /* ignore email errors */ }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: e.message || 'Error' }));
      }
    });
    return;
  }

  // ── Supabase proxy (write ops = auth required) ──
  if (!req.url.startsWith('/api/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const supaPath = req.url.replace('/api', '');
  const op = `${req.method} ${supaPath.split('?')[0]}`;
  const needsAuth = AUTH_REQUIRED_OPS.some(a => op.startsWith(a));

  if (needsAuth && !checkAuth(req)) {
    return denyAuth(res, corsHeaders);
  }

  readBody(req, res, corsHeaders, (body) => {
    proxyToSupabase(supaPath, req.method, body || null, res, corsHeaders);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ API proxy running on http://127.0.0.1:${PORT} (auth: ${API_SECRET ? 'enabled' : 'disabled'})`);
});
