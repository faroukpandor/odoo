# Nexus ERP - Complete Setup Guide

## One-Click Database Setup (Recommended)

This is the easiest method - everything happens automatically in the app UI.

### Steps:

1. **Sign Up** - Go to your app and create an account
2. **Setup Page** - You'll be automatically redirected to `/auth/setup`
3. **Click Initialize** - Click the "Initialize Database" button
4. **Wait** - The system will create all 7 ERP tables with Row Level Security automatically
5. **Done** - You're ready to use Nexus ERP

That's it! No terminal, no SQL, no manual steps.

---

## Alternative: Manual Database Setup (Advanced)

If you prefer to run migrations manually or troubleshoot:

### Via Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the full SQL from `/scripts/001_create_erp_schema.sql`
5. Click **Run**
6. Wait for success notification
7. Repeat for remaining migrations

### Via Command Line:

\`\`\`bash
# Install dependencies if needed
npm install

# Run the automated migration script
node scripts/run-migrations.js
\`\`\`

---

## Database Structure

After setup, you'll have these tables:

- **organizations** - Company/tenant data with RLS isolation
- **profiles** - User profiles linked to organizations
- **organization_members** - User membership and roles
- **customers** - Client/customer database
- **invoices** - Sales invoices and payment tracking
- **inventory** - Product stock and inventory management
- **employees** - Team member and payroll data
- **transactions** - Financial transactions and ledger

All tables are protected with Row Level Security (RLS), meaning users can only see data from their organization.

---

## Verification

To verify your setup is complete:

1. Open your app dashboard
2. Go to Settings → Database Status
3. You should see "All systems operational"

If something fails:

1. Check that all environment variables are set in Vercel
2. Verify Supabase project is active
3. Try the setup again
4. Check browser console for error messages

---

## What's Next

Once setup is complete:

1. **Create Organization** - Set up your first organization
2. **Add Employees** - Import your team
3. **Add Customers** - Start managing customers
4. **Create Invoices** - Issue first invoice
5. **Import Inventory** - Add your products
6. **Configure Settings** - Customize currency, timezone, etc.

---

## Need Help?

If setup fails:

1. Make sure you have the **Supabase integration connected** in v0
2. Verify environment variables are loaded (check Vars in the sidebar)
3. Check Supabase is running in your project
4. Try running setup again - it's safe to run multiple times

For advanced issues, check the browser console for detailed error messages.
