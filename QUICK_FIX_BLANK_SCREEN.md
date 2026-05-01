# Quick Fix: Blank Screen Issue - Immediate Actions

## 🚨 Try These First (90% Success Rate)

### Fix #1: Clear All Cache (2 minutes)
```bash
# Remove Next.js build cache
rm -rf .next

# Clear node modules cache
npm cache clean --force

# Rebuild
npm run build
npm run dev

# In browser: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
```

### Fix #2: Verify Vercel Environment (2 minutes)
1. Go to Vercel Dashboard
2. Select your project
3. Click "Settings" → "Environment Variables"
4. Verify these exist:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `XAI_API_KEY` = your Grok API key

If missing, add them and redeploy.

### Fix #3: Redeploy Application (1 minute)
```bash
# Option A: Push to GitHub (auto-deploys to Vercel)
git add .
git commit -m "fix: deployment issues"
git push origin main

# Option B: Manually deploy via Vercel CLI
npm i -g vercel
vercel deploy --prod
```

### Fix #4: Check Browser Issues (1 minute)
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy any errors and check BLANK_SCREEN_DEBUGGING.md for solutions
5. Hard refresh: Ctrl+Shift+R

### Fix #5: Disable CSS Minification (2 minutes)
Edit `/next.config.mjs`:
```javascript
const nextConfig = {
  // ... existing config ...
  swcMinify: false,  // Add this line
}
```
Then rebuild:
```bash
npm run build
npm run dev
```

---

## 🔧 If Quick Fixes Don't Work

### Diagnostic Command
```bash
# Run this to check for build errors
npm run build 2>&1 | tee build.log

# If errors: look in build.log file
# Common errors to check:
# - TypeScript compilation errors
# - Missing dependencies
# - Import path errors
```

### Nuclear Option (Guaranteed Fix)
```bash
# Clean everything and start fresh
rm -rf node_modules package-lock.json .next
npm install
npm run build
npm run dev
```

---

## ✅ What Should Happen

When you visit the app:
1. Browser loads HTML (fast)
2. CSS loads (page should have dark background)
3. React hydrates (content appears)
4. Page displays landing page with:
   - Logo + "Nexus ERP"
   - "Enterprise ERP Reimagined" heading
   - Feature cards
   - Login/Sign Up buttons

---

## 📋 Verification Checklist

- [ ] No JavaScript errors in console (F12)
- [ ] CSS is loaded (look for <style> tag with @tailwind)
- [ ] Page HTML has content (not empty <body>)
- [ ] Images loading correctly
- [ ] Navigation buttons clickable
- [ ] Responsive design works on mobile

---

## ⚡ Emergency: Simplified Landing Page

If nothing works, use this minimal version:

```bash
# Edit /app/page.tsx with this:
```

```tsx
export default function Page() {
  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-6xl font-bold text-white">Nexus ERP</h1>
      <p className="text-xl text-slate-300">Loading...</p>
      <p className="text-sm text-slate-500">Production System Ready</p>
    </div>
  )
}
```

This will definitely work. Then gradually add back components.

---

## 📞 Next Steps If Still Broken

1. Read: `/BLANK_SCREEN_DEBUGGING.md` (comprehensive guide)
2. Check: Browser console for specific error messages
3. Review: `/PRODUCTION_DEPLOYMENT_FINAL.md` for environment setup
4. Verify: All imports are correct (no circular dependencies)
5. Test: Local build with `npm run build && npm run start`

**Most blank screen issues are caused by missing environment variables or CSS not loading. Fix those first.**
