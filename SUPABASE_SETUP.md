# Supabase Integration Setup Guide - Ron Amar Barbershop

## Overview
Your barber shop website is now integrated with Supabase for managing appointments, customers, barbers, and services. This guide walks you through the setup process.

## Step 1: Run the Database Schema

### Using Supabase Dashboard SQL Editor:

1. Go to your Supabase project dashboard: `https://app.supabase.com`
2. Navigate to the **SQL Editor** section
3. Click **New Query**
4. Copy the entire contents of `supabase-setup.sql` from this project
5. Paste it into the SQL editor
6. Click **Run**

This will create:
- `customers` table - stores customer info (name, phone)
- `barbers` table - stores barber info, linked to auth.users
- `services` table - stores available services
- `appointments` table - stores booking appointments
- Row Level Security (RLS) policies for data protection

## Step 2: Create Barber Users in Supabase Auth

Each barber needs a user account in Supabase Auth. Create them with these credentials:

### Using Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click **Add user** for each barber:

**Barber 1:**
- Email: `liel@ronamar.co.il`
- Password: (set a secure password)
- Click **Create user**

**Barber 2:**
- Email: `zivu@ronamar.co.il`
- Password: (set a secure password)

**Barber 3:**
- Email: `elad@ronamar.co.il`
- Password: (set a secure password)

**Barber 4:**
- Email: `nevo@ronamar.co.il`
- Password: (set a secure password)

**Barber 5 (Ron):**
- Email: `ron@ronamar.co.il`
- Password: (set a secure password)

### Copy User IDs:
After creating each user, you'll see their `User ID` (a UUID). You'll need these for the next step.

## Step 3: Insert Barbers into the Barbers Table

After creating users in Auth, insert them into the `barbers` table:

1. Go to **SQL Editor** → **New Query**
2. Copy and paste the following SQL (replacing the UUIDs with the actual ones from Step 2):

```sql
INSERT INTO barbers (id, name, base_price, bio) VALUES
('USER_ID_FOR_LIEL', 'ליאל בן יאיר', 80, 'ספר ראשי עם 10 שנות ניסיון'),
('USER_ID_FOR_ZIVU', 'זיו פוירמן', 60, 'מתמחה בעיצובים מודרניים'),
('USER_ID_FOR_ELAD', 'אלעד מזרחי', 60, 'מומחה בטיפול זקן'),
('USER_ID_FOR_NEVO', 'נבו ניזרי', 60, 'קצב תספורה מהיר ודיוק'),
('USER_ID_FOR_RON', 'רון עמר', 100, 'מייסד המספרה ומייסטר מקצועי');
```

3. Click **Run**

## Step 4: Test the Website

1. **Open** `index.html` in your browser
2. **Test Booking Flow:**
   - Click "הזמן תור עכשיו"
   - Select a barber
   - Select a service
   - Choose date and time
   - Enter your name and phone
   - Get the OTP code (it will be displayed in an alert for demo purposes)
   - Confirm the booking
   - Check Supabase dashboard → `appointments` table to see the new appointment

3. **Test Barber Dashboard:**
   - Click "יומן ספרים" (Booking Calendar)
   - Select any barber from the dropdown
   - Enter password: `1234` (for demo - change this in production)
   - You should see the appointments you just created

## Step 5: Production Improvements

### Security Setup:

1. **Update Barber Authentication:**
   - Replace mock authentication with real Supabase Auth
   - Uncomment the Supabase `signInWithPassword` code in `dashLogin()` function
   - Use the actual barber emails and passwords

2. **Set Environment Variables:**
   Create a `.env.local` file (don't commit to git):
   ```
   SUPABASE_URL=https://yaboiwxuhhfkbjmqgeet.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Update HTML:**
   Change the hardcoded keys in `index.html` to use environment variables (recommended for production)

### Enable Additional Supabase Features:

- **Realtime:** Enable on the `appointments` table for live updates
- **Storage:** Set up file storage for barber photos
- **Edge Functions:** Create functions for SMS notifications via Supabase Functions

## Important Notes

### Row Level Security (RLS)
- All tables have RLS enabled
- Barbers can only see/delete their own appointments
- Customers can see all services and barber info
- This is enforced at the database level, not just the application level

### API Keys
- `SUPABASE_ANON_KEY` (public) is safe to expose in the browser
- **NEVER** expose `SUPABASE_SERVICE_KEY` in client-side code
- For sensitive operations, use Supabase Edge Functions

### Database Constraints
- Appointments have a UNIQUE constraint: `(barber_id, appointment_date, appointment_time)` - prevents double-booking
- Phone numbers in customers table are unique

## Troubleshooting

### "Barber not found"
- Make sure you've inserted the barbers into the `barbers` table with the correct names

### "Service not found"
- Services are automatically inserted by the SQL schema
- Check the `services` table has all 8 services

### Dashboard shows no appointments
- Confirm you're logged in with the correct barber name
- Check that appointments exist for that barber in Supabase dashboard

### SMS not sending
- The SMS API (Infobip) requires CORS headers which browsers block
- For production, handle SMS sending on a backend server or use Supabase Edge Functions

## Next Steps

1. ✅ Database schema created
2. ✅ Barber users created in Auth
3. ✅ Barbers inserted into database
4. ✅ Website connected to Supabase
5. 🔄 Test everything thoroughly
6. 🔄 Set up proper authentication in production
7. 🔄 Add edge functions for SMS
8. 🔄 Deploy to production

## Questions?

Refer to:
- Supabase Documentation: https://supabase.com/docs
- SQL schema in `supabase-setup.sql`
- Inline code comments in `index.html`
