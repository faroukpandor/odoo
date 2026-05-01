# Quick Diagnostic Checklist - Blank Screen Fix (5 Minutes)

## DO THIS FIRST (90% Success Rate)

### 1. Check Environment Variables (Vercel Settings)
```
Location: Your Vercel Dashboard → Project Settings → Environment Variables

MUST HAVE:
✓ NEXT_PUBLIC_SUPABASE_URL = <your-supabase-url>
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY = <your-anon-key>

If missing:
→ Add them immediately
→ Redeploy (automatic after adding)
→ Wait 2 minutes for new build
```

### 2. Hard Refresh Browser
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R

Or:
1. Open DevTools (F12)
2. Right-click the Refresh button
3. Select "Empty cache and hard refresh"
4. Wait 10 seconds for page to fully load
```

### 3. Check Browser Console (F12)
```
Press F12 → Click "Console" tab

Look for RED errors (ignore yellow warnings):
- If you see errors, note them and research
- Common: "Cannot read property 'url'"
  → Solution: Missing environment variable
  
- If console is CLEAN (no red errors):
  → Page should be rendering
  → Check "Network" tab next
```

### 4. Check Vercel Deployment Status
```
Location: Vercel Dashboard → Deployments

Status should show: ✓ READY (green)

If showing "ERROR" or "BUILDING":
1. Wait for build to complete
2. Check build logs for errors
3. Fix any TypeScript/build errors
4. Redeploy
```

### 5. Test in New Browser/Incognito
```
If still blank in normal browser:
1. Open your app in Incognito/Private mode
2. Does it load?
   - YES: Clear browser cache (Step 2 above)
   - NO: Likely environment variable issue (Step 1 above)
```

---

## IF STILL BLANK AFTER STEPS ABOVE

### Check Network Tab
```
DevTools → Network tab:
- Reload page (F5)
- Check if files are loading
- Should see:
  ✓ index.html (200)
  ✓ CSS files (200)
  ✓ JS files (200)
  
If seeing 404s or failed requests:
→ Vercel build may have issues
→ Check build logs in Vercel
```

### Test Locally (Advanced)
```bash
# Clone and run locally
git clone <your-repo>
cd <project>
npm install

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=<url>" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>" >> .env.local

# Run
npm run dev

# Open http://localhost:3000
# If local works but preview doesn't:
→ Deploy again (environment variable sync issue)
```

---

## Decision Tree

```
Is page blank white?
├─ YES
│  └─ Can you see anything at all?
│     ├─ NO (pure white)
│     │  ├─ Check browser console for red errors
│     │  │  ├─ YES errors present
│     │  │  │  └─ Missing environment variables → ADD THEM
│     │  │  └─ NO errors
│     │  │     └─ Hard refresh → Clear cache → Redeploy
│     │  └─ YES (something visible)
│     │     ├─ Buttons/text visible but styled wrong
│     │     │  └─ CSS loading issue → Hard refresh
│     │     └─ Layout looks right but white
│     │        └─ JS error → Check console → Fix imports
│     └─ NO (page loads)
│        └─ Problem solved! App is working
└─ NO (page shows content)
   └─ Success! Your app is working
```

---

## Success Indicators

Your app is working correctly when:

✓ "Nexus ERP" header appears in top-left
✓ Navigation menu visible with Login/Get Started buttons
✓ Feature grid shows 6 feature cards with icons
✓ All text is readable with dark background
✓ Buttons are styled with gradients
✓ No red errors in browser console
✓ No layout shift or flickering
✓ Responsive design on mobile (try resizing window)

---

## Common Errors & Quick Fixes

| Error Message | Fix | Time |
|--------------|-----|------|
| "Cannot read properties of undefined" | Missing env var | 2 min |
| "Failed to fetch" | Missing ANON_KEY | 2 min |
| Page blank with console errors | Hard refresh | 1 min |
| CSS not applying (unstyled page) | Wait 30s, hard refresh | 1 min |
| Vercel build failed | Check build logs, fix errors | 5 min |
| Works locally, blank on Vercel | Redeploy after env var change | 3 min |

---

## Final Troubleshooting Command

```bash
# Run this to verify your setup locally
npm run build && npm run dev

# If this succeeds locally but fails on Vercel:
# 1. Verify all env vars in Vercel
# 2. Redeploy
# 3. Wait for new build (takes 2-5 minutes)
```

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **This app's docs**: Read `/BLANK_SCREEN_TECHNICAL_ANALYSIS.md`

---

**If you follow all 5 steps above and still see a blank screen, you likely have an environment variable issue. Double-check your Supabase credentials in Vercel Settings.**
