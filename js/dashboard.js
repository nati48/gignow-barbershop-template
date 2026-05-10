/* ============================================
   DASHBOARD.JS — Barber Dashboard (Pro v2)
   ============================================ */

// ── Globals ─────────────────────────────────
let currentBarberLoggedIn = null;
let currentBarberId = null;
let currentBarberRow = null;
let currentTab = 'appointments';
let dashServicesCache = [];
let dashAppointmentsCache = [];
let dashCalendarMonth = new Date().getMonth();
let dashCalendarYear = new Date().getFullYear();

const SUPA_URL = 'https://YOUR_PROJECT.supabase.co';
const API_KEY = '';

const HEB_DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const DEFAULT_HOURS = {
  0: { open: true,  start: '09:00', end: '20:00', breaks: [] },
  1: { open: false, start: '09:00', end: '20:00', breaks: [] },
  2: { open: true,  start: '09:00', end: '20:00', breaks: [] },
  3: { open: true,  start: '09:00', end: '20:00', breaks: [] },
  4: { open: true,  start: '09:00', end: '20:00', breaks: [] },
  5: { open: true,  start: '08:00', end: '15:00', breaks: [] },
  6: { open: false, start: '09:00', end: '20:00', breaks: [] },
};
const DEFAULT_SLOT_INTERVAL = 20; // minutes between appointments
let _slotInterval = DEFAULT_SLOT_INTERVAL;

// ── Service-key REST helper for elevated ops ────
async function supaRest(method, path, body) {
  const res = await fetch(`/api/rest/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

// ── Toast notification ──────────────────────
function showToast(message, type = 'success') {
  // Remove any existing toast
  const old = document.getElementById('dash-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'dash-toast';
  toast.className = `dash-toast ${type}`;
  
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── Open / Close Dashboard ──────────────────
function openDashboard() {
  const overlay = document.getElementById('dashboard-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeDashboard() {
  const overlay = document.getElementById('dashboard-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  document.body.style.overflow = '';
  dashLogout();
}

// ── Login ───────────────────────────────────
async function dashLogin() {
  const barberName = document.getElementById('dash-barber-select').value;
  const password = document.getElementById('dash-password').value;

  const stored = localStorage.getItem(`barberPwd_${barberName}`);
  const expected = stored || '1234';
  if (password !== expected) {
    showToast('סיסמה שגויה', 'error');
    return;
  }

  try {
    const { data: barberData, error } = await db
      .from('barbers').select('*').eq('name', barberName).single();
    if (error || !barberData) {
      showToast('הספר לא נמצא במערכת', 'error');
      return;
    }
    currentBarberId = barberData.id;
    currentBarberRow = barberData;
  } catch (e) {
    showToast('שגיאה בהתחברות: ' + e.message, 'error');
    return;
  }

  currentBarberLoggedIn = barberName;

  // Pre-load working hours & overrides from server
  await fetchWorkingHours();
  await fetchOverrides();

  document.getElementById('dash-login').classList.add('hidden');
  const main = document.getElementById('dash-main');
  main.classList.remove('hidden');
  main.classList.add('flex');
  document.getElementById('dash-header-name').textContent = barberName;

  // Show barber management tab only for רון עמר
  const isAdmin = barberName === '\u05e8\u05d5\u05df \u05e2\u05de\u05e8';
  const tabBtn = document.getElementById('tab-btn-barbers');
  const mobileTabBtn = document.getElementById('mobile-tab-btn-barbers');
  if (tabBtn) tabBtn.style.display = isAdmin ? '' : 'none';
  if (mobileTabBtn) mobileTabBtn.style.display = isAdmin ? '' : 'none';

  switchTab('appointments');
}

function dashLogout() {
  currentBarberLoggedIn = null;
  currentBarberId = null;
  currentBarberRow = null;
  document.getElementById('dash-login').classList.remove('hidden');
  const main = document.getElementById('dash-main');
  main.classList.add('hidden');
  main.classList.remove('flex');
  document.getElementById('dash-password').value = '';
}

// ── Tabs ────────────────────────────────────
function switchTab(name) {
  currentTab = name;

  document.querySelectorAll('.dash-tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-${name}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.dash-tab-btn, .dash-mobile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });

  if (name === 'appointments') {
    const picker = document.getElementById('appt-date-picker');
    if (!picker.value) picker.value = todayISO();
    loadAppointments();
  } else if (name === 'new-appt') {
    initNewAppointmentTab();
  } else if (name === 'hours') {
    renderWorkingHours();
  } else if (name === 'prices') {
    loadPrices();
  } else if (name === 'customers') {
    loadCustomers();
  } else if (name === 'reports') {
    loadReports();
  } else if (name === 'loyalty') {
    loadLoyaltyTab();
  } else if (name === 'profile') {
    loadProfile();
  } else if (name === 'barbers') {
    loadBarbersManage();
  }
}

// ── Helpers ─────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function appointmentsToday() {
  document.getElementById('appt-date-picker').value = todayISO();
  loadAppointments();
}

function appointmentsShiftDay(delta) {
  const picker = document.getElementById('appt-date-picker');
  const cur = picker.value ? new Date(picker.value + 'T00:00:00') : new Date();
  cur.setDate(cur.getDate() + delta);
  picker.value = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
  loadAppointments();
}

// ── Load Appointments ───────────────────────
async function loadAppointments() {
  const container = document.getElementById('appointments-list');
  container.innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>';

  const date = document.getElementById('appt-date-picker').value || todayISO();

  // Update label
  const labelEl = document.getElementById('appt-date-label');
  if (labelEl) {
    const d = new Date(date + 'T00:00:00');
    const isToday = date === todayISO();
    const formatted = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    labelEl.textContent = isToday ? `היום · ${formatted}` : formatted;
  }

  try {
    const { data: appointments, error } = await db
      .from('appointments')
      .select('*, services(name, price)')
      .eq('barber_id', currentBarberId)
      .eq('appointment_date', date)
      .order('appointment_time', { ascending: true });

    if (error) throw error;
    dashAppointmentsCache = appointments || [];

    // Split active vs cancelled
    const activeAppts = dashAppointmentsCache.filter(a => a.status !== 'cancelled');
    const cancelledAppts = dashAppointmentsCache.filter(a => a.status === 'cancelled');

    // Update stats (only active)
    const total = activeAppts.length;
    const completed = activeAppts.filter(a => a.status === 'completed').length;
    const confirmed = activeAppts.filter(a => a.status === 'confirmed').length;
    const pending = activeAppts.filter(a => a.status === 'pending').length;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-pending').textContent = pending + confirmed;

    if (total === 0 && cancelledAppts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>אין תורים בתאריך זה</p>
        </div>`;
      return;
    }

    // Fetch loyalty data for badges
    let loyaltyData = null;
    try {
      const loyRes = await fetch(`/api/loyalty/${currentBarberId}/customers`, { headers: { 'X-Api-Key': API_KEY } });
      loyaltyData = await loyRes.json();
    } catch (e) { /* no loyalty data */ }

    container.innerHTML = '';

    // Only show active appointments (not cancelled)
    const aptsToShow = activeAppts;

    if (aptsToShow.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>אין תורים פעילים בתאריך זה</p>
        </div>`;
    }

    aptsToShow.forEach(appt => {
      const card = document.createElement('div');
      const statusClass = appt.status === 'completed' ? 'completed'
                       : appt.status === 'cancelled' ? 'cancelled'
                       : appt.status === 'pending' ? 'pending' : '';
      card.className = `appt-row ${statusClass}`;
      card.id = `appt-${appt.id}`;

      const timeStr = appt.status === 'waitlist' ? '🔔' : appt.appointment_time.slice(0,5);
      const serviceName = appt.services?.name || 'שירות';
      const price = appt.services?.price ? `₪${appt.services.price}` : '';

      const phoneClean = (appt.phone || '').replace(/[^\d+]/g, '');
      const statusLabel = appt.status === 'completed' ? 'הושלם'
                       : appt.status === 'cancelled' ? 'בוטל'
                       : appt.status === 'pending' ? 'ממתין לאישור'
                       : appt.status === 'waitlist' ? 'רשימת המתנה' : 'מאושר';
      const statusIcon = appt.status === 'completed' ? 'fa-circle-check'
                       : appt.status === 'cancelled' ? 'fa-circle-xmark'
                       : appt.status === 'pending' ? 'fa-hourglass-half'
                       : appt.status === 'waitlist' ? 'fa-bell' : 'fa-circle-dot';

      // Loyalty badge
      let loyaltyBadge = '';
      if (loyaltyData && loyaltyData.enabled && phoneClean) {
        const lc = loyaltyData.customers?.[phoneClean];
        if (lc) {
          loyaltyBadge = `<span class="loyalty-badge">⭐ ${lc.visits}/${loyaltyData.visitsForReward}</span>`;
        }
      }

      card.innerHTML = `
        <div class="time-badge">${timeStr}</div>
        <div class="info">
          <div class="name">
            <span>${escapeHtml(appt.customer_name || 'לקוח')}</span>
            <span class="status-pill ${appt.status}"><i class="fa-solid ${statusIcon}"></i> ${statusLabel}</span>
            ${loyaltyBadge}
          </div>
          <div class="meta">
            <span><i class="fa-solid fa-scissors text-gold"></i> ${escapeHtml(serviceName)}</span>
            ${price ? `<span>${price}</span>` : ''}
            <span><a href="tel:${phoneClean}" dir="ltr">${escapeHtml(appt.phone || '')}</a></span>
          </div>
        </div>
        <div class="actions">
          ${appt.status === 'pending' ? `
            <button class="appt-action-btn approve" onclick="approveAppointment('${appt.id}')" title="אשר תור">
              <i class="fa-solid fa-check-double"></i><span class="btn-label"> אשר</span>
            </button>
            <button class="appt-action-btn reschedule" onclick="openReschedule('${appt.id}')" title="שנה שעה">
              <i class="fa-solid fa-clock-rotate-left"></i><span class="btn-label"> שנה</span>
            </button>
            <button class="appt-action-btn" onclick="sendAppointmentReminder('${appt.id}')" title="שלח תזכורת" style="color:#60a5fa">
              <i class="fa-solid fa-bell"></i><span class="btn-label"> תזכורת</span>
            </button>
            <button class="appt-action-btn cancel" onclick="cancelAppointment('${appt.id}')" title="דחה">
              <i class="fa-solid fa-xmark"></i><span class="btn-label"> דחה</span>
            </button>` : ''}
          ${appt.status === 'confirmed' ? `
            <button class="appt-action-btn complete" onclick="markComplete('${appt.id}')" title="סמן כהושלם">
              <i class="fa-solid fa-check"></i><span class="btn-label"> הושלם</span>
            </button>
            <button class="appt-action-btn reschedule" onclick="openReschedule('${appt.id}')" title="שנה שעה">
              <i class="fa-solid fa-clock-rotate-left"></i><span class="btn-label"> שנה</span>
            </button>
            <button class="appt-action-btn" onclick="sendAppointmentReminder('${appt.id}')" title="שלח תזכורת" style="color:#60a5fa">
              <i class="fa-solid fa-bell"></i><span class="btn-label"> תזכורת</span>
            </button>
            <button class="appt-action-btn cancel" onclick="cancelAppointment('${appt.id}')" title="בטל תור">
              <i class="fa-solid fa-xmark"></i><span class="btn-label"> בטל</span>
            </button>` : ''}
          ${appt.status === 'completed' ? `
            <button class="appt-action-btn reopen" onclick="reopenAppointment('${appt.id}')" title="החזר למאושר">
              <i class="fa-solid fa-rotate-left"></i><span class="btn-label"> שחזר</span>
            </button>` : ''}
          ${appt.status === 'cancelled' ? `
            <button class="appt-action-btn reopen" onclick="reopenAppointment('${appt.id}')" title="החזר למאושר">
              <i class="fa-solid fa-rotate-left"></i><span class="btn-label"> שחזר</span>
            </button>` : ''}
          <a href="tel:${phoneClean}" class="appt-action-btn call" title="חייג">
            <i class="fa-solid fa-phone"></i>
          </a>
          <a href="https://wa.me/${phoneClean.replace(/^0/, '972')}" target="_blank" class="appt-action-btn whatsapp" title="WhatsApp">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
        </div>
      `;
      container.appendChild(card);
    });

    // Cancelled appointments toggle
    if (cancelledAppts.length > 0) {
      const toggleDiv = document.createElement('div');
      toggleDiv.className = 'cancelled-section';
      toggleDiv.innerHTML = `
        <button type="button" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('span').textContent = this.nextElementSibling.classList.contains('hidden') ? '▼' : '▲'" 
          class="w-full text-center py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <i class="fa-solid fa-trash-can text-xs"></i> ${cancelledAppts.length} תורים שבוטלו <span>▼</span>
        </button>
        <div class="hidden">
          ${cancelledAppts.map(appt => {
            const t = appt.appointment_time.slice(0,5);
            const svc = appt.services?.name || '';
            return `<div class="flex items-center justify-between py-2 px-3 text-sm text-gray-600 border-b border-white/5">
              <span>${t} — ${escapeHtml(appt.customer_name || '')} · ${escapeHtml(svc)}</span>
              <button onclick="reopenAppointment('${appt.id}')" class="text-xs text-gold hover:underline">שחזר</button>
            </div>`;
          }).join('')}
        </div>
      `;
      container.appendChild(toggleDiv);
    }

  } catch (err) {
    console.error('loadAppointments error:', err);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-exclamation text-red-400"></i>
        <p>שגיאה בטעינה<br><small>${err.message || ''}</small></p>
      </div>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ── Appointment actions (via API proxy) ─────
async function markComplete(id) {
  try {
    await supaRest('PATCH', `appointments?id=eq.${id}`, { status: 'completed' });
    showToast('✅ התור סומן כהושלם');
    // Auto-record loyalty visit
    const appt = dashAppointmentsCache.find(a => a.id === id);
    if (appt && appt.phone && currentBarberId) {
      try {
        const resp = await fetch(`/api/loyalty/${currentBarberId}/visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
          body: JSON.stringify({ phone: appt.phone, name: appt.customer_name || '' })
        });
        const result = await resp.json();
        if (result.rewardEarned) {
          showToast(`🎉 ${appt.customer_name || 'הלקוח'} זכה בפרס נאמנות!`);
        }
      } catch (e) { console.warn('Loyalty visit error:', e); }
    }
    await loadAppointments();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function cancelAppointment(id) {
  if (!confirm('לבטל את התור?')) return;
  try {
    const appt = dashAppointmentsCache.find(a => a.id === id);
    await supaRest('PATCH', `appointments?id=eq.${id}`, { status: 'cancelled' });
    showToast('התור בוטל', 'info');
    // Send push notification
    if (appt && appt.phone) {
      sendPushNotification(
        appt.phone,
        '❌ התור בוטל',
        `התור שלך בתאריך ${appt.appointment_date} בשעה ${appt.appointment_time.slice(0,5)} בוטל. לקביעת תור חדש היכנס לאתר.`,
        id
      );
      // Send cancellation email
      sendApptEmail(appt, 'cancellation');
    }
    await loadAppointments();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function approveAppointment(id) {
  try {
    await supaRest('PATCH', `appointments?id=eq.${id}`, { status: 'confirmed' });
    showToast('✅ התור אושר!');
    // Send push notification
    const appt = dashAppointmentsCache.find(a => a.id === id);
    if (appt && appt.phone) {
      sendPushNotification(
        appt.phone,
        '✅ התור שלך אושר!',
        `התור שלך בתאריך ${appt.appointment_date} בשעה ${appt.appointment_time.slice(0,5)} אושר. נתראה!`,
        id
      );
      // Send approval email
      sendApptEmail(appt, 'approval');
    }
    await loadAppointments();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function reopenAppointment(id) {
  try {
    await supaRest('PATCH', `appointments?id=eq.${id}`, { status: 'confirmed' });
    showToast('✅ התור הוחזר למאושר');
    await loadAppointments();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

// Legacy alias
async function deleteAppointment(id) {
  return cancelAppointment(id);
}

// ── Push Notification Helpers (Dashboard) ───
async function sendApptEmail(appt, type) {
  try {
    const dateFormatted = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    // Get customer email from Supabase
    const { data: custData } = await db.from('customers').select('email').eq('phone', appt.phone).maybeSingle();
    if (!custData || !custData.email) return;
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: custData.email,
        type: type,
        customerName: appt.customer_name || '',
        barberName: currentBarberLoggedIn || '',
        serviceName: appt.services?.name || '',
        date: dateFormatted,
        time: appt.appointment_time.slice(0,5)
      })
    });
  } catch(e) { console.warn('sendApptEmail error:', e); }
}

async function sendPushNotification(phone, title, body, appointmentId) {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ phone, title, body, appointmentId, tag: 'appt-' + (appointmentId || 'general') })
    });
    const data = await res.json();
    if (data.sent > 0) {
      showToast(`🔔 הודעה נשלחה (${data.sent} מכשירים)`);
    } else {
      showToast('ללקוח אין מנוי פוש פעיל', 'info');
    }
    return data;
  } catch (e) {
    console.warn('Push send error:', e);
    return null;
  }
}

async function sendAppointmentReminder(id) {
  const appt = dashAppointmentsCache.find(a => a.id === id);
  if (!appt) return;
  await sendPushNotification(
    appt.phone,
    '✂️ תזכורת תור',
    `היי, ${appt.customer_name || 'לקוח'}! תזכורת שיש לך תור היום בשעה ${appt.appointment_time.slice(0,5)} אצל המספרה של דני`,
    appt.id
  );
}

// ── Reschedule modal ────────────────────────
let rescheduleApptId = null;
let rescheduleCalMonth = new Date().getMonth();
let rescheduleCalYear = new Date().getFullYear();

function openReschedule(id) {
  const appt = dashAppointmentsCache.find(a => a.id === id);
  if (!appt) return;
  
  rescheduleApptId = id;
  
  const modal = document.getElementById('reschedule-modal');
  modal.classList.remove('hidden');
  
  document.getElementById('reschedule-customer-name').textContent = appt.customer_name || 'לקוח';
  document.getElementById('reschedule-current-info').textContent = 
    `${appt.appointment_date} בשעה ${appt.appointment_time.slice(0,5)}`;
  
  // Set initial calendar month to appointment's month
  const apptDate = new Date(appt.appointment_date + 'T00:00:00');
  rescheduleCalMonth = apptDate.getMonth();
  rescheduleCalYear = apptDate.getFullYear();
  
  document.getElementById('reschedule-date').value = appt.appointment_date;
  document.getElementById('reschedule-time').value = '';
  
  renderRescheduleCalendar();
  generateRescheduleTimeSlots(appt.appointment_date);
}

function closeReschedule() {
  document.getElementById('reschedule-modal').classList.add('hidden');
  rescheduleApptId = null;
}

function renderRescheduleCalendar() {
  const container = document.getElementById('reschedule-calendar');
  if (!container) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60);

  const lastDay = new Date(rescheduleCalYear, rescheduleCalMonth + 1, 0);
  const startDow = new Date(rescheduleCalYear, rescheduleCalMonth, 1).getDay();

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const dayNames = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];

  const selectedDate = document.getElementById('reschedule-date').value;
  const hours = getWorkingHours();

  let html = '<div class="calendar-header">';
  html += `<button type="button" onclick="rescheduleCalPrev()">‹</button>`;
  html += `<span class="month-label">${monthNames[rescheduleCalMonth]} ${rescheduleCalYear}</span>`;
  html += `<button type="button" onclick="rescheduleCalNext()">›</button>`;
  html += '</div>';

  html += '<div class="calendar-days-header">';
  dayNames.forEach(d => html += `<span>${d}</span>`);
  html += '</div>';

  html += '<div class="calendar-grid">';
  for (let i = 0; i < startDow; i++) html += '<div class="calendar-day empty"></div>';

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(rescheduleCalYear, rescheduleCalMonth, d);
    date.setHours(0,0,0,0);
    const dateStr = `${rescheduleCalYear}-${String(rescheduleCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = date.getDay();
    const isPast = date < today;
    const isFuture = date > maxDate;
    const isClosed = !isDayOpen(dateStr);
    const isToday = date.getTime() === today.getTime();
    const isSelected = dateStr === selectedDate;
    const disabled = isPast || isFuture || isClosed;

    let cls = 'calendar-day';
    if (isSelected) cls += ' selected';
    else if (isToday) cls += ' today';
    if (isClosed) cls += ' shabbat';
    if (disabled) cls += ' disabled';

    if (disabled) {
      html += `<div class="${cls}">${d}</div>`;
    } else {
      html += `<div class="${cls}" onclick="selectRescheduleDay('${dateStr}', this)">${d}</div>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function rescheduleCalPrev() {
  rescheduleCalMonth--;
  if (rescheduleCalMonth < 0) { rescheduleCalMonth = 11; rescheduleCalYear--; }
  renderRescheduleCalendar();
}

function rescheduleCalNext() {
  rescheduleCalMonth++;
  if (rescheduleCalMonth > 11) { rescheduleCalMonth = 0; rescheduleCalYear++; }
  renderRescheduleCalendar();
}

function selectRescheduleDay(dateStr, el) {
  document.querySelectorAll('#reschedule-calendar .calendar-day').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('reschedule-date').value = dateStr;
  document.getElementById('reschedule-time').value = '';
  generateRescheduleTimeSlots(dateStr);
}

async function generateRescheduleTimeSlots(dateStr) {
  const container = document.getElementById('reschedule-times');
  container.innerHTML = '<div class="col-span-full flex justify-center py-3"><div class="spinner"></div></div>';

  const dayCfg = getEffectiveHours(dateStr);

  if (!dayCfg || !dayCfg.open) {
    container.innerHTML = '<div class="col-span-full text-center text-red-400 text-sm py-3">סגור ביום זה</div>';
    return;
  }

  const [sh, sm] = dayCfg.start.split(':').map(Number);
  const [eh, em] = dayCfg.end.split(':').map(Number);
  const startMin = sh*60 + sm;
  const endMin = eh*60 + em;

  // Booked slots (exclude current appointment being rescheduled)
  let bookedTimes = [];
  try {
    const { data: appts } = await db
      .from('appointments')
      .select('id, appointment_time')
      .eq('barber_id', currentBarberId)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');
    bookedTimes = (appts || [])
      .filter(a => a.id !== rescheduleApptId)
      .map(a => a.appointment_time.slice(0,5));
  } catch (e) { console.warn(e); }

  const interval = getSlotInterval();
  const breaks = dayCfg.breaks || [];
  container.innerHTML = '';
  for (let m = startMin; m < endMin; m += interval) {
    const h = Math.floor(m/60), mm = m%60;
    const t = `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    const onBreak = isInBreak(t, breaks);
    const isBooked = bookedTimes.includes(t);
    const btn = document.createElement('button');
    btn.type = 'button';
    if (onBreak) {
      btn.className = 'time-slot break';
      btn.textContent = `${t} ☕`;
    } else if (isBooked) {
      btn.className = 'time-slot disabled';
      btn.textContent = `${t} ✖`;
    } else {
      btn.className = 'time-slot';
      btn.textContent = t;
      btn.onclick = () => {
        document.querySelectorAll('#reschedule-times .time-slot').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('reschedule-time').value = t;
      };
    }
    container.appendChild(btn);
  }
}

async function submitReschedule() {
  const date = document.getElementById('reschedule-date').value;
  const time = document.getElementById('reschedule-time').value;

  if (!date) { showToast('בחר תאריך', 'error'); return; }
  if (!time) { showToast('בחר שעה', 'error'); return; }

  try {
    // Check slot is free (excluding current appointment)
    const { data: existing } = await db.from('appointments')
      .select('id')
      .eq('barber_id', currentBarberId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .neq('status', 'cancelled')
      .neq('id', rescheduleApptId)
      .limit(1);
    if (existing && existing.length > 0) {
      showToast('השעה הזו כבר תפוסה!', 'error');
      return;
    }

    await supaRest('PATCH', `appointments?id=eq.${rescheduleApptId}`, {
      appointment_date: date,
      appointment_time: time
    });
    showToast('✅ התור עודכן בהצלחה!');
    closeReschedule();
    // Switch view to the new date
    document.getElementById('appt-date-picker').value = date;
    await loadAppointments();
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate')) {
      showToast('השעה הזו כבר תפוסה!', 'error');
    } else {
      showToast('שגיאה: ' + e.message, 'error');
    }
  }
}

// ── New appointment tab ─────────────────────
async function initNewAppointmentTab() {
  const sel = document.getElementById('new-appt-service');
  sel.innerHTML = '<option value="">טוען...</option>';
  try {
    const { data, error } = await db.from('services').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    dashServicesCache = data || [];
    sel.innerHTML = '<option value="">בחר שירות...</option>' +
      data.map(s => `<option value="${s.id}" data-price="${s.price}">${escapeHtml(s.name)} - ₪${s.price}</option>`).join('');
  } catch (e) {
    sel.innerHTML = '<option value="">שגיאה בטעינה</option>';
  }

  document.getElementById('new-appt-date').value = '';
  document.getElementById('new-appt-time').value = '';
  document.getElementById('new-appt-name').value = '';
  document.getElementById('new-appt-phone').value = '';
  document.getElementById('new-appt-times').innerHTML =
    '<div class="col-span-full text-center text-gray-500 text-sm py-3">בחר תאריך תחילה</div>';

  dashCalendarMonth = new Date().getMonth();
  dashCalendarYear = new Date().getFullYear();
  renderDashCalendar();
}

function renderDashCalendar() {
  const container = document.getElementById('new-appt-calendar');
  if (!container) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60);

  const lastDay = new Date(dashCalendarYear, dashCalendarMonth + 1, 0);
  const startDow = new Date(dashCalendarYear, dashCalendarMonth, 1).getDay();

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const dayNames = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];

  const selectedDate = document.getElementById('new-appt-date').value;
  const hours = getWorkingHours();

  let html = '<div class="calendar-header">';
  html += `<button type="button" onclick="dashCalPrev()">‹</button>`;
  html += `<span class="month-label">${monthNames[dashCalendarMonth]} ${dashCalendarYear}</span>`;
  html += `<button type="button" onclick="dashCalNext()">›</button>`;
  html += '</div>';

  html += '<div class="calendar-days-header">';
  dayNames.forEach(d => html += `<span>${d}</span>`);
  html += '</div>';

  html += '<div class="calendar-grid">';
  for (let i = 0; i < startDow; i++) html += '<div class="calendar-day empty"></div>';

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(dashCalendarYear, dashCalendarMonth, d);
    date.setHours(0,0,0,0);
    const dateStr = `${dashCalendarYear}-${String(dashCalendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = date.getDay();
    const isPast = date < today;
    const isFuture = date > maxDate;
    const isClosed = !isDayOpen(dateStr);
    const isToday = date.getTime() === today.getTime();
    const isSelected = dateStr === selectedDate;
    const disabled = isPast || isFuture || isClosed;

    let cls = 'calendar-day';
    if (isSelected) cls += ' selected';
    else if (isToday) cls += ' today';
    if (isClosed) cls += ' shabbat';
    if (disabled) cls += ' disabled';

    if (disabled) {
      html += `<div class="${cls}">${d}</div>`;
    } else {
      html += `<div class="${cls}" onclick="selectDashDay('${dateStr}', this)">${d}</div>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function dashCalPrev() {
  dashCalendarMonth--;
  if (dashCalendarMonth < 0) { dashCalendarMonth = 11; dashCalendarYear--; }
  renderDashCalendar();
}
function dashCalNext() {
  dashCalendarMonth++;
  if (dashCalendarMonth > 11) { dashCalendarMonth = 0; dashCalendarYear++; }
  renderDashCalendar();
}

function selectDashDay(dateStr, el) {
  document.querySelectorAll('#new-appt-calendar .calendar-day').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('new-appt-date').value = dateStr;
  document.getElementById('new-appt-time').value = '';
  generateDashTimeSlots(dateStr);
}

async function generateDashTimeSlots(dateStr) {
  const container = document.getElementById('new-appt-times');
  container.innerHTML = '<div class="col-span-full flex justify-center py-3"><div class="spinner"></div></div>';

  const dayCfg = getEffectiveHours(dateStr);

  if (!dayCfg || !dayCfg.open) {
    container.innerHTML = '<div class="col-span-full text-center text-red-400 text-sm py-3">סגור ביום זה</div>';
    return;
  }

  const [sh, sm] = dayCfg.start.split(':').map(Number);
  const [eh, em] = dayCfg.end.split(':').map(Number);
  const startMin = sh*60 + sm;
  const endMin = eh*60 + em;

  let bookedTimes = [];
  try {
    const { data: appts } = await db
      .from('appointments')
      .select('appointment_time')
      .eq('barber_id', currentBarberId)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');
    bookedTimes = (appts || []).map(a => a.appointment_time.slice(0,5));
  } catch (e) { console.warn(e); }

  const interval = getSlotInterval();
  const breaks = dayCfg.breaks || [];
  container.innerHTML = '';
  for (let m = startMin; m < endMin; m += interval) {
    const h = Math.floor(m/60), mm = m%60;
    const t = `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    const onBreak = isInBreak(t, breaks);
    const isBooked = bookedTimes.includes(t);
    const btn = document.createElement('button');
    btn.type = 'button';
    if (onBreak) {
      btn.className = 'time-slot break';
      btn.textContent = `${t} ☕`;
    } else if (isBooked) {
      btn.className = 'time-slot disabled';
      btn.textContent = `${t} ✖`;
    } else {
      btn.className = 'time-slot';
      btn.textContent = t;
      btn.onclick = () => {
        document.querySelectorAll('#new-appt-times .time-slot').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('new-appt-time').value = t;
      };
    }
    container.appendChild(btn);
  }
}

async function submitManualAppointment() {
  const serviceSel = document.getElementById('new-appt-service');
  const serviceId = serviceSel.value;
  const date = document.getElementById('new-appt-date').value;
  const time = document.getElementById('new-appt-time').value;
  const name = document.getElementById('new-appt-name').value.trim();
  const phone = document.getElementById('new-appt-phone').value.trim();

  if (!serviceId || serviceId === '' || serviceId === 'undefined') { showToast('בחר שירות', 'error'); return; }
  if (!date) { showToast('בחר תאריך', 'error'); return; }
  if (!time) { showToast('בחר שעה', 'error'); return; }
  if (!name || name.length < 2) { showToast('הכנס שם לקוח', 'error'); return; }
  if (!phone || phone.replace(/\D/g,'').length < 9) { showToast('הכנס מספר טלפון תקין', 'error'); return; }

  try {
    let customerId;
    const { data: existing } = await db.from('customers').select('id').eq('phone', phone).maybeSingle();
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCust, error } = await db.from('customers').insert({ phone, name }).select('id').single();
      if (error) throw new Error('יצירת לקוח: ' + error.message);
      customerId = newCust.id;
    }

    // Check if slot is already taken
    const { data: slotCheck } = await db.from('appointments')
      .select('id')
      .eq('barber_id', currentBarberId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .neq('status', 'cancelled')
      .limit(1);
    if (slotCheck && slotCheck.length > 0) {
      throw new Error('השעה הזו כבר תפוסה!');
    }

    const { error: apptErr } = await db.from('appointments').insert({
      customer_id: customerId,
      barber_id: currentBarberId,
      service_id: serviceId,
      appointment_date: date,
      appointment_time: time,
      phone,
      customer_name: name,
      status: 'confirmed'
    });
    if (apptErr) {
      if (apptErr.message.includes('unique') || apptErr.message.includes('duplicate'))
        throw new Error('השעה הזו כבר תפוסה!');
      throw apptErr;
    }

    showToast('✅ התור נוצר בהצלחה!');
    document.getElementById('appt-date-picker').value = date;
    switchTab('appointments');
  } catch (e) {
    showToast('שגיאה: ' + (e.message || e), 'error');
  }
}

// ── Working Hours (server-backed) ───────────
let _hoursCache = null;
let _overridesCache = null;

async function fetchWorkingHours() {
  if (!currentBarberId) return DEFAULT_HOURS;
  try {
    const res = await fetch(`/api/hours/${currentBarberId}`);
    const data = await res.json();
    if (data && Object.keys(data).length > 0) {
      // Extract slot interval if stored
      if (data._slotInterval) {
        _slotInterval = data._slotInterval;
      }
      _hoursCache = data;
      return data;
    }
  } catch (e) { console.warn('fetchWorkingHours error', e); }
  return { ...DEFAULT_HOURS };
}

async function fetchOverrides() {
  if (!currentBarberId) return {};
  try {
    const res = await fetch(`/api/overrides/${currentBarberId}`);
    _overridesCache = await res.json();
    return _overridesCache;
  } catch (e) { console.warn('fetchOverrides error', e); }
  return {};
}

function getWorkingHours() {
  return _hoursCache || { ...DEFAULT_HOURS };
}

function getOverrides() {
  return _overridesCache || {};
}

// Check if a specific date is open (considering overrides)
function isDayOpen(dateStr) {
  const overrides = getOverrides();
  if (overrides[dateStr]) {
    return overrides[dateStr].open;
  }
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const hours = getWorkingHours();
  return hours[dow]?.open ?? true;
}

// Get effective hours for a date (override > weekly default)
function getEffectiveHours(dateStr) {
  const overrides = getOverrides();
  if (overrides[dateStr] && overrides[dateStr].open) {
    return { open: true, start: overrides[dateStr].start, end: overrides[dateStr].end, breaks: overrides[dateStr].breaks || [] };
  }
  if (overrides[dateStr] && !overrides[dateStr].open) {
    return { open: false, start: '09:00', end: '20:00', breaks: [] };
  }
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const hours = getWorkingHours();
  const cfg = hours[dow] || DEFAULT_HOURS[dow];
  return { ...cfg, breaks: cfg.breaks || [] };
}

function getSlotInterval() {
  return _slotInterval || DEFAULT_SLOT_INTERVAL;
}

// Check if a time falls within a break
function isInBreak(timeStr, breaks) {
  if (!breaks || breaks.length === 0) return false;
  for (const b of breaks) {
    if (timeStr >= b.start && timeStr < b.end) return true;
  }
  return false;
}

async function saveHoursToServer(hours) {
  _hoursCache = hours;
  try {
    await fetch(`/api/hours/${currentBarberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify(hours)
    });
  } catch (e) {
    showToast('שגיאה בשמירת שעות: ' + e.message, 'error');
  }
}

async function saveOverridesToServer(overrides) {
  _overridesCache = overrides;
  try {
    await fetch(`/api/overrides/${currentBarberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify(overrides)
    });
  } catch (e) {
    showToast('שגיאה בשמירה: ' + e.message, 'error');
  }
}

async function renderWorkingHours() {
  const container = document.getElementById('hours-list');
  container.innerHTML = '<div class="flex justify-center py-6"><div class="spinner"></div></div>';
  
  const hours = await fetchWorkingHours();
  await fetchOverrides();
  
  container.innerHTML = '';

  // ── Interval selector (compact row) ──
  const intervalRow = document.createElement('div');
  intervalRow.className = 'hrs-interval-row';
  intervalRow.innerHTML = `
    <i class="fa-solid fa-stopwatch"></i>
    <span>מרווח בין תורים</span>
    <div class="hrs-interval-pills" id="interval-pills"></div>
  `;
  container.appendChild(intervalRow);
  const pillsBox = intervalRow.querySelector('#interval-pills');
  [15,20,30,45,60].forEach(v => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `hrs-pill${_slotInterval === v ? ' active' : ''}`;
    pill.textContent = `${v}'`;
    pill.onclick = () => {
      _slotInterval = v;
      pillsBox.querySelectorAll('.hrs-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    };
    pillsBox.appendChild(pill);
  });

  // ── Weekly days (compact list) ──
  const daysWrap = document.createElement('div');
  daysWrap.className = 'hrs-days';
  
  for (let dow = 0; dow < 7; dow++) {
    const cfg = hours[dow] || DEFAULT_HOURS[dow];
    const breaks = cfg.breaks || [];
    const row = document.createElement('div');
    row.className = `hrs-day${cfg.open ? '' : ' off'}`;
    row.dataset.dow = dow;

    // Break pills summary
    let breakSummary = '';
    if (cfg.open && breaks.length > 0) {
      breakSummary = breaks.map((b, i) => 
        `<span class="hrs-break-tag">☕ ${b.start}-${b.end}<button onclick="event.stopPropagation();removeBreak(${dow},${i})" class="hrs-break-x">&times;</button></span>`
      ).join('');
    }

    row.innerHTML = `
      <div class="hrs-day-main">
        <div class="hrs-day-toggle" onclick="toggleHoursDay(${dow})">
          <div class="hrs-toggle ${cfg.open ? 'on' : ''}"></div>
          <span class="hrs-day-name">${HEB_DAYS[dow]}</span>
        </div>
        <div class="hrs-day-times" style="${cfg.open ? '' : 'opacity:0.25;pointer-events:none'}">
          <input type="time" value="${cfg.start}" data-field="start" class="hrs-time">
          <span class="hrs-sep">–</span>
          <input type="time" value="${cfg.end}" data-field="end" class="hrs-time">
        </div>
      </div>
      ${cfg.open ? `
        <div class="hrs-day-breaks">
          ${breakSummary}
          <button onclick="addBreak(${dow})" class="hrs-add-break"><i class="fa-solid fa-plus"></i> הפסקה</button>
        </div>
      ` : ''}
    `;
    daysWrap.appendChild(row);
  }
  container.appendChild(daysWrap);

  // ── Break edit rows (hidden inputs for editing) ──
  // Breaks are edited inline with tags; when adding we use defaults
  
  // ── Save button ──
  const saveBtn = document.createElement('button');
  saveBtn.className = 'hrs-save-btn';
  saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> שמור שינויים';
  saveBtn.onclick = saveWorkingHours;
  container.appendChild(saveBtn);

  // ── Overrides section ──
  const overridesSection = document.createElement('div');
  overridesSection.className = 'hrs-overrides-section';
  overridesSection.innerHTML = `
    <div class="hrs-overrides-header">
      <span><i class="fa-solid fa-calendar-day"></i> ימים מיוחדים</span>
      <button onclick="openAddOverride()" class="hrs-add-override"><i class="fa-solid fa-plus"></i></button>
    </div>
    <div id="overrides-list"></div>
  `;
  container.appendChild(overridesSection);
  
  renderOverridesList();
}

let _breakEditDow = null;

function addBreak(dow) {
  _breakEditDow = dow;
  document.getElementById('break-modal-start').value = '13:00';
  document.getElementById('break-modal-end').value = '14:00';
  document.getElementById('break-modal').classList.remove('hidden');
}

function closeBreakModal() {
  document.getElementById('break-modal').classList.add('hidden');
}

function saveBreakModal() {
  const start = document.getElementById('break-modal-start').value;
  const end = document.getElementById('break-modal-end').value;
  if (!start || !end) { showToast('הכנס שעות', 'error'); return; }
  if (start >= end) { showToast('שעת סיום חייבת להיות אחרי שעת התחלה', 'error'); return; }
  
  _collectCurrentHoursFromDOM();
  const hours = getWorkingHours();
  if (!hours[_breakEditDow]) hours[_breakEditDow] = { ...DEFAULT_HOURS[_breakEditDow] };
  if (!hours[_breakEditDow].breaks) hours[_breakEditDow].breaks = [];
  hours[_breakEditDow].breaks.push({ start, end });
  // Sort breaks by start time
  hours[_breakEditDow].breaks.sort((a, b) => a.start.localeCompare(b.start));
  _hoursCache = hours;
  closeBreakModal();
  renderWorkingHours();
}

function removeBreak(dow, idx) {
  _collectCurrentHoursFromDOM();
  const hours = getWorkingHours();
  if (hours[dow]?.breaks) {
    hours[dow].breaks.splice(idx, 1);
    _hoursCache = hours;
    renderWorkingHours();
  }
}

function renderOverridesList() {
  const container = document.getElementById('overrides-list');
  if (!container) return;
  
  const overrides = getOverrides();
  const dates = Object.keys(overrides).sort();
  const today = todayISO();
  // Filter only future/today overrides
  const futureDates = dates.filter(d => d >= today);
  
  if (futureDates.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 text-sm py-4">אין ימים מיוחדים מוגדרים</div>';
    return;
  }
  
  container.innerHTML = '';
  futureDates.forEach(dateStr => {
    const cfg = overrides[dateStr];
    const d = new Date(dateStr + 'T00:00:00');
    const formatted = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 mb-2 rounded-xl border border-white/5 bg-dark-300';
    row.innerHTML = `
      <div>
        <div class="text-white font-medium text-sm">${formatted}</div>
        <div class="text-xs mt-0.5 ${cfg.open ? 'text-green-400' : 'text-red-400'}">
          ${cfg.open ? `פתוח ${cfg.start} — ${cfg.end}` : '🚫 סגור (חופש)'}
          ${cfg.note ? `<span class="text-gray-500 mr-2">· ${escapeHtml(cfg.note)}</span>` : ''}
        </div>
      </div>
      <button onclick="removeOverride('${dateStr}')" class="text-gray-500 hover:text-red-400 p-2 transition-colors">
        <i class="fa-solid fa-trash text-xs"></i>
      </button>
    `;
    container.appendChild(row);
  });
}

function toggleHoursDay(dow) {
  _collectCurrentHoursFromDOM();
  const hours = getWorkingHours();
  hours[dow] = hours[dow] || { ...DEFAULT_HOURS[dow] };
  hours[dow].open = !hours[dow].open;
  _hoursCache = hours;
  renderWorkingHours();
}

// Collect all current values from the DOM before re-render
function _collectCurrentHoursFromDOM() {
  const hours = getWorkingHours();
  document.querySelectorAll('#hours-list .hrs-day').forEach(row => {
    const dow = parseInt(row.dataset.dow);
    if (isNaN(dow)) return;
    const s = row.querySelector('input[data-field="start"]');
    const e = row.querySelector('input[data-field="end"]');
    if (s && e) {
      hours[dow] = hours[dow] || { ...DEFAULT_HOURS[dow] };
      hours[dow].start = s.value;
      hours[dow].end = e.value;
    }
    // Breaks are stored in memory (tags, not inputs) — no need to collect
  });
  hours._slotInterval = _slotInterval;
  _hoursCache = hours;
}

async function saveWorkingHours() {
  _collectCurrentHoursFromDOM();
  const hours = getWorkingHours();
  hours._slotInterval = _slotInterval;
  await saveHoursToServer(hours);
  showToast('✅ נשמר!');
}

// ── Override modal ──────────────────────────
function openAddOverride() {
  document.getElementById('override-modal').classList.remove('hidden');
  document.getElementById('override-date').value = '';
  document.getElementById('override-type').value = 'closed';
  document.getElementById('override-note').value = '';
  document.getElementById('override-time-row').classList.add('hidden');
  document.getElementById('override-start').value = '09:00';
  document.getElementById('override-end').value = '20:00';
}

function closeOverrideModal() {
  document.getElementById('override-modal').classList.add('hidden');
}

function onOverrideTypeChange() {
  const type = document.getElementById('override-type').value;
  const row = document.getElementById('override-time-row');
  if (type === 'custom') {
    row.classList.remove('hidden');
  } else {
    row.classList.add('hidden');
  }
}

async function saveOverride() {
  const date = document.getElementById('override-date').value;
  const type = document.getElementById('override-type').value;
  const note = document.getElementById('override-note').value.trim();
  
  if (!date) { showToast('בחר תאריך', 'error'); return; }
  if (date < todayISO()) { showToast('לא ניתן להגדיר יום בעבר', 'error'); return; }
  
  const overrides = getOverrides();
  
  if (type === 'closed') {
    overrides[date] = { open: false, note: note || 'חופש' };
  } else {
    const start = document.getElementById('override-start').value;
    const end = document.getElementById('override-end').value;
    if (!start || !end) { showToast('הכנס שעות', 'error'); return; }
    overrides[date] = { open: true, start, end, note };
  }
  
  await saveOverridesToServer(overrides);
  closeOverrideModal();
  showToast('✅ יום מיוחד נשמר');
  renderOverridesList();
}

async function removeOverride(dateStr) {
  const overrides = getOverrides();
  delete overrides[dateStr];
  await saveOverridesToServer(overrides);
  showToast('הוסר', 'info');
  renderOverridesList();
}

// ── Prices ──────────────────────────────────
async function loadPrices() {
  const container = document.getElementById('prices-list');
  container.innerHTML = '<div class="flex justify-center py-8"><div class="spinner"></div></div>';
  try {
    const { data, error } = await db.from('services').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    dashServicesCache = data || [];

    if (dashServicesCache.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-tag"></i><p>אין שירותים. הוסף שירות חדש.</p></div>';
      return;
    }

    container.innerHTML = '';
    dashServicesCache.forEach(s => {
      const row = document.createElement('div');
      row.className = 'price-row';
      row.innerHTML = `
        <div>
          <div class="name">${escapeHtml(s.name)}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="price">₪${s.price}</div>
          <div class="actions">
            <button onclick="openEditService('${s.id}')" title="ערוך">
              <i class="fa-solid fa-pen text-sm"></i>
            </button>
            <button class="del" onclick="deleteService('${s.id}', '${escapeHtml(s.name).replace(/'/g, '&#39;')}')" title="מחק">
              <i class="fa-solid fa-trash text-sm"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-exclamation text-red-400"></i><p>שגיאה: ${e.message}</p></div>`;
  }
}

function openEditService(id) {
  const s = dashServicesCache.find(x => x.id === id);
  if (!s) return;
  document.getElementById('price-modal-title').textContent = 'עריכת שירות';
  document.getElementById('price-modal-id').value = s.id;
  document.getElementById('price-modal-name').value = s.name;
  document.getElementById('price-modal-price').value = s.price;
  document.getElementById('price-modal').classList.remove('hidden');
}

function openAddService() {
  document.getElementById('price-modal-title').textContent = 'שירות חדש';
  document.getElementById('price-modal-id').value = '';
  document.getElementById('price-modal-name').value = '';
  document.getElementById('price-modal-price').value = '';
  document.getElementById('price-modal').classList.remove('hidden');
}

function closePriceModal() {
  document.getElementById('price-modal').classList.add('hidden');
}

async function savePriceModal() {
  const id = document.getElementById('price-modal-id').value;
  const name = document.getElementById('price-modal-name').value.trim();
  const price = parseFloat(document.getElementById('price-modal-price').value);

  if (!name) { showToast('הכנס שם שירות', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('הכנס מחיר תקין', 'error'); return; }

  try {
    if (id) {
      await supaRest('PATCH', `services?id=eq.${id}`, { name, price });
    } else {
      await supaRest('POST', 'services', { name, price });
    }
    closePriceModal();
    showToast('✅ נשמר בהצלחה');
    await loadPrices();
  } catch (e) {
    showToast('שגיאה בשמירה: ' + e.message, 'error');
  }
}

async function deleteService(id, name) {
  if (!confirm(`למחוק את "${name}"?`)) return;
  try {
    await supaRest('DELETE', `services?id=eq.${id}`);
    showToast('השירות נמחק', 'info');
    await loadPrices();
  } catch (e) {
    showToast('שגיאה במחיקה: ' + e.message, 'error');
  }
}

// ── Profile ─────────────────────────────────
async function loadProfile() {
  document.getElementById('profile-name').value = currentBarberLoggedIn || '';
  document.getElementById('profile-base-price').value = currentBarberRow?.base_price ?? '';
  document.getElementById('profile-new-password').value = '';

  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,'0')}-01`;

    const { data: monthAppts } = await db.from('appointments')
      .select('*, services(price)')
      .eq('barber_id', currentBarberId)
      .gte('appointment_date', monthStart)
      .lt('appointment_date', monthEnd)
      .neq('status', 'cancelled');

    const { count: totalCount } = await db.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', currentBarberId);

    const monthCount = (monthAppts || []).length;
    const monthRevenue = (monthAppts || []).reduce((sum, a) => sum + (a.services?.price || currentBarberRow?.base_price || 0), 0);

    document.getElementById('profile-month-count').textContent = monthCount;
    document.getElementById('profile-month-revenue').textContent = `₪${monthRevenue}`;
    document.getElementById('profile-total-count').textContent = totalCount || 0;
  } catch (e) {
    console.warn('profile stats error', e);
  }
}

async function saveBasePrice() {
  const v = parseFloat(document.getElementById('profile-base-price').value);
  if (isNaN(v) || v < 0) { showToast('הכנס מחיר תקין', 'error'); return; }
  try {
    await supaRest('PATCH', `barbers?id=eq.${currentBarberId}`, { base_price: v });
    if (currentBarberRow) currentBarberRow.base_price = v;
    showToast('✅ המחיר עודכן');
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

function changePassword() {
  const pwd = document.getElementById('profile-new-password').value;
  if (!pwd || pwd.length < 4) { showToast('הסיסמה חייבת להיות לפחות 4 תווים', 'error'); return; }
  localStorage.setItem(`barberPwd_${currentBarberLoggedIn}`, pwd);
  document.getElementById('profile-new-password').value = '';
  showToast('✅ הסיסמה עודכנה');
}

// ── Enable push for dashboard barber ─────────
async function enableDashPush() {
  if (typeof subscribeToPush === 'function') {
    const ok = await subscribeToPush('barber-' + currentBarberLoggedIn, currentBarberLoggedIn);
    if (ok) {
      showToast('🔔 התראות הופעלו!');
    } else {
      showToast('לא ניתן להפעיל התראות', 'error');
    }
  }
}

// ── Reports / Analytics ─────────────────
async function loadReports() {
  const container = document.getElementById('tab-reports');
  container.innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>';

  try {
    // Fetch all appointments for this barber
    const { data: allAppts, error } = await db
      .from('appointments')
      .select('*, services(name, price)')
      .eq('barber_id', currentBarberId)
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    const appts = allAppts || [];

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;

    // Filter helpers
    const monthOf = (d) => d.slice(0, 7);
    const thisMonthAppts = appts.filter(a => monthOf(a.appointment_date) === thisMonth && a.status !== 'cancelled');
    const lastMonthAppts = appts.filter(a => monthOf(a.appointment_date) === lastMonth && a.status !== 'cancelled');
    const thisMonthAll = appts.filter(a => monthOf(a.appointment_date) === thisMonth);
    const cancelled = thisMonthAll.filter(a => a.status === 'cancelled').length;

    // Revenue
    const revenueThis = thisMonthAppts.reduce((s, a) => s + (a.services?.price || currentBarberRow?.base_price || 0), 0);
    const revenueLast = lastMonthAppts.reduce((s, a) => s + (a.services?.price || currentBarberRow?.base_price || 0), 0);

    // Days passed this month
    const dayOfMonth = now.getDate();
    const avgPerDay = dayOfMonth > 0 ? (thisMonthAppts.length / dayOfMonth).toFixed(1) : 0;
    const cancelRate = thisMonthAll.length > 0 ? ((cancelled / thisMonthAll.length) * 100).toFixed(1) : 0;

    // ── Summary Cards ──
    let html = `
      <h3 class="text-2xl font-bold text-white mb-6">📊 דוחות וסטטיסטיקות</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 text-center">
          <div class="text-2xl font-bold text-gold">₪${revenueThis.toLocaleString()}</div>
          <div class="text-xs text-gray-400 mt-1">הכנסה החודש</div>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 text-center">
          <div class="text-2xl font-bold text-gray-300">₪${revenueLast.toLocaleString()}</div>
          <div class="text-xs text-gray-400 mt-1">הכנסה חודש שעבר</div>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">${thisMonthAppts.length}</div>
          <div class="text-xs text-gray-400 mt-1">תורים החודש</div>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 text-center">
          <div class="text-2xl font-bold text-green-400">${avgPerDay}</div>
          <div class="text-xs text-gray-400 mt-1">ממוצע ליום</div>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 text-center col-span-2 md:col-span-1">
          <div class="text-2xl font-bold ${parseFloat(cancelRate) > 15 ? 'text-red-400' : 'text-gray-300'}">${cancelRate}%</div>
          <div class="text-xs text-gray-400 mt-1">אחוז ביטולים</div>
        </div>
      </div>
    `;

    // ── Charts section ──
    html += `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4">
          <h4 class="text-white font-bold mb-3">הכנסות - 6 חודשים אחרונים</h4>
          <canvas id="chart-revenue" height="220"></canvas>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4">
          <h4 class="text-white font-bold mb-3">שעות עמוסות</h4>
          <canvas id="chart-hours" height="220"></canvas>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4">
          <h4 class="text-white font-bold mb-3">ימים עמוסים</h4>
          <canvas id="chart-days" height="200"></canvas>
        </div>
        <div class="bg-dark-100 rounded-2xl border border-white/5 p-4">
          <h4 class="text-white font-bold mb-3">שירותים מובילים</h4>
          <div id="top-services-list"></div>
        </div>
      </div>
      <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 mb-8">
        <h4 class="text-white font-bold mb-3">לקוחות מובילים</h4>
        <div id="top-customers-list"></div>
      </div>
    `;

    container.innerHTML = html;

    // ── Revenue Chart (last 6 months) ──
    const hebMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const revenueLabels = [];
    const revenueData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      revenueLabels.push(hebMonths[d.getMonth()]);
      const monthAppts = appts.filter(a => monthOf(a.appointment_date) === key && a.status !== 'cancelled');
      revenueData.push(monthAppts.reduce((s, a) => s + (a.services?.price || currentBarberRow?.base_price || 0), 0));
    }

    new Chart(document.getElementById('chart-revenue'), {
      type: 'bar',
      data: {
        labels: revenueLabels,
        datasets: [{
          label: 'הכנסה (₪)',
          data: revenueData,
          backgroundColor: 'rgba(197, 160, 89, 0.7)',
          borderColor: '#C5A059',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9CA3AF' }, grid: { display: false } },
          y: { ticks: { color: '#9CA3AF', callback: v => '₪' + v }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    // ── Busiest Hours Chart ──
    const hourCounts = {};
    const nonCancelled = appts.filter(a => a.status !== 'cancelled' && a.appointment_time);
    nonCancelled.forEach(a => {
      const h = a.appointment_time.slice(0, 2);
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const hourLabels = Object.keys(hourCounts).sort();
    const hourData = hourLabels.map(h => hourCounts[h]);

    new Chart(document.getElementById('chart-hours'), {
      type: 'bar',
      data: {
        labels: hourLabels.map(h => h + ':00'),
        datasets: [{
          label: 'תורים',
          data: hourData,
          backgroundColor: 'rgba(197, 160, 89, 0.5)',
          borderColor: '#C5A059',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
        }
      }
    });

    // ── Busiest Days Chart ──
    const hebDayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    nonCancelled.forEach(a => {
      const dow = new Date(a.appointment_date + 'T00:00:00').getDay();
      dayCounts[dow]++;
    });

    new Chart(document.getElementById('chart-days'), {
      type: 'bar',
      data: {
        labels: hebDayNames,
        datasets: [{
          label: 'תורים',
          data: dayCounts,
          backgroundColor: dayCounts.map((_, i) => i === 6 ? 'rgba(239,68,68,0.3)' : 'rgba(197, 160, 89, 0.6)'),
          borderColor: dayCounts.map((_, i) => i === 6 ? '#EF4444' : '#C5A059'),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9CA3AF' }, grid: { display: false } },
          y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    // ── Top Services ──
    const svcMap = {};
    nonCancelled.forEach(a => {
      const name = a.services?.name || 'אחר';
      if (!svcMap[name]) svcMap[name] = { count: 0, revenue: 0 };
      svcMap[name].count++;
      svcMap[name].revenue += (a.services?.price || 0);
    });
    const topServices = Object.entries(svcMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
    const svcContainer = document.getElementById('top-services-list');
    if (topServices.length === 0) {
      svcContainer.innerHTML = '<div class="text-gray-500 text-sm text-center py-4">אין נתונים</div>';
    } else {
      const maxCount = topServices[0][1].count;
      svcContainer.innerHTML = topServices.map(([name, data]) => `
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-grow">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-white">${escapeHtml(name)}</span>
              <span class="text-gray-400">${data.count} תורים · ₪${data.revenue.toLocaleString()}</span>
            </div>
            <div class="w-full bg-dark-300 rounded-full h-2">
              <div class="bg-gold rounded-full h-2" style="width: ${(data.count / maxCount * 100).toFixed(0)}%"></div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // ── Top Customers ──
    const custMap = {};
    nonCancelled.forEach(a => {
      const key = a.phone || 'unknown';
      if (!custMap[key]) custMap[key] = { name: a.customer_name || 'לקוח', phone: a.phone || '', count: 0 };
      custMap[key].count++;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const custContainer = document.getElementById('top-customers-list');
    if (topCustomers.length === 0) {
      custContainer.innerHTML = '<div class="text-gray-500 text-sm text-center py-4">אין נתונים</div>';
    } else {
      custContainer.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${topCustomers.map((c, i) => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-dark-300 border border-white/5">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-gold/20 text-gold' : 'bg-white/5 text-gray-400'}">${i + 1}</div>
              <div class="flex-grow min-w-0">
                <div class="text-white text-sm font-medium truncate">${escapeHtml(c.name)}</div>
                <div class="text-gray-500 text-xs" dir="ltr">${escapeHtml(c.phone)}</div>
              </div>
              <div class="text-gold font-bold text-sm">${c.count} ביקורים</div>
            </div>
          `).join('')}
        </div>
      `;
    }

  } catch (err) {
    console.error('loadReports error:', err);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-exclamation text-red-400"></i>
        <p>שגיאה בטעינת דוחות<br><small>${err.message || ''}</small></p>
      </div>`;
  }
}

// ── Customers History ────────────────────
let _customersCache = [];

async function loadCustomers() {
  const container = document.getElementById('customers-list');
  container.innerHTML = '<div class="flex justify-center py-8"><div class="spinner"></div></div>';

  try {
    // Get all appointments for this barber with customer + service info
    const { data, error } = await db
      .from('appointments')
      .select('*, services(name, price)')
      .eq('barber_id', currentBarberId)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    // Group by customer (phone)
    const customerMap = {};
    (data || []).forEach(appt => {
      const key = appt.phone || 'unknown';
      if (!customerMap[key]) {
        customerMap[key] = {
          name: appt.customer_name || 'לקוח',
          phone: appt.phone || '',
          visits: [],
          totalSpent: 0,
          lastVisit: null
        };
      }
      customerMap[key].visits.push(appt);
      if (appt.status === 'completed') {
        customerMap[key].totalSpent += (appt.services?.price || 0);
      }
      if (!customerMap[key].lastVisit || appt.appointment_date > customerMap[key].lastVisit) {
        customerMap[key].lastVisit = appt.appointment_date;
      }
    });

    _customersCache = Object.values(customerMap);
    _customersCache.sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''));

    renderCustomersList(_customersCache);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-exclamation text-red-400"></i><p>שגיאה: ${e.message}</p></div>`;
  }
}

function filterCustomers() {
  const query = (document.getElementById('customer-search')?.value || '').trim().toLowerCase();
  if (!query) {
    renderCustomersList(_customersCache);
    return;
  }
  const filtered = _customersCache.filter(c =>
    c.name.toLowerCase().includes(query) || c.phone.includes(query)
  );
  renderCustomersList(filtered);
}

function renderCustomersList(customers) {
  const container = document.getElementById('customers-list');

  if (customers.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-users"></i><p>לא נמצאו לקוחות</p></div>';
    return;
  }

  container.innerHTML = `<div class="text-gray-500 text-xs mb-3">${customers.length} לקוחות</div>`;

  customers.forEach(c => {
    const card = document.createElement('div');
    card.className = 'customer-card';

    const totalVisits = c.visits.length;
    const completedVisits = c.visits.filter(v => v.status === 'completed').length;
    const cancelledVisits = c.visits.filter(v => v.status === 'cancelled').length;
    const lastDate = c.lastVisit ? new Date(c.lastVisit + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const phoneClean = (c.phone || '').replace(/[^\d+]/g, '');

    // Last 5 visits
    const recentVisits = c.visits.slice(0, 5).map(v => {
      const date = new Date(v.appointment_date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
      const time = v.appointment_time?.slice(0, 5) || '';
      const svc = v.services?.name || '';
      const st = v.status === 'completed' ? '✅' : v.status === 'cancelled' ? '❌' : v.status === 'pending' ? '⏳' : '✅';
      return `<div class="customer-visit"><span>${st} ${date} ${time}</span><span class="text-gray-500">${escapeHtml(svc)}</span></div>`;
    }).join('');

    card.innerHTML = `
      <div class="customer-header">
        <div class="customer-avatar">${escapeHtml(c.name.slice(0, 2))}</div>
        <div class="customer-info">
          <div class="customer-name">${escapeHtml(c.name)}</div>
          <div class="customer-meta">
            <a href="tel:${phoneClean}" dir="ltr">${escapeHtml(c.phone)}</a>
            · ${completedVisits} ביקורים
            ${c.totalSpent > 0 ? `· ₪${c.totalSpent}` : ''}
          </div>
        </div>
        <div class="customer-actions">
          <a href="tel:${phoneClean}" class="cust-btn"><i class="fa-solid fa-phone"></i></a>
          <a href="https://wa.me/${phoneClean.replace(/^0/, '972')}" target="_blank" class="cust-btn wa"><i class="fa-brands fa-whatsapp"></i></a>
        </div>
      </div>
      <div class="customer-last">ביקור אחרון: ${lastDate}</div>
      <div class="customer-visits">${recentVisits}</div>
    `;
    container.appendChild(card);
  });
}

// ── Loyalty Program ─────────────────────────
let _loyaltyCache = null;

async function fetchLoyaltyData() {
  if (!currentBarberId) return null;
  try {
    const res = await fetch(`/api/loyalty/${currentBarberId}/customers`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    _loyaltyCache = await res.json();
    return _loyaltyCache;
  } catch (e) {
    console.warn('fetchLoyaltyData error', e);
    return null;
  }
}

async function loadLoyaltyTab() {
  const container = document.getElementById('tab-loyalty');
  if (!container) return;
  container.innerHTML = '<div class="flex justify-center py-12"><div class="spinner"></div></div>';

  const data = await fetchLoyaltyData();
  if (!data) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation text-red-400"></i><p>שגיאה בטעינה</p></div>';
    return;
  }

  // Settings card
  const customers = data.customers || {};
  const customerList = Object.entries(customers).map(([phone, c]) => ({ phone, ...c }));
  const totalCustomers = customerList.length;
  const totalRewardsGiven = customerList.reduce((s, c) => s + (c.totalRewards || 0), 0);
  const topCustomers = [...customerList].sort((a, b) => b.visits - a.visits).slice(0, 10);

  let html = `
    <h3 class="text-2xl font-bold text-white mb-6">⭐ מועדון נאמנות</h3>

    <!-- Settings -->
    <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 md:p-6 mb-6">
      <h4 class="text-white font-bold mb-4"><i class="fa-solid fa-gear text-gold"></i> הגדרות מועדון</h4>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-gray-300">מועדון נאמנות פעיל</span>
          <div class="loyalty-toggle-wrap" onclick="toggleLoyaltyEnabled()">
            <div class="hrs-toggle ${data.enabled ? 'on' : ''}" id="loyalty-enabled-toggle"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">ביקורים לפרס</label>
            <input type="number" id="loyalty-visits-needed" value="${data.visitsForReward || 10}" min="2" max="50"
              class="w-full bg-dark-300 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">תיאור הפרס</label>
            <input type="text" id="loyalty-reward-desc" value="${escapeHtml(data.rewardDescription || 'תספורת חינם')}" placeholder="למשל: תספורת חינם"
              class="w-full bg-dark-300 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold">
          </div>
        </div>
        <button onclick="saveLoyaltySettings()" class="w-full bg-gold hover:bg-gold-hover text-white py-2.5 rounded-xl font-bold transition-colors text-sm">
          <i class="fa-solid fa-floppy-disk ml-1"></i> שמור הגדרות
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="stat-card">
        <div class="stat-value text-gold">${totalCustomers}</div>
        <div class="stat-label">חברי מועדון</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green-400">${totalRewardsGiven}</div>
        <div class="stat-label">פרסים שחולקו</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-blue-400">${data.visitsForReward || 10}</div>
        <div class="stat-label">ביקורים לפרס</div>
      </div>
    </div>

    <!-- Customer lookup -->
    <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 md:p-6 mb-6">
      <h4 class="text-white font-bold mb-4"><i class="fa-solid fa-search text-gold"></i> חיפוש לקוח</h4>
      <div class="flex gap-2 mb-4">
        <input type="tel" id="loyalty-search-phone" placeholder="הכנס מספר טלפון..." dir="ltr"
          class="flex-1 bg-dark-300 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold"
          onkeydown="if(event.key==='Enter') loyaltyLookup()">
        <button onclick="loyaltyLookup()" class="bg-gold hover:bg-gold-hover text-white px-4 rounded-xl font-bold transition-colors">
          <i class="fa-solid fa-search"></i>
        </button>
      </div>
      <div id="loyalty-lookup-result"></div>
    </div>

    <!-- Quick add visit -->
    <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 md:p-6 mb-6">
      <h4 class="text-white font-bold mb-4"><i class="fa-solid fa-plus text-gold"></i> הוספת ביקור ידנית</h4>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="tel" id="loyalty-add-phone" placeholder="טלפון" dir="ltr"
          class="bg-dark-300 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold">
        <input type="text" id="loyalty-add-name" placeholder="שם הלקוח"
          class="bg-dark-300 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold">
        <button onclick="loyaltyAddVisit()" class="bg-gold hover:bg-gold-hover text-white py-3 rounded-xl font-bold transition-colors">
          <i class="fa-solid fa-plus ml-1"></i> הוסף ביקור
        </button>
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="bg-dark-100 rounded-2xl border border-white/5 p-4 md:p-6">
      <h4 class="text-white font-bold mb-4"><i class="fa-solid fa-trophy text-gold"></i> לקוחות מובילים</h4>
      <div id="loyalty-leaderboard">${topCustomers.length === 0 ? '<div class="text-gray-500 text-sm text-center py-4">אין לקוחות עדיין</div>' : ''}</div>
    </div>
  `;

  container.innerHTML = html;

  // Render leaderboard
  if (topCustomers.length > 0) {
    const lb = document.getElementById('loyalty-leaderboard');
    lb.innerHTML = topCustomers.map((c, i) => {
      const visits = c.visits || 0;
      const needed = data.visitsForReward || 10;
      const progress = Math.min((visits / needed) * 100, 100);
      const phoneClean = (c.phone || '').replace(/[^\d+]/g, '');
      return `
        <div class="flex items-center gap-3 p-3 mb-2 rounded-xl bg-dark-300 border border-white/5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-gold/20 text-gold' : 'bg-white/5 text-gray-400'}">${i + 1}</div>
          <div class="flex-grow min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-white text-sm font-medium truncate">${escapeHtml(c.name || phoneClean)}</span>
              <span class="text-xs text-gray-400" dir="ltr">${escapeHtml(c.phone)}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-grow bg-dark-100 rounded-full h-2">
                <div class="bg-gold rounded-full h-2 transition-all" style="width:${progress}%"></div>
              </div>
              <span class="text-xs font-bold ${visits >= needed ? 'text-green-400' : 'text-gold'}">${visits}/${needed}</span>
            </div>
            ${c.totalRewards > 0 ? `<div class="text-xs text-green-400 mt-1">🎁 ${c.totalRewards} פרסים זמינים</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

async function toggleLoyaltyEnabled() {
  const toggle = document.getElementById('loyalty-enabled-toggle');
  const isOn = toggle.classList.contains('on');
  toggle.classList.toggle('on');
  try {
    await fetch(`/api/loyalty/${currentBarberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ enabled: !isOn })
    });
    showToast(!isOn ? '⭐ מועדון נאמנות הופעל' : 'מועדון נאמנות כבוי', !isOn ? 'success' : 'info');
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function saveLoyaltySettings() {
  const visitsForReward = parseInt(document.getElementById('loyalty-visits-needed').value);
  const rewardDescription = document.getElementById('loyalty-reward-desc').value.trim();
  if (!visitsForReward || visitsForReward < 2) { showToast('מינימום 2 ביקורים', 'error'); return; }
  if (!rewardDescription) { showToast('הכנס תיאור פרס', 'error'); return; }
  try {
    await fetch(`/api/loyalty/${currentBarberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ visitsForReward, rewardDescription })
    });
    showToast('✅ ההגדרות נשמרו');
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function loyaltyLookup() {
  const phone = (document.getElementById('loyalty-search-phone').value || '').replace(/[^\d+]/g, '');
  if (!phone || phone.length < 9) { showToast('הכנס מספר טלפון תקין', 'error'); return; }
  const resultEl = document.getElementById('loyalty-lookup-result');
  resultEl.innerHTML = '<div class="flex justify-center py-3"><div class="spinner"></div></div>';

  try {
    const res = await fetch(`/api/loyalty/${currentBarberId}/check/${phone}`);
    const data = await res.json();
    if (!data.enabled) {
      resultEl.innerHTML = '<div class="text-gray-500 text-sm text-center py-3">מועדון הנאמנות לא פעיל</div>';
      return;
    }
    if (!data.customer) {
      resultEl.innerHTML = `
        <div class="text-center py-4">
          <div class="text-gray-400 mb-2">הלקוח לא נמצא במועדון</div>
          <button onclick="document.getElementById('loyalty-add-phone').value='${phone}';document.getElementById('loyalty-add-name').focus()" 
            class="text-gold text-sm hover:underline">הוסף אותו עכשיו →</button>
        </div>`;
      return;
    }
    const c = data.customer;
    const progress = Math.min((c.visits / data.visitsForReward) * 100, 100);
    const remaining = Math.max(data.visitsForReward - c.visits, 0);
    resultEl.innerHTML = `
      <div class="bg-dark-300 rounded-xl p-4 border border-white/5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-white font-bold">${escapeHtml(c.name || phone)}</div>
            <div class="text-gray-500 text-xs" dir="ltr">${escapeHtml(phone)}</div>
          </div>
          ${c.totalRewards > 0 ? `
            <button onclick="loyaltyRedeem('${phone}')" class="bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors">
              🎁 מימוש פרס (${c.totalRewards})
            </button>` : ''}
        </div>
        <div class="mb-2">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-400">התקדמות</span>
            <span class="text-gold font-bold">${c.visits}/${data.visitsForReward}</span>
          </div>
          <div class="w-full bg-dark-100 rounded-full h-3">
            <div class="bg-gold rounded-full h-3 transition-all" style="width:${progress}%"></div>
          </div>
        </div>
        <div class="text-xs text-gray-500">
          ${remaining > 0 ? `עוד ${remaining} ביקורים ל${escapeHtml(data.rewardDescription)}` : '🎉 זכאי לפרס!'}
          ${c.lastVisit ? ` · ביקור אחרון: ${c.lastVisit}` : ''}
        </div>
      </div>`;
  } catch (e) {
    resultEl.innerHTML = `<div class="text-red-400 text-sm text-center py-3">שגיאה: ${e.message}</div>`;
  }
}

async function loyaltyAddVisit() {
  const phone = (document.getElementById('loyalty-add-phone').value || '').replace(/[^\d+]/g, '');
  const name = document.getElementById('loyalty-add-name').value.trim();
  if (!phone || phone.length < 9) { showToast('הכנס מספר טלפון תקין', 'error'); return; }
  try {
    const res = await fetch(`/api/loyalty/${currentBarberId}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ phone, name })
    });
    const result = await res.json();
    if (result.rewardEarned) {
      showToast(`🎉 ${name || 'הלקוח'} זכה בפרס נאמנות!`);
    } else {
      showToast(`✅ ביקור נרשם (${result.customer.visits} ביקורים)`);
    }
    document.getElementById('loyalty-add-phone').value = '';
    document.getElementById('loyalty-add-name').value = '';
    await loadLoyaltyTab();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

async function loyaltyRedeem(phone) {
  if (!confirm('לממש פרס ללקוח זה?')) return;
  try {
    await fetch(`/api/loyalty/${currentBarberId}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ phone })
    });
    showToast('🎁 הפרס מומש בהצלחה!');
    loyaltyLookup();
  } catch (e) {
    showToast('שגיאה: ' + e.message, 'error');
  }
}

// ── Loyalty badge helper for appointment cards ──
async function getLoyaltyBadge(phone) {
  if (!phone || !currentBarberId) return '';
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const res = await fetch(`/api/loyalty/${currentBarberId}/check/${cleanPhone}`);
    const data = await res.json();
    if (!data.enabled || !data.customer) return '';
    const c = data.customer;
    return `<span class="loyalty-badge" title="מועדון נאמנות">⭐ ${c.visits}/${data.visitsForReward}</span>`;
  } catch { return ''; }
}

// ── Barber Management (Admin only) ──────────
async function loadBarbersManage() {
  const container = document.getElementById('barbers-manage-list');
  if (!container) return;
  container.innerHTML = '<div class="flex justify-center py-8"><div class="spinner"></div></div>';
  try {
    const res = await fetch('/api/barbers');
    const barbers = await res.json();
    if (!barbers.length) {
      container.innerHTML = '<p class="text-gray-400 text-center py-4">אין ספרים במערכת</p>';
      return;
    }
    function _esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    container.innerHTML = barbers.map(b => `
      <div class="bg-dark-100 rounded-xl border border-white/5 p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-dark-300 rounded-full flex items-center justify-center text-gold text-lg">
            <i class="fa-solid fa-user"></i>
          </div>
          <div>
            <span class="text-white font-medium text-lg">${_esc(b.name)}</span>
            <p class="text-gray-400 text-sm">מחיר בסיס: ₪${b.base_price || 60}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${b.name === '\u05e8\u05d5\u05df \u05e2\u05de\u05e8' ? '<span class="text-xs text-gold bg-gold/10 px-2 py-1 rounded-lg">מנהל</span>' : `
            <button onclick="deleteBarber('${b.id}','${_esc(b.name)}')"
              class="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all">
              <i class="fa-solid fa-trash ml-1"></i> מחק
            </button>
          `}
        </div>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<p class="text-red-400 text-center py-4">שגיאה: ${e.message}</p>`;
  }
}

async function addBarber() {
  const nameEl = document.getElementById('new-barber-name');
  const priceEl = document.getElementById('new-barber-price');
  const name = nameEl.value.trim();
  const price = parseInt(priceEl.value) || 60;
  if (!name) { alert('הכנס שם ספר'); return; }

  try {
    const res = await fetch('/api/barbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ name, base_price: price })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'שגיאה');
    }
    nameEl.value = '';
    priceEl.value = '60';
    showToast('הספר נוסף בהצלחה!', 'success');
    loadBarbersManage();
    // Refresh selects
    if (typeof loadBarberOptions === 'function') loadBarberOptions();
    if (typeof loadDashBarberSelect === 'function') loadDashBarberSelect();
  } catch(e) {
    alert('שגיאה: ' + e.message);
  }
}

async function deleteBarber(id, name) {
  if (!confirm(`בטוח שאתה רוצה למחוק את ${name}? כל התורים שלו יישארו במערכת.`)) return;
  try {
    const res = await fetch(`/api/barbers/${id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': API_KEY }
    });
    if (!res.ok) throw new Error('שגיאה במחיקה');
    showToast(`${name} נמחק`, 'success');
    loadBarbersManage();
    if (typeof loadBarberOptions === 'function') loadBarberOptions();
    if (typeof loadDashBarberSelect === 'function') loadDashBarberSelect();
  } catch(e) {
    alert('שגיאה: ' + e.message);
  }
}
