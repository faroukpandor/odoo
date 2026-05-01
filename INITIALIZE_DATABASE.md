# Database Initialization Guide

## Overview
This guide walks through initializing the Nexus ERP database in Supabase. The entire setup takes 5-10 minutes.

## Prerequisites
- Supabase project created
- Access to Supabase dashboard
- Environment variables configured (.env.local)

## Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run Migration 1 - Create ERP Schema

Copy the entire contents of `/scripts/001_create_erp_schema.sql` into the SQL Editor:

**What it creates:**
- `organizations` table (multi-tenant support)
- `company_settings` table
- `employees` table
- `customers` table
- `suppliers` table
- `inventory_items` table
- `stock_movements` table
- `invoices` table
- `purchase_orders` table
- `payroll` table

**Security:**
- Row Level Security (RLS) policies enabled
- Multi-tenant isolation enforced
- Admin bypass for system operations

Click **Run** (Ctrl+Enter)

Expected output: `Success. No rows returned`

## Step 3: Run Migration 2 - Create Profiles & Trigger

Copy the entire contents of `/scripts/002_create_profiles_trigger.sql` into a new SQL query:

**What it creates:**
- `profiles` table (user profile information)
- `auth.users → profiles` trigger
- Auto-profile creation on user signup

Click **Run**

Expected output: `Success. No rows returned`

## Step 4: Run Migration 3 - Seed Sample Data

Copy the entire contents of `/scripts/003_seed_sample_data.sql` into a new SQL query:

**What it does:**
- Creates sample organizations
- Creates demo users
- Creates sample customers, invoices, and inventory
- Provides test data for all features

Click **Run**

Expected output: `Success. X rows affected`

## Step 5: Run Migration 4 - Add Collaboration Tables

Copy the entire contents of `/scripts/004_add_collaboration_tables.sql` into a new SQL query:

**What it creates:**
- `activity_log` table for audit trails
- `presence` table for real-time collaboration
- `user_sessions` table for activity tracking

Click **Run**

Expected output: `Success. No rows returned`

## Step 6: Enable Row Level Security (RLS)

Go to **Authentication** → **Policies** and verify RLS is enabled on all tables:

Enable RLS for each table:
1. Click each table name
2. Toggle "Enable RLS"
3. Ensure policies are created (they should be from the migrations)

## Step 7: Verify Database Structure

Run this verification query:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables (11 total):
- activity_log
- company_settings
- customers
- employees
- inventory_items
- invoices
- organizations
- payroll
- presence
- profiles
- purchase_orders
- stock_movements
- suppliers
- user_sessions

## Step 8: Test Connection from Application

Run the app locally:

```bash
npm run dev
```

1. Go to http://localhost:3000
2. Sign up with a test account
3. Check Supabase dashboard - new user and profile should be created
4. Go to `/auth/setup`
5. Click "Initialize Database"
6. Verify success message appears

## Step 9: Test Basic Operations

1. **Create a Customer**: Go to Dashboard → CRM → Add Customer
2. **Create an Invoice**: Go to Dashboard → Sales → Add Invoice
3. **Check Inventory**: Go to Dashboard → Inventory
4. **View Analytics**: Go to Dashboard → Analytics

All operations should work without errors.

## Step 10: Backup & Enable Automated Backups

In Supabase Dashboard:

1. Go to **Settings** → **Backups**
2. Enable **Automated Backups** (daily)
3. Note backup retention settings

## Troubleshooting

### Error: "permission denied for schema public"
- Your user doesn't have proper permissions
- Solution: Use Service Role key for initial setup, then switch to Anon key for app

### Error: "relation already exists"
- Tables from a previous run exist
- Solution: Drop old tables first (migrations include DROP IF EXISTS)

### App can't connect to database
- Verify all environment variables are set correctly
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify RLS policies allow anon user access

## Success Criteria

Database is fully initialized when:
- ✅ All 14 tables exist
- ✅ RLS policies are in place
- ✅ Sample data is populated
- ✅ App can sign up and create organizations
- ✅ Basic CRUD operations work
- ✅ Real-time sync works (users see data updates)

## Next Steps

After database initialization:
1. Run `npm run test` to verify API endpoints
2. Deploy to Vercel with `vercel deploy`
3. Set production environment variables
4. Run security checklist from SECURITY_CHECKLIST.md
5. Enable monitoring from PERFORMANCE_OPTIMIZATION.md

## Estimated Time
- Manual setup: 5-10 minutes
- Automated via app UI: 2-3 minutes
- Verification: 2-3 minutes
- **Total: 10-15 minutes**
