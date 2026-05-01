# Getting Started with Nexus ERP

Welcome to **Nexus** - the revolutionary ERP system that disrupts enterprise software.

## What You Have

A fully functional, production-ready multi-tenant ERP system featuring:

✅ **Authentication & Security**
- Multi-tenant architecture with RLS
- Supabase Auth integration
- Email verification
- Secure session management

✅ **Core Modules**
- Dashboard with real-time analytics
- CRM for customer management
- Sales & invoicing system
- Inventory management with alerts
- Accounting & financial tracking
- HR & payroll management
- Advanced analytics with forecasting

✅ **AI Integration**
- AI-powered insights & recommendations
- Grok/OpenAI integration via Vercel AI SDK
- Predictive analytics
- Smart business recommendations

✅ **Modern Tech Stack**
- Next.js 15 with App Router
- React 19
- PostgreSQL with Supabase
- Recharts for visualizations
- shadcn/ui components
- Tailwind CSS

## First Steps

### 1. Setup Your Organization

Create your first organization:
\`\`\`bash
1. Sign up at http://localhost:3000/auth/sign-up
2. Verify your email
3. Create your company profile in Settings
4. Add your company details (name, address, tax ID)
\`\`\`

### 2. Add Your Data

- **CRM**: Add customers in the Sales module
- **Inventory**: Create inventory items in Inventory module
- **HR**: Add employees in HR module
- **Accounting**: Record transactions in Accounting module

### 3. Generate AI Insights

Click "Generate AI Report" on the dashboard to get:
- Performance analysis
- Growth opportunities
- 30-day revenue forecasts
- Actionable recommendations

## Key Features to Explore

### Dashboard
- Real-time KPI cards showing revenue, customers, inventory, orders
- Interactive revenue and order charts
- AI-powered insights panel
- Trend indicators

### CRM
- Customer database with lifecycle value
- Status tracking (active/inactive)
- Search and filter capabilities

### Sales Module
- Invoice management
- Payment status tracking (paid, pending, overdue)
- Revenue analytics

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Reorder level management
- Stock movement history

### Accounting
- Transaction ledger
- Income/expense tracking
- Financial summaries
- Profit calculations

### Analytics
- Advanced visualizations
- Revenue vs target analysis
- Customer acquisition trends
- Sales mix by category
- AI-powered forecasting

## API Integration

### AI Insights Endpoint

\`\`\`bash
curl -X POST http://localhost:3000/api/ai/insights \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": {
      "revenue": 124500,
      "customers": 2341,
      "orders": 84,
      "inventory": 1234
    },
    "businessData": {
      "industry": "Technology",
      "region": "Global"
    }
  }'
\`\`\`

## Database

All data is stored in Supabase PostgreSQL with:
- Row-Level Security (RLS) for multi-tenant isolation
- Automatic profile creation on signup
- Transaction logging
- Real-time sync capabilities

## Deployment

### Deploy to Vercel

\`\`\`bash
# 1. Push to GitHub
git add .
git commit -m "Ready for production"
git push origin main

# 2. Connect to Vercel
# Go to https://vercel.com/new
# Import your repository
# Add environment variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - XAI_API_KEY

# 3. Deploy!
vercel deploy --prod
\`\`\`

### Run Database Migrations

In Supabase dashboard:
1. Go to SQL Editor
2. Run each migration script in order:
   - `001_create_erp_schema.sql`
   - `002_create_profiles_trigger.sql`
   - `003_seed_sample_data.sql` (optional - for demo data)

## Environment Variables Required

\`\`\`
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
POSTGRES_URL=

# AI (optional - uses Vercel AI Gateway by default)
XAI_API_KEY=

# Optional - for email redirects
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

## Customization

### Add New Modules

1. Create new files in `app/dashboard/{module}/page.tsx`
2. Add navigation item in `app/dashboard/layout.tsx`
3. Create database tables in new migration script

### Modify Design

- Global styles: `app/globals.css`
- Theme tokens: Edit CSS variables in globals.css
- Components: Use shadcn/ui components or create custom ones

### Add More AI Insights

Edit `/app/api/ai/insights/route.ts` to customize prompts and insights generation.

## Support & Resources

- **Documentation**: Check README.md
- **Database Schema**: scripts/001_create_erp_schema.sql
- **Examples**: Check individual module pages
- **Troubleshooting**: See app/auth/login and app/dashboard/page.tsx examples

## Next Steps

1. ✅ Setup your organization
2. ✅ Add sample data
3. ✅ Explore AI insights
4. ✅ Customize branding
5. ✅ Add team members
6. ✅ Deploy to production

---

**Ready to revolutionize your enterprise?**

Start with the Dashboard to see your business metrics in real-time!
