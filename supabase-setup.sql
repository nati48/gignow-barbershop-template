-- ============================================
-- SUPABASE DATABASE SCHEMA FOR RON AMAR BARBERSHOP
-- ============================================

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create Barbers Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  base_price INTEGER NOT NULL DEFAULT 60,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Services Table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_offset INTEGER DEFAULT 0, -- Used with barber base price
  fixed_price INTEGER, -- If NULL, use base_price + price_offset
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create Appointments Table (the main booking table)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Composite index for efficient queries
  UNIQUE(barber_id, appointment_date, appointment_time)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Customers table RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own data"
  ON customers FOR SELECT
  USING (TRUE); -- Anyone can view (for client-side booking)

CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  WITH CHECK (TRUE);

-- Barbers table RLS (read-only for clients, editable by barbers)
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view all barbers"
  ON barbers FOR SELECT
  USING (TRUE);

CREATE POLICY "Barbers can update their own profile"
  ON barbers FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Services table RLS (read-only for everyone)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view services"
  ON services FOR SELECT
  USING (TRUE);

-- Appointments table RLS (customers can view their own, barbers can view their appointments)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers can view their own appointments"
  ON appointments FOR SELECT
  USING (barber_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Barbers can update their own appointments"
  ON appointments FOR UPDATE
  USING (barber_id = auth.uid())
  WITH CHECK (barber_id = auth.uid());

CREATE POLICY "Barbers can delete their own appointments"
  ON appointments FOR DELETE
  USING (barber_id = auth.uid());

-- ============================================
-- INSERT INITIAL DATA
-- ============================================

-- Insert services
INSERT INTO services (name, price_offset, fixed_price, display_order) VALUES
  ('תספורת גבר', 0, NULL, 1),
  ('תספורת ועיצוב זקן', 50, NULL, 2),
  ('עיצוב זקן בלבד', NULL, 60, 3),
  ('תספורת חייל', NULL, 60, 4),
  ('תספורת ילד', NULL, 60, 5),
  ('ניקוי שעווה / גבות', NULL, 30, 6),
  ('צבע / גוונים לגבר', NULL, 100, 7),
  ('החלקה לגבר', NULL, 250, 8)
ON CONFLICT (name) DO NOTHING;

-- Note: Barbers should be created via Supabase Auth with their user IDs.
-- After creating a user in Auth, insert a record in the barbers table with their auth.users.id

-- ============================================
-- USEFUL QUERIES FOR TESTING
-- ============================================

-- View all services
-- SELECT * FROM services ORDER BY display_order;

-- View appointments for a specific date
-- SELECT a.*, b.name as barber_name, s.name as service_name 
-- FROM appointments a
-- JOIN barbers b ON a.barber_id = b.id
-- JOIN services s ON a.service_id = s.id
-- WHERE a.appointment_date = '2024-05-12'
-- ORDER BY a.appointment_time;

-- Count appointments by barber
-- SELECT b.name, COUNT(a.id) as total_appointments
-- FROM barbers b
-- LEFT JOIN appointments a ON b.id = a.barber_id
-- GROUP BY b.id, b.name;
