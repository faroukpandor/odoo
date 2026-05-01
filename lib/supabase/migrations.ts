import { createClient } from "@supabase/supabase-js"

const MIGRATIONS = [
  {
    id: "001",
    name: "Create ERP Schema",
    sql: `
      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        currency TEXT DEFAULT 'USD',
        timezone TEXT DEFAULT 'UTC',
        logo_url TEXT,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view their organizations" ON organizations
        FOR SELECT USING (owner_id = auth.uid() OR id IN (
          SELECT org_id FROM organization_members WHERE user_id = auth.uid()
        ));

      -- Profiles table
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        avatar_url TEXT,
        default_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view their own profile" ON profiles
        FOR SELECT USING (id = auth.uid());

      -- Organization members table
      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      );

      ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Members can view organization members" ON organization_members
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        status TEXT DEFAULT 'active',
        lifetime_value DECIMAL(12, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view organization customers" ON customers
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Invoices table
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number TEXT UNIQUE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        status TEXT DEFAULT 'draft',
        due_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view organization invoices" ON invoices
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Inventory table
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        unit_cost DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view organization inventory" ON inventory
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Employees table
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        department TEXT,
        position TEXT,
        salary DECIMAL(12, 2),
        hire_date DATE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view organization employees" ON employees
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT,
        transaction_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view organization transactions" ON transactions
        FOR SELECT USING (org_id IN (
          SELECT id FROM organizations WHERE owner_id = auth.uid() OR id IN (
            SELECT org_id FROM organization_members WHERE user_id = auth.uid()
          )
        ));

      -- Create indexes for performance
      CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
      CREATE INDEX idx_customers_org_id ON customers(org_id);
      CREATE INDEX idx_invoices_org_id ON invoices(org_id);
      CREATE INDEX idx_inventory_org_id ON inventory(org_id);
      CREATE INDEX idx_employees_org_id ON employees(org_id);
      CREATE INDEX idx_transactions_org_id ON transactions(org_id);
    `,
  },
]

export async function runMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  const client = createClient(supabaseUrl, supabaseServiceKey)

  const results = []
  for (const migration of MIGRATIONS) {
    try {
      const { error } = await client.rpc("exec", { sql: migration.sql })

      if (error) throw error

      results.push({
        id: migration.id,
        name: migration.name,
        status: "success",
      })
    } catch (error) {
      results.push({
        id: migration.id,
        name: migration.name,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}

export async function checkDatabaseHealth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { healthy: false, tables: [] }
  }

  const client = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data, error } = await client.from("organizations").select("id").limit(1)

    if (error) {
      return { healthy: false, tables: [], error: error.message }
    }

    return {
      healthy: true,
      tables: ["organizations", "profiles", "customers", "invoices", "inventory", "employees", "transactions"],
      timestamp: new Date().toISOString(),
    }
  } catch {
    return { healthy: false, tables: [], error: "Database check failed" }
  }
}
