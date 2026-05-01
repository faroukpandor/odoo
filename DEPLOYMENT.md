# Nexus ERP - Deployment Guide

## Overview
Nexus is a modern, serverless ERP system built on Vercel, Next.js, and Supabase. It's production-ready and scales automatically.

## Prerequisites
- Vercel account (free tier works)
- Supabase project (free tier included)
- GitHub repository
- Node.js 18+ locally

## Step 1: Local Setup

### Install Dependencies
\`\`\`bash
npm install
# or
yarn install
\`\`\`

### Environment Variables
Create a `.env.local` file with:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
XAI_API_KEY=your_xai_api_key  # Optional, for AI features
\`\`\`

### Run Database Migrations
\`\`\`bash
# Execute these in Supabase SQL editor or via CLI
psql -d your_supabase_db < scripts/001_create_erp_schema.sql
psql -d your_supabase_db < scripts/002_create_profiles_trigger.sql
psql -d your_supabase_db < scripts/003_seed_sample_data.sql
\`\`\`

### Start Development Server
\`\`\`bash
npm run dev
# Visit http://localhost:3000
\`\`\`

## Step 2: Deploy to Vercel

### 1. Push to GitHub
\`\`\`bash
git add .
git commit -m "Initial ERP system"
git push origin main
\`\`\`

### 2. Connect to Vercel
1. Visit [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select "Next.js" framework preset

### 3. Add Environment Variables
In Vercel dashboard:
- Go to Settings → Environment Variables
- Add all variables from your `.env.local`
- For production, use your actual Supabase credentials

### 4. Deploy
Click "Deploy" - Vercel will automatically build and deploy

## Step 3: Post-Deployment

### 1. Update Supabase Redirect URL
In Supabase → Authentication → URL Configuration:
\`\`\`
Site URL: https://your-project.vercel.app
Redirect URLs: https://your-project.vercel.app/auth/callback
\`\`\`

### 2. Run Production Migrations
Execute migration scripts in Supabase SQL editor

### 3. Set Up Custom Domain (Optional)
In Vercel → Domains → Add domain

## Security Checklist

- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Set environment variables in production
- [ ] Configure Supabase backup
- [ ] Enable Vercel deployment protection
- [ ] Set up monitoring and error tracking
- [ ] Review Supabase security rules

## Scaling

### Free Tier Limits
- Vercel: 100GB bandwidth/month
- Supabase: 500MB database, 2GB bandwidth
- Sufficient for startups and small teams

### Upgrade When Needed
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Auto-scales with usage

## Monitoring

### Key Metrics to Track
- API response times
- Database query performance
- Error rates
- User growth

### Tools
- Vercel Analytics (built-in)
- Supabase Studio (built-in)
- Vercel Logs

## Backup & Recovery

### Automated Backups
Supabase provides daily backups on paid plans.

### Manual Backup
\`\`\`bash
# Export data as JSON
psql -d your_db -c "SELECT * FROM table_name" > backup.sql
\`\`\`

## Troubleshooting

### "Not authenticated" errors
- Check Supabase auth configuration
- Verify environment variables
- Check RLS policies

### Database connection errors
- Verify DATABASE_URL in Vercel
- Check Supabase connection pool settings
- Review Supabase logs

### Performance issues
- Enable query optimization in Supabase
- Check database query logs
- Review Vercel deployment logs

## Support
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
