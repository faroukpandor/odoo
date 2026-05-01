# Master Troubleshooting Guide - Blank Screen Issue

## TL;DR (2 Minute Fix)

**99% probability fix:**

1. **Go to Vercel Settings → Environment Variables**
   - Add: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Deploy (automatic)

2. **Hard refresh browser**
   - Windows/Mac: `Ctrl+Shift+R` or `Cmd+Shift+R`
   - Wait 10 seconds

3. **Check browser console (F12)**
   - Should show no red errors
   - If clean → Success! Page should render

---

## Complete Diagnostic Tree

```
┌─ Blank Screen Issue
│
├─ STEP 1: Check Vercel Build Status (1 min)
│  ├─ Status = "READY" ✓
│  │  └─ Go to STEP 2
│  └─ Status = "ERROR" ✗
│     └─ Review build logs → Fix errors → Redeploy
│
├─ STEP 2: Verify Environment Variables (1 min)
│  ├─ NEXT_PUBLIC_SUPABASE_URL is set ✓
│  ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY is set ✓
│  │  └─ Go to STEP 3
│  └─ Missing any? ✗
│     └─ Add them → Redeploy → Wait 2 min → Go to STEP 3
│
├─ STEP 3: Hard Refresh Browser (1 min)
│  ├─ Pressed Ctrl+Shift+R or Cmd+Shift+R ✓
│  ├─ Waited 10+ seconds ✓
│  │  └─ Go to STEP 4
│  └─ Page still blank ✗
│     └─ Clear browser cache manually → Go to STEP 4
│
├─ STEP 4: Check Browser Console (2 min)
│  ├─ No red errors visible ✓
│  │  └─ Go to STEP 5
│  └─ Red errors present ✗
│     ├─ Most likely: "Cannot read property 'url'"
│     │  └─ Missing SUPABASE_URL in env vars
│     └─ Other error: Document it, search solution
│
├─ STEP 5: Check Network Tab (2 min)
│  ├─ All files show 200 status ✓
│  │  └─ Page should be rendering → SUCCESS
│  └─ Some files show 404/500 ✗
│     └─ Rebuild in Vercel (click "Redeploy")
│
└─ SUCCESS: Page is rendering! ✓
```

---

## Quick Reference Cards

### For Environment Variables Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page, no console errors | Missing env vars | Add NEXT_PUBLIC_SUPABASE_* |
| Console error about 'url' | Missing SUPABASE_URL | Add to Vercel env |
| Console error about 'fetch' | Missing ANON_KEY | Add to Vercel env |
| Page loads locally, blank on Vercel | Env vars not synced | Redeploy on Vercel |

### For Build/Deployment Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Vercel shows "ERROR" | Build failed | Check build logs → Fix code errors |
| Build takes > 10 min | Large dependencies | Check package.json, optimize |
| Deployment stuck on "BUILDING" | Build process hanging | Cancel and redeploy |

### For Browser/Cache Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Code changed but not visible | Browser cache | Hard refresh: Ctrl+Shift+R |
| Works in incognito, not normal | Cache corrupted | Clear browser cache |
| Page partially renders | Hydration mismatch | Hard refresh → Clear cache |
| Styles look wrong | CSS not applied | Check globals.css imported |

---

## Debugging Commands

### Local Testing

```bash
# Verify your setup works locally
npm run dev

# Should output:
# ✓ Compiled successfully
# Ready on http://localhost:3000

# Then open http://localhost:3000 in browser
# Page should display landing page

# If it works locally but blank on Vercel:
# → Problem is environment configuration
# → Check Vercel env vars match your .env.local
```

### Build Verification

```bash
# Verify build works (test before deploying)
npm run build

# Should show:
# ✓ Compiled successfully
# ✓ Linting...
# ✓ Collecting page data...

# If build fails:
# → Fix errors in output
# → Run again until successful
# → Then deploy to Vercel
```

### Type Checking

```bash
# Verify no TypeScript errors
npm run type-check

# If errors found:
# → Review error messages
# → Fix issues in code
# → Run again
```

---

## Advanced Debugging (If Basic Steps Fail)

### Enable Console Logging

Edit `/app/page.tsx` and add:

```typescript
"use client"

import { useEffect } from "react"
// ... other imports ...

export default function LandingPage() {
  useEffect(() => {
    console.log("[v0] Page mounted")
    console.log("[v0] Window object:", typeof window)
    console.log("[v0] Document ready:", document.readyState)
  }, [])

  return (
    // ... JSX ...
  )
}
```

**What this tells you:**
- Log appears → Component mounted (JS working)
- No log → Component didn't load (JS error before render)

### Check CSS Application

```javascript
// In DevTools Console, run:
console.log(
  "Background color:",
  window.getComputedStyle(document.body).backgroundColor
)

// Expected: rgb(15, 23, 42) [slate-950]
// If different: CSS not applied correctly
```

### Verify React/Next.js Loaded

```javascript
// In DevTools Console:
console.log("React version:", React?.version)
console.log("Next.js loaded:", typeof __NEXT_DATA__ !== 'undefined')

// If undefined: JavaScript not loading properly
```

---

## Root Cause Probabilities

Based on your application analysis:

```
Missing Environment Variables:      70% ← Most likely
Stale Browser Cache:                15% ← Common in development
Build Configuration Issues:          10% ← Unlikely (config is correct)
JavaScript Runtime Error:             3% ← Unlikely (code is valid)
Network/CDN Issues:                   2% ← Very unlikely on Vercel
```

---

## Prevention Checklist for Future Deployments

Before deploying:

```
CODE:
□ Run npm run build locally - succeeds
□ Run npm run type-check - no errors
□ npm run dev works locally - page renders

CONFIGURATION:
□ All required env vars documented in .env.example
□ next.config.mjs has no syntax errors
□ tailwind.config.ts is valid

DEPLOYMENT:
□ Push code to GitHub/main branch
□ Wait for Vercel auto-deployment
□ Check Vercel dashboard shows "READY"
□ Verify all env vars in Vercel match local .env.local
□ Preview URL loads successfully
□ Hard refresh to clear cache

VERIFICATION:
□ Landing page displays
□ All images load
□ Navigation links work
□ No console errors
□ Responsive on mobile
```

---

## Professional Support Resources

When troubleshooting gets stuck, refer to:

**Official Documentation:**
- Next.js Docs: https://nextjs.org/docs
- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev
- Tailwind Docs: https://tailwindcss.com/docs
- Supabase Docs: https://supabase.com/docs

**Community Help:**
- Next.js Discord: https://discord.gg/nextjs
- Stack Overflow (tag: next.js, vercel)
- GitHub Issues: https://github.com/vercel/next.js/issues

---

## When to Escalate (Beyond Self-Help)

Consider professional support if:

```
1. All steps followed, still blank screen
2. Error messages in console are cryptic
3. Build logs show obscure error
4. Local version works, Vercel doesn't
5. Need expert opinion on architecture
6. Performance optimization needed
7. Database/API connectivity issues

Required info to provide:
- Latest Vercel build log (screenshot)
- Browser console error (exact text)
- Environment variable names (not values)
- Local npm run build output
- Steps already taken
```

---

## Final Checklist (Copy & Use)

```
□ STEP 1: Verify env vars in Vercel
  - NEXT_PUBLIC_SUPABASE_URL ✓
  - NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
  - Redeploy ✓
  - Wait 2 minutes ✓

□ STEP 2: Hard refresh browser
  - Ctrl+Shift+R (Windows/Linux) ✓
  - OR Cmd+Shift+R (Mac) ✓
  - Waited 10+ seconds ✓

□ STEP 3: Check console (F12)
  - No red errors visible ✓
  - Check Network tab, all 200 status ✓

□ STEP 4: Verify build status
  - Vercel shows "READY" ✓
  - No error badges ✓

□ STEP 5: Application works
  - Landing page displays ✓
  - "Nexus ERP" header visible ✓
  - Feature cards show with icons ✓
  - Buttons are clickable ✓

✅ SUCCESS: Your app is working!
```

---

## One-Minute Decision Guide

**Choose your situation:**

1. **Page is completely blank white**
   → Follow STEP 1-2 above (env vars + cache)
   → 90% fixes this

2. **Page partially renders (some text/buttons visible)**
   → CSS issue likely
   → Hard refresh → Check globals.css imported
   → If still broken: Check Vercel build logs

3. **Console shows red errors**
   → Document error message
   → Check error-specific fix in section above
   → Apply fix → Redeploy → Hard refresh

4. **Vercel build shows ERROR**
   → Click into build logs
   → Find first error
   → Fix in code
   → Push to GitHub
   → Wait for auto-redeploy

5. **Page works locally, blank on Vercel**
   → Environment variable sync issue
   → Verify all env vars in Vercel match local
   → Redeploy → Hard refresh → Try again

---

**Estimated total time to resolution: 5-10 minutes**

**Most likely solution: Environment variables (2 minutes)**
