// Automated migration runner for Supabase
// Usage: node scripts/run-migrations.js

const fs = require("fs")
const path = require("path")

const { createClient } = require("@supabase/supabase-js")

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: Missing environment variables")
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  console.error("   Set these in your v0 project Vars section")
  process.exit(1)
}

console.log("🚀 Nexus ERP - Database Setup")
console.log("================================\n")

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Migration files
const migrations = [
  {
    name: "Create ERP Schema",
    file: "001_create_erp_schema.sql",
    description: "Creates 11 core tables and RLS policies",
  },
  {
    name: "Create User Profiles & Triggers",
    file: "002_create_profiles_trigger.sql",
    description: "Sets up user profiles and auto-creation on signup",
  },
  {
    name: "Seed Sample Data",
    file: "003_seed_sample_data.sql",
    description: "Inserts sample data for testing (optional)",
  },
]

async function runMigrations() {
  let completedCount = 0

  for (const migration of migrations) {
    try {
      console.log(`\n📋 Running: ${migration.name}`)
      console.log(`   ${migration.description}`)

      // Read SQL file
      const sqlPath = path.join(__dirname, migration.file)
      if (!fs.existsSync(sqlPath)) {
        console.warn(`   ⚠️  File not found: ${migration.file}`)
        continue
      }

      const sql = fs.readFileSync(sqlPath, "utf-8")

      // Execute SQL
      const { error } = await supabase.rpc("query", { query: sql })

      if (error) {
        if (error.message.includes("does not exist")) {
          console.log(`   ⚠️  Skipping (schema already exists)`)
        } else {
          console.error(`   ❌ Error: ${error.message}`)
          continue
        }
      } else {
        console.log(`   ✅ Success`)
        completedCount++
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
    }
  }

  console.log("\n================================")
  console.log(`✅ Setup Complete: ${completedCount}/${migrations.length} migrations`)
  console.log("\nNext steps:")
  console.log("1. Check Supabase dashboard to verify tables")
  console.log("2. Deploy your app: npm run build && npm run start")
  console.log("3. Sign up and test your Nexus ERP system\n")
}

// Run migrations
runMigrations().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
