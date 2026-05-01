# Setting Up Your Nexus ERP Database in Supabase

Your Nexus ERP system requires 3 database migrations to be run in Supabase. Follow either the **Manual Method** or **Automated Method** below.

## Option 1: Automated Setup (Recommended) ⚡

The easiest way to run all migrations at once:

### Steps:
1. Go to your [v0 project settings](https://v0.app) → **Vars** section
2. Confirm your Supabase credentials are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click the **Scripts** folder in your project
4. Run the setup script: `node scripts/run-migrations.js`
5. Wait for all 3 migrations to complete
6. Done! Your database is ready.

---

## Option 2: Manual Setup via Supabase Dashboard

If you prefer to run migrations manually:

### Step 1: Access Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run Migration 1 - Create ERP Schema
1. Copy the entire content from `scripts/001_create_erp_schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
4. Wait for success message (should say "No rows returned")
5. You should see all 11 tables created in the **Database** tab on the left

**What this creates:**
- 11 database tables for all ERP modules
- Row Level Security (RLS) policies for multi-tenant isolation
- Helper functions for org membership checking

### Step 3: Run Migration 2 - Create User Profiles & Triggers
1. Click **New Query** again
2. Copy the entire content from `scripts/002_create_profiles_trigger.sql`
3. Paste it into the SQL Editor
4. Click **Run**
5. Wait for success message

**What this creates:**
- `profiles` table for user management
- Automatic profile creation trigger on user signup
- Security policies for profile access

### Step 4: Run Migration 3 - Seed Sample Data (Optional)
1. Click **New Query** again
2. Copy the entire content from `scripts/003_seed_sample_data.sql`
3. Paste it into the SQL Editor
4. **IMPORTANT:** Before running, you must have a user account in Supabase auth with email `user@example.com`
   - Create one in the **Authentication** tab → **Users** → **Add User**
   - Use any temporary password
5. Click **Run**
6. You should see "2 rows inserted" or similar messages

**What this creates:**
- Sample organization ("My Company")
- Sample company settings
- Sample employees, customers, and inventory

---

## Verify Your Setup

After running all 3 migrations, verify everything worked:

### Check Tables Were Created
1. Go to Supabase Dashboard
2. Click **Table Editor** in the left sidebar
3. You should see these 11 tables:
   - ✅ organizations
   - ✅ company_settings
   - ✅ employees
   - ✅ customers
   - ✅ suppliers
   - ✅ inventory_items
   - ✅ stock_movements
   - ✅ invoices
   - ✅ purchase_orders
   - ✅ payroll
   - ✅ profiles

### Check RLS Policies Are Active
1. Click any table (e.g., `customers`)
2. Click the **RLS** button at the top right
3. You should see RLS is **enabled** with green checkmark
4. Click on table name → **Policies** to see the RLS rules

### Verify Sample Data (if you seeded it)
1. Go to **Table Editor** → `organizations`
2. You should see "My Company" row
3. Go to **Table Editor** → `customers`
4. You should see "Acme Corporation" row

---

## Troubleshooting

### Error: "relation 'auth.users' does not exist"
- This is normal - Supabase automatically creates this table
- If it persists, ensure you're on a Supabase project with auth enabled

### Error: "permission denied for schema public"
- Your service role key may not have permissions
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in your environment variables

### Error: "duplicate key value violates unique constraint"
- You've already run this migration
- To reset: click **New Query** and run `DROP SCHEMA public CASCADE;` (this deletes everything)
- Then re-run all 3 migrations

### Error: "user@example.com does not exist"
- You skipped creating the test user for seed data
- Either create it in Supabase Auth or skip the seed migration for now

---

## Next Steps After Setup

1. **Sign up** at your deployed Nexus ERP app
2. **Complete the onboarding wizard** to set up your organization
3. **Invite team members** from settings
4. **Start entering data** in CRM, Sales, Inventory, etc.

---

## FAQ

**Q: Can I run migrations multiple times?**  
A: Migration 1 drops tables first, so it's safe. Migrations 2 & 3 use `CREATE IF NOT EXISTS` so they're idempotent.

**Q: What if I don't want sample data?**  
A: Skip Migration 3 and manually create data through the app interface.

**Q: Are my migrations backed up?**  
A: Yes! Supabase automatically backs up your database daily. Check Backups in the Supabase dashboard.

**Q: Can I modify the schema after setup?**  
A: Yes! You can add columns, tables, or RLS policies anytime via the SQL Editor.

---

## Security Notes

- All tables have Row Level Security enabled
- Users can only see data from their organization
- Service role key is required for setup (used server-side only)
- Never expose your service role key in client-side code

Happy building! 🚀
