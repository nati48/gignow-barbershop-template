/* ============================================
   BOOKING.JS — Booking Modal & Flow
   ============================================ */

let currentStep = 1;
const totalSteps = 5;
let generatedOTP = '';
let loadedServices = [];
let confirmationResult = null;
let recaptchaVerifier = null;
let firebaseReady = false;
let _selectedDate = '';
let _selectedTime = '';

// ── Demo fallback barbers ─────────────────
const DEMO_BARBERS = [
  { id: 'demo-1', name: 'אבי ישראלי', base_price: 80 },
  { id: 'demo-2', name: 'דניאל כהן', base_price: 60 },
  { id: 'demo-3', name: 'עידו לוי', base_price: 60 },
  { id: 'demo-4', name: 'יוסי מזרחי', base_price: 100 },
];

// ── Load barbers dynamically ─────────────────
async function loadBarberOptions() {
  const container = document.getElementById('barber-options-container');
  if (!container) return;
  container.innerHTML = '<div class="flex justify-center py-4"><div class="spinner"></div></div>';
  try {
    let barbers;
    try {
      const res = await fetch('/api/barbers');
      if (!res.ok) throw new Error('API error');
      barbers = await res.json();
      if (!barbers.length) throw new Error('empty');
    } catch(e) {
      barbers = DEMO_BARBERS;
    }
    container.innerHTML = '';
    function _esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    barbers.forEach(b => {
      const safeName = _esc(b.name);
      const price = b.base_price || 60;
      const isRon = b.name === '\u05e8\u05d5\u05df \u05e2\u05de\u05e8';
      const label = document.createElement('label');
      label.className = 'flex items-center justify-between p-4 rounded-xl border border-white/10 bg-dark-300 cursor-pointer hover:border-gold/50 transition-all focus-within:border-gold focus-within:bg-gold/5';
      label.innerHTML = `
        <div class="flex items-center gap-4">
          <input type="radio" name="barber" value="${safeName}" data-base-price="${price}"
            class="w-4 h-4 text-gold bg-dark-100 border-gray-600 focus:ring-gold focus:ring-offset-dark-300">
          <div class="w-10 h-10 bg-dark-100 rounded-full flex items-center justify-center text-gray-400 text-lg">
            <i class="fa-solid fa-user ${isRon ? 'text-gold' : ''}"></i>
          </div>
          <span class="text-white font-medium ${isRon ? 'font-bold' : ''}">${safeName}</span>
        </div>
        <span class="text-gray-400 text-sm">\u05d4\u05d7\u05dc \u05de-\u20aa${price}</span>
      `;
      container.appendChild(label);
    });
  } catch(e) {
    container.innerHTML = '<p class="text-red-400 text-center py-4">\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d8\u05e2\u05d9\u05e0\u05ea \u05e1\u05e4\u05e8\u05d9\u05dd</p>';
  }
}

async function loadDashBarberSelect() {
  const sel = document.getElementById('dash-barber-select');
  if (!sel) return;
  try {
    let barbers;
    try {
      const res = await fetch('/api/barbers');
      if (!res.ok) throw new Error('API error');
      barbers = await res.json();
      if (!barbers.length) throw new Error('empty');
    } catch(e) {
      barbers = DEMO_BARBERS;
    }
    sel.innerHTML = '';
    barbers.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  } catch(e) { console.warn('loadDashBarberSelect error', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBarberOptions();
  loadDashBarberSelect();
});

// ── Open / Close Modal ──────────────────────
function openBookingModal() {
  loadBarberOptions();
  const overlay = document.getElementById('booking-modal-overlay');
  const content = document.getElementById('booking-modal-content');
  overlay.classList.remove('pointer-events-none', 'opacity-0');
  content.classList.remove('modal-exit');
  content.classList.add('modal-enter', 'active');
  document.body.style.overflow = 'hidden';
  const a11y = document.getElementById('a11y-widget');
  if (a11y) a11y.style.display = 'none';
  goToStep(1);
}

function closeBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  const content = document.getElementById('booking-modal-content');
  content.classList.remove('active');
  content.classList.add('modal-exit');
  overlay.classList.add('opacity-0');
  setTimeout(() => {
    overlay.classList.add('pointer-events-none');
    document.body.style.overflow = '';
    resetBookingForm();
    const a11y = document.getElementById('a11y-widget');
    if (a11y) a11y.style.display = '';
  }, 300);
}

function resetBookingForm() {
  currentStep = 1;
  generatedOTP = '';
  confirmationResult = null;
  _selectedDate = '';
  _selectedTime = '';
  document.querySelectorAll('input[name="barber"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="service"]').forEach(r => r.checked = false);
  ['booking-date', 'booking-time', 'user-name', 'user-phone', 'user-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── Step Navigation ─────────────────────────
function goToStep(step) {
  currentStep = step;

  document.querySelectorAll('.booking-step').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('block');
  });

  const stepEl = document.getElementById(`step-${step}`);
  if (stepEl) {
    stepEl.classList.remove('hidden');
    stepEl.classList.add('block');
  }

  const progress = document.getElementById('booking-progress');
  if (progress) progress.style.width = `${(step / totalSteps) * 100}%`;

  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const footer = document.getElementById('modal-footer');

  if (step === 1) btnBack.classList.add('hidden');
  else btnBack.classList.remove('hidden');

  btnNext.disabled = false; // Always re-enable on step change
  if (step === 4) btnNext.textContent = 'אשר תור';
  else if (step < 4) btnNext.textContent = 'המשך לשלב הבא';

  if (step === 5) footer.classList.add('hidden');
  else footer.classList.remove('hidden');
}

async function nextStep() {
  const _btn = document.getElementById('btn-next');
  if (_btn && _btn.disabled) return;
  try {
  if (currentStep === 1) {
    const selected = document.querySelector('input[name="barber"]:checked');
    if (!selected) { alert('אנא בחר ספר'); return; }
    populateServices(selected.value, parseInt(selected.dataset.basePrice));
    document.getElementById('selected-barber-name').textContent = selected.value;
    goToStep(2);

  } else if (currentStep === 2) {
    const selected = document.querySelector('input[name="service"]:checked');
    if (!selected) { alert('אנא בחר שירות'); return; }
    setupDateInput();
    goToStep(3);

  } else if (currentStep === 3) {
    if (!_selectedDate) { alert('אנא בחר תאריך'); return; }
    if (!_selectedTime) { alert('אנא בחר שעה'); return; }
    updateSummary();
    goToStep(4);

  } else if (currentStep === 4) {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    if (!name || name.length < 2) { alert('אנא הכנס שם מלא'); return; }
    if (!phone || phone.replace(/\D/g, '').length < 9) { alert('אנא הכנס מספר טלפון תקין'); return; }

    // Submit booking directly (no OTP)
    const btnNext = document.getElementById('btn-next');
    btnNext.disabled = true;
    btnNext.textContent = 'שומר תור...';
    await submitBooking();
  }
  } catch(e) { console.error('nextStep error:', e); }
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

// ── Firebase Phone Auth ─────────────────────
function initRecaptcha() {
  if (!firebaseReady) return false;

  try {
    // Clear old verifier
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch(e) {}
    }

    // Clear the container
    const container = document.getElementById('recaptcha-container');
    if (container) container.innerHTML = '';

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: function(response) {
        console.log('✅ reCAPTCHA solved');
      },
      'expired-callback': function() {
        console.log('⚠️ reCAPTCHA expired');
      }
    });

    return true;
  } catch(err) {
    console.error('reCAPTCHA init error:', err);
    return false;
  }
}

async function sendFirebaseOTP(phone) {
  if (!firebaseReady) {
    alert('שירות SMS לא זמין כרגע. נסה שוב מאוחר יותר.');
    return;
  }

  try {
    if (!initRecaptcha()) {
      throw new Error('reCAPTCHA failed to initialize');
    }

    // Format phone to E.164
    let formatted = phone.replace(/[\s\-()]/g, '');
    if (formatted.startsWith('0')) formatted = '+972' + formatted.slice(1);
    if (!formatted.startsWith('+')) formatted = '+972' + formatted;

    console.log('📱 Sending OTP to:', formatted);

    confirmationResult = await firebase.auth().signInWithPhoneNumber(formatted, recaptchaVerifier);
    console.log('✅ SMS sent successfully!');

  } catch (err) {
    console.error('❌ Firebase OTP error:', err);
    confirmationResult = null;

    alert(`שגיאה בשליחת SMS: ${err.message || err.code || 'Unknown error'}\n\nנסה שוב מאוחר יותר.`);
  }
}

async function verifyOTPAndSubmit() {
  const otpInput = document.getElementById('otp-input').value.trim();
  if (!otpInput || otpInput.length < 6) {
    alert('אנא הכנס קוד אימות');
    return;
  }

  const btnNext = document.getElementById('btn-next');
  btnNext.disabled = true;
  btnNext.textContent = 'מאמת...';

  try {
    if (confirmationResult) {
      // Verify with Firebase
      await confirmationResult.confirm(otpInput);
      console.log('✅ Firebase OTP verified');
    } else {
      throw new Error('שירות SMS לא זמין. חזור ונסה שוב.');
    }

    // OTP verified — submit booking
    await submitBooking();
  } catch (err) {
    let msg = err.message || 'קוד אימות שגוי';
    if (err.code === 'auth/invalid-verification-code') msg = 'קוד אימות שגוי. נסה שנית.';
    if (err.code === 'auth/code-expired') msg = 'הקוד פג תוקף. חזור ונסה שוב.';
    alert(msg);
    btnNext.disabled = false;
    btnNext.textContent = 'אשר תור';
  }
}

// ── Populate Services from Supabase ─────────
async function populateServices(barberName, basePrice) {
  const container = document.getElementById('service-options-container');
  container.innerHTML = '<div class="flex justify-center py-4"><div class="spinner"></div></div>';

  try {
    const { data, error } = await db
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    loadedServices = data;

    container.innerHTML = '';
    // Escape HTML to prevent XSS
    function _esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    data.forEach(service => {
      const safeName = _esc(service.name);
      const priceText = service.name === 'צבע / גוונים לגבר' ? `₪${service.price}+` : `₪${service.price}`;
      const label = document.createElement('label');
      label.className = 'flex items-center justify-between p-4 rounded-xl border border-white/10 bg-dark-300 cursor-pointer hover:border-gold/50 transition-all focus-within:border-gold focus-within:bg-gold/5';
      label.innerHTML = `
        <div class="flex items-center gap-4">
          <input type="radio" name="service" value="${safeName}" data-service-id="${_esc(service.id)}" data-price="${service.price}"
            class="w-4 h-4 text-gold bg-dark-100 border-gray-600 focus:ring-gold focus:ring-offset-dark-300">
          <span class="text-white font-medium">${safeName}</span>
        </div>
        <span class="text-gray-400 text-sm">${priceText}</span>
      `;
      container.appendChild(label);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-400 text-center py-4">שגיאה בטעינת שירותים: ${err.message}</p>`;
  }
}

// ── Visual Calendar ─────────────────────────
var calendarMonth = new Date().getMonth();
var calendarYear = new Date().getFullYear();
var _bookingHoursCache = null;
var _bookingOverridesCache = null;
var _bookingBarberId = null;

async function fetchBookingBarberHours() {
  const barberName = document.querySelector('input[name="barber"]:checked')?.value;
  if (!barberName) return;
  try {
    const { data: barberData } = await db.from('barbers').select('id').eq('name', barberName + ' [DEMO]').single();
    if (!barberData) return;
    _bookingBarberId = barberData.id;
    const [hRes, oRes] = await Promise.all([
      fetch(`/api/hours/${barberData.id}`),
      fetch(`/api/overrides/${barberData.id}`)
    ]);
    _bookingHoursCache = await hRes.json();
    _bookingOverridesCache = await oRes.json();
  } catch (e) { console.warn('fetchBookingBarberHours error', e); }
}

function isBookingDayOpen(dateStr) {
  if (_bookingOverridesCache && _bookingOverridesCache[dateStr]) {
    return _bookingOverridesCache[dateStr].open;
  }
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  if (_bookingHoursCache && _bookingHoursCache[dow] !== undefined) {
    return _bookingHoursCache[dow].open;
  }
  // Default: closed on Saturday
  return dow !== 6 && dow !== 1; // Closed Saturday + Monday
}

async function setupDateInput() {
  await fetchBookingBarberHours();
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const today = new Date();
  today.setHours(0,0,0,0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sunday

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const dayNames = ['א\'','ב\'','ג\'','ד\'','ה\'','ו\'','ש\''];

  const selectedDate = document.getElementById('booking-date').value;

  let html = '<div class="calendar-header">';
  html += `<button type="button" onclick="calendarPrev()">‹</button>`;
  html += `<span class="month-label">${monthNames[calendarMonth]} ${calendarYear}</span>`;
  html += `<button type="button" onclick="calendarNext()">›</button>`;
  html += '</div>';

  html += '<div class="calendar-days-header">';
  dayNames.forEach(d => { html += `<span>${d}</span>`; });
  html += '</div>';

  html += '<div class="calendar-grid">';

  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(calendarYear, calendarMonth, d);
    date.setHours(0,0,0,0);
    const dateStr = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = date.getDay();
    const isPast = date < today;
    const isFuture = date > maxDate;
    const isClosed = !isBookingDayOpen(dateStr);
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
      html += `<div class="${cls}" onclick="selectCalendarDay('${dateStr}', this)">${d}</div>`;
    }
  }

  html += '</div>';
  container.innerHTML = html;
}

function selectCalendarDay(dateStr, el) {
  document.querySelectorAll('#calendar-container .calendar-day').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  _selectedDate = dateStr;
  _selectedTime = '';
  try { document.getElementById('booking-date').value = dateStr; } catch(e) {}
  generateTimeSlots();
}

function calendarPrev() {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendar();
}

function calendarNext() {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendar();
}

async function generateTimeSlots() {
  const container = document.getElementById('time-slots');
  const dateStr = _selectedDate;
  const selectedDate = new Date(dateStr + 'T00:00:00');
  container.innerHTML = '<div class="col-span-3 flex justify-center py-4"><div class="spinner"></div></div>';

  // Fetch barber info first
  const barberName = document.querySelector('input[name="barber"]:checked')?.value;
  let barberId = null;
  if (barberName) {
    try {
      const { data: barberData } = await db.from('barbers').select('id').eq('name', barberName + ' [DEMO]').single();
      if (barberData) barberId = barberData.id;
    } catch (e) { console.warn(e); }
  }

  // Fetch working hours & overrides from server
  let dayCfg = null;
  const dayOfWeek = selectedDate.getDay();
  const DEFAULT_H = {
    0: { open: true, start: '09:00', end: '20:00' },
    1: { open: false, start: '09:00', end: '20:00' },
    2: { open: true, start: '09:00', end: '20:00' },
    3: { open: true, start: '09:00', end: '20:00' },
    4: { open: true, start: '09:00', end: '20:00' },
    5: { open: true, start: '08:00', end: '15:00' },
    6: { open: false, start: '09:00', end: '20:00' },
  };

  if (barberId) {
    try {
      // Check overrides first
      const ovRes = await fetch(`/api/overrides/${barberId}`);
      const overrides = await ovRes.json();
      if (overrides[dateStr]) {
        dayCfg = overrides[dateStr];
      } else {
        // Fall back to weekly hours
        const hRes = await fetch(`/api/hours/${barberId}`);
        const hours = await hRes.json();
        dayCfg = (hours && hours[dayOfWeek]) || DEFAULT_H[dayOfWeek];
      }
    } catch (e) {
      console.warn('Could not fetch hours:', e);
      dayCfg = DEFAULT_H[dayOfWeek];
    }
  } else {
    dayCfg = DEFAULT_H[dayOfWeek];
  }

  if (!dayCfg || !dayCfg.open) {
    container.innerHTML = '<div class="col-span-3 text-center text-red-400 py-4">סגור ביום זה</div>';
    return;
  }

  const [sh, sm] = dayCfg.start.split(':').map(Number);
  const [eh, em] = dayCfg.end.split(':').map(Number);
  let startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const breaks = dayCfg.breaks || [];

  // Skip past time slots for today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  let nowMin = -1;
  if (dateStr === todayStr) {
    nowMin = now.getHours() * 60 + now.getMinutes();
  }

  // Get interval from hours data
  let slotInterval = 20;
  if (barberId && _bookingHoursCache && _bookingHoursCache._slotInterval) {
    slotInterval = _bookingHoursCache._slotInterval;
  }

  // Fetch booked times
  let bookedTimes = [];
  if (barberId) {
    try {
      const { data: appts } = await db
        .from('appointments').select('appointment_time')
        .eq('barber_id', barberId)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');
      bookedTimes = (appts || []).map(a => a.appointment_time.slice(0, 5));
    } catch (e) { console.warn('Could not fetch booked times:', e); }
  }

  // Check if time is in a break
  function _isInBreak(t) {
    for (const b of breaks) {
      if (t >= b.start && t < b.end) return true;
    }
    return false;
  }

  container.innerHTML = '';
  let hasAvailable = false;
  for (let m = startMin; m < endMin; m += slotInterval) {
    const h = Math.floor(m / 60), mm = m % 60;
    const timeStr = `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    if (nowMin >= 0 && m <= nowMin) continue;
    const onBreak = _isInBreak(timeStr);
    if (onBreak) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    const isBooked = bookedTimes.includes(timeStr);
    btn.className = `time-slot${isBooked ? ' disabled' : ''}`;
    btn.textContent = isBooked ? `${timeStr} ✖` : timeStr;
    if (!isBooked) {
      hasAvailable = true;
      btn.onclick = () => selectTimeSlot(btn, timeStr);
    }
    container.appendChild(btn);
  }

  // Waitlist: if no available slots, show waitlist option
  if (!hasAvailable && container.children.length > 0) {
    const waitlistDiv = document.createElement('div');
    waitlistDiv.className = 'col-span-3 text-center py-4';
    waitlistDiv.innerHTML = `
      <div class="bg-dark-300 border border-gold/20 rounded-xl p-4">
        <p class="text-gold font-semibold mb-1"><i class="fa-solid fa-bell"></i> כל השעות תפוסות</p>
        <p class="text-gray-400 text-sm mb-3">השאר פרטים ונודיע לך אם משהו יתפנה</p>
        <button type="button" onclick="joinWaitlist()" class="bg-gold hover:bg-gold-hover text-white px-6 py-2 rounded-xl font-bold text-sm transition-all">
          <i class="fa-solid fa-user-plus ml-1"></i> הצטרף לרשימת המתנה
        </button>
      </div>
    `;
    container.appendChild(waitlistDiv);
  }
}

function joinWaitlist() {
  _selectedTime = 'waitlist';
  try { document.getElementById('booking-time').value = 'waitlist'; } catch(e) {}
  updateSummary();
  goToStep(4);
}

function selectTimeSlot(btn, time) {
  document.querySelectorAll('#time-slots .time-slot').forEach(s => s.classList.remove('selected'));
  btn.classList.add('selected');
  _selectedTime = time;
  try { document.getElementById('booking-time').value = time; } catch(e) {}
}

// ── Summary ─────────────────────────────────
function updateSummary() {
  const barber = document.querySelector('input[name="barber"]:checked')?.value || '';
  const service = document.querySelector('input[name="service"]:checked')?.value || '';
  const date = _selectedDate;
  const time = _selectedTime;

  const dateFormatted = date ? new Date(date + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : '';

  document.getElementById('summary-barber').textContent = `💈 ספר: ${barber}`;
  document.getElementById('summary-service').textContent = `✂️ שירות: ${service}`;
  document.getElementById('summary-datetime').textContent = time === 'waitlist'
    ? `📅 ${dateFormatted} — רשימת המתנה`
    : `📅 ${dateFormatted} בשעה ${time}`;
}

// ── Submit Booking to Supabase ──────────────
async function submitBooking() {
  const barberName = document.querySelector('input[name="barber"]:checked').value;
  const serviceEl = document.querySelector('input[name="service"]:checked');
  const serviceId = serviceEl.dataset.serviceId;
  const date = _selectedDate;
  const time = _selectedTime;
  const name = document.getElementById('user-name').value.trim();
  const phone = document.getElementById('user-phone').value.trim();

  const btnNext = document.getElementById('btn-next');
  btnNext.disabled = true;
  btnNext.textContent = 'שומר תור...';

  try {
    // 1. Get or create customer
    let customerId;
    const { data: existingCustomer } = await db
      .from('customers').select('id').eq('phone', phone).maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name if changed
      await db.from('customers').update({ name }).eq('id', customerId);
    } else {
      const { data: newCustomer, error: custErr } = await db
        .from('customers').insert({ phone, name }).select('id').single();
      if (custErr) throw new Error('שגיאה ביצירת לקוח: ' + custErr.message);
      customerId = newCustomer.id;
    }

    // 2. Get barber ID
    const { data: barberData, error: barberErr } = await db
      .from('barbers').select('id').eq('name', barberName + ' [DEMO]').single();
    if (barberErr || !barberData) throw new Error('ספר לא נמצא במערכת');

    const isWaitlist = (time === 'waitlist');

    // 3. Check if slot is already taken (skip for waitlist)
    if (!isWaitlist) {
      const { data: existing } = await db
        .from('appointments')
        .select('id')
        .eq('barber_id', barberData.id)
        .eq('appointment_date', date)
        .eq('appointment_time', time)
        .neq('status', 'cancelled')
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error('השעה הזו כבר תפוסה! אנא בחר שעה אחרת.');
      }
    }

    // 4. Create appointment
    const { error: apptErr } = await db
      .from('appointments').insert({
        customer_id: customerId,
        barber_id: barberData.id,
        service_id: serviceId,
        appointment_date: date,
        appointment_time: isWaitlist ? '00:00' : time,
        phone: phone,
        customer_name: name,
        status: isWaitlist ? 'waitlist' : 'pending'
      });

    if (apptErr) {
      if (apptErr.message.includes('unique') || apptErr.message.includes('duplicate')) {
        throw new Error('השעה הזו כבר תפוסה! אנא בחר שעה אחרת.');
      }
      throw new Error('שגיאה בקביעת התור: ' + apptErr.message);
    }

    // Send confirmation email
    const email = (document.getElementById('user-email')?.value || '').trim();
    if (email) {
      const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const serviceName = serviceEl.value;
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            type: 'confirmation',
            customerName: name,
            barberName,
            serviceName,
            date: dateFormatted,
            time: isWaitlist ? 'רשימת המתנה' : time
          })
        });
      } catch(e) { console.warn('Email send failed:', e); }

      // Save email on customer record
      try {
        await db.from('customers').update({ email }).eq('id', customerId);
      } catch(e) { console.warn('Could not save email:', e); }
    }

    goToStep(5);

    // Auto-subscribe to push if already permitted
    if (typeof subscribeToPush === 'function' && Notification.permission === 'granted') {
      subscribeToPush(phone, name).then(() => {
        const cta = document.getElementById('push-cta-booking');
        if (cta) cta.style.display = 'none';
      });
    }

  } catch (err) {
    alert(err.message);
    const btnNext = document.getElementById('btn-next');
    btnNext.disabled = false;
    btnNext.textContent = 'אשר תור';
  }
}

// ── Enable push from booking success step ──
async function enablePushFromBooking() {
  const phone = document.getElementById('user-phone')?.value?.trim() || '';
  const name = document.getElementById('user-name')?.value?.trim() || '';
  const btn = document.getElementById('push-enable-booking-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'מפעיל...'; }

  const ok = await subscribeToPush(phone, name);
  if (ok) {
    const cta = document.getElementById('push-cta-booking');
    if (cta) cta.innerHTML = '<p class="text-sm text-green-400"><i class="fa-solid fa-check-circle"></i> התראות הופעלו בהצלחה!</p>';
  } else {
    if (btn) { btn.disabled = false; btn.textContent = 'נסה שוב'; }
  }
}
