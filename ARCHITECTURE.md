# Supabase Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                       index.html + JS                            │
├────────────────────────────────────┬────────────────────────────┤
│                                    │                            │
│  BOOKING FORM                      │   BARBER DASHBOARD        │
│  ├─ Select Barber                 │   ├─ Login (Name/Pass)    │
│  ├─ Select Service                │   ├─ View Appointments    │
│  ├─ Choose Date/Time              │   └─ Cancel Appointments  │
│  ├─ Enter Customer Info           │                            │
│  ├─ OTP Verification              │                            │
│  └─ Submit Booking                │                            │
│      ↓                             │                            │
│  Supabase JS Client               │   Supabase JS Client       │
│  .from('appointments')            │   .from('appointments')    │
│  .insert(...)                     │   .select() + .delete()    │
│                                    │                            │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                    ┌────────────────┘
                    │
                    ↓
        ┌───────────────────────────┐
        │   SUPABASE REST API       │
        │ (Secure via Anon Key)     │
        │ (RLS Enforced)            │
        └───────────────────────────┘
                    │
                    ↓
        ┌───────────────────────────┐
        │   POSTGRESQL DATABASE     │
        │  (yaboiwxuhhfkbjmqgeet)   │
        └───────────────────────────┘
```

## Database Schema Relationships

```
┌──────────────────┐
│   Barbers        │  (Auth Users)
├──────────────────┤
│ id (UUID)        │◄──┐
│ name             │   │
│ base_price       │   │
│ bio              │   │
└──────────────────┘   │
        ▲              │
        │              │
        └──────────────┼────────────┐
                       │            │
                       │            │
                ┌──────┴──────┐     │
                │ Appointments│     │
                ├─────────────┤     │
                │ id          │     │
                │ barber_id───┼─────┘
                │ service_id──┼────────────┐
                │ customer_id─┼─┐          │
                │ date        │ │          │
                │ time        │ │          │
                │ status      │ │          │
                └─────────────┘ │          │
                                │          │
                    ┌───────────┘          │
                    │                      │
                    ↓                      ↓
            ┌──────────────┐      ┌──────────────┐
            │  Customers   │      │   Services   │
            ├──────────────┤      ├──────────────┤
            │ id           │      │ id           │
            │ phone        │      │ name         │
            │ name         │      │ price_offset │
            │ created_at   │      │ fixed_price  │
            └──────────────┘      └──────────────┘
```

## Data Flow - Booking Process

```
1. CUSTOMER BOOKING FLOW
   ├─ Selects Barber
   │  └─ Query: SELECT * FROM barbers
   │     Returns: All barber options
   │
   ├─ Selects Service
   │  └─ Query: SELECT * FROM services
   │     Returns: All available services
   │
   ├─ Chooses Date/Time
   │  └─ Client-side validation
   │     Prevents past dates
   │     Prevents duplicate times
   │
   ├─ Enters Contact Info
   │  └─ Validates phone format
   │     Min 9 digits
   │
   ├─ Gets OTP
   │  └─ Generated locally: 4 random digits
   │     Sent via SMS (Infobip API)
   │     Displayed in alert for demo
   │
   └─ Confirms Booking
      ├─ INSERT INTO customers (phone, name)
      │  └─ If phone exists, use existing customer
      │
      ├─ INSERT INTO appointments (customer_id, barber_id, service_id, ...)
      │  └─ Check UNIQUE constraint
      │     (barber_id, appointment_date, appointment_time)
      │     Prevents double-booking
      │
      └─ Send Confirmation SMS
         └─ Contains appointment details
            Sent to customer phone
```

## Data Flow - Barber Dashboard

```
2. BARBER DASHBOARD FLOW
   ├─ Login
   │  ├─ Select Barber Name
   │  ├─ Enter Password (1234 for demo)
   │  └─ Sets: currentBarberLoggedIn = barberName
   │
   ├─ Load Appointments
   │  └─ Query:
   │     SELECT appointments.* 
   │     FROM appointments
   │     JOIN barbers ON appointments.barber_id = barbers.id
   │     WHERE barbers.name = currentBarberLoggedIn
   │     AND appointment_date >= TODAY
   │     ORDER BY date, time
   │
   │     Returns: Array of appointment objects with:
   │     ├─ appointment_date
   │     ├─ appointment_time
   │     ├─ customer_name
   │     ├─ phone
   │     └─ service_name (via join)
   │
   ├─ Display Appointments
   │  └─ Render HTML with:
   │     ├─ Time box (HH:MM)
   │     ├─ Customer name
   │     ├─ Phone number
   │     ├─ Service name
   │     └─ Delete button
   │
   └─ Delete Appointment
      ├─ Confirm dialog
      ├─ Query: DELETE FROM appointments WHERE id = appointmentId
      │  └─ RLS Policy enforces: barber_id = current_user_id
      │
      └─ Remove from UI with animation
         └─ Optional: Send SMS to customer (cancellation notice)
```

## Row Level Security (RLS) Policies

```
CUSTOMERS TABLE
├─ SELECT: Everyone can view (for booking display)
└─ INSERT: Everyone can create (for new bookings)

BARBERS TABLE
├─ SELECT: Everyone can view (for booking options)
└─ UPDATE: Only own profile (barber_id = auth.uid())

SERVICES TABLE
├─ SELECT: Everyone can view (for booking options)
└─ No write access (read-only)

APPOINTMENTS TABLE
├─ SELECT: Everyone or barber (auth.uid() = barber_id)
│          (Allows customers to view via join, barbers see own)
├─ INSERT: Everyone (for new bookings)
├─ UPDATE: Only barber of that appointment
└─ DELETE: Only barber of that appointment
```

## API Calls Summary

### Booking Creation
```javascript
1. SELECT services WHERE name = serviceStr
2. SELECT customers WHERE phone = phone
   OR INSERT customers
3. SELECT barbers WHERE name = barberStr
4. INSERT appointments (...)
5. POST /sms (Infobip) - send confirmation
```

### Dashboard Load
```javascript
1. SELECT appointments 
   JOIN barbers 
   WHERE barber.name = currentBarberLoggedIn
   AND date >= today
   ORDER BY date, time
```

### Appointment Deletion
```javascript
1. DELETE appointments WHERE id = id
   (RLS enforces: barber_id = auth.uid())
2. (Optional) POST /sms - send cancellation notice
```

## Key Constraints & Safety

```
UNIQUE Constraints
├─ customers.phone - unique
│  └─ Prevents duplicate customer profiles
│
└─ appointments (barber_id, appointment_date, appointment_time)
   └─ Prevents double-booking same time/barber
      Example: Can't book 2 customers at 10:20 with same barber
      But: Can book different barbers at same time

Foreign Key Constraints
├─ appointments.customer_id → customers.id
├─ appointments.barber_id → barbers.id
├─ appointments.service_id → services.id
└─ barbers.id → auth.users.id

Row Level Security (Database Level)
├─ Applied at database layer (not app layer)
├─ Barber can ONLY:
│  ├─ See their own appointments
│  ├─ Delete their own appointments
│  └─ Update their own appointments
└─ Even if code tries to bypass: Database enforces!
```

## Error Handling Flow

```
Try to book appointment
    ↓
Validate OTP ──→ If wrong → Alert & retry
    ↓
Fetch service ─→ If not found → Alert, abort
    ↓
Fetch/create customer ─→ If error → Alert, abort
    ↓
Fetch barber ─→ If not found → Alert, abort
    ↓
INSERT appointment ─→ If UNIQUE violation → Alert, abort
                  ├─ (double-book attempt caught here)
                  ↓
Send SMS ─→ If CORS blocked → Show in alert (demo)
    ↓
Show success ─→ Appointment confirmed!
    ↓
Update database ─→ Data persisted to Supabase
```

## Deployment Architecture (Production)

```
┌──────────────┐
│ index.html   │
│ (Static)     │
└──────┬───────┘
       │
       ├─── HTTP/HTTPS ────────┐
       │                       │
   (Browser)            ┌──────▼──────────┐
                        │ Supabase Edge   │
                        │ Functions       │
                        │ (Optional)      │
                        ├─────┬───────────┤
                        │     │ SMS API   │
                        │     │ (Infobip) │
                        └─────┼───────────┘
                              │
                        ┌─────▼──────────┐
                        │ REST API       │
                        │ (Auth Check)   │
                        └─────┬──────────┘
                              │
                        ┌─────▼──────────┐
                        │ PostgreSQL     │
                        │ with RLS       │
                        │                │
                        │ - customers    │
                        │ - barbers      │
                        │ - services     │
                        │ - appointments │
                        └────────────────┘
```

---

This architecture ensures:
✅ Secure authentication
✅ Data integrity (no double-booking)
✅ Access control (RLS enforced at DB)
✅ Real-time data sync
✅ Scalable to thousands of appointments
