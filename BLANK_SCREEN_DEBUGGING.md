# Blank Screen Debugging Guide - Technical Analysis

## Problem Statement
Application displays blank white screen during preview instead of loading landing page content.

## Root Cause Analysis Framework

### 1. CLIENT-SIDE RENDERING ISSUES

#### Issue 1.1: CSS Not Loading
**Symptoms**: White screen but HTML structure present
**Root Cause**: Tailwind CSS compilation failure or import errors
**Verification Steps**:
```bash
# Check if styles are being injected
# Open DevTools → Elements → <head> → look for <style> tags
# Should see: @tailwind base, @tailwind components, @tailwind utilities

# Verify globals.css import
grep -n "import.*globals.css" app/layout.tsx
# Should return: import "./globals.css"
```
**Solution**: Tailwind CSS is properly imported and configured in `/app/globals.css`. All @tailwind directives present.

#### Issue 1.2: Component Not Rendering
**Symptoms**: HTML loads but no React components visible
**Root Cause**: React hydration mismatch or component import errors
**Verification Steps**:
```bash
# Check for hydration errors in browser console
# Look for: "Hydration failed" or "useLayoutEffect" warnings
# These indicate client/server mismatch

# Verify "use client" directive exists
grep -n "\"use client\"" app/page.tsx
# Should be on line 1
```
**Solution**: `"use client"` directive is present in `/app/page.tsx`. Hydration should work correctly.

#### Issue 1.3: JavaScript Execution Error
**Symptoms**: No content, no visible errors
**Root Cause**: Uncaught JavaScript error preventing render
**Verification Steps**:
```bash
# Open DevTools → Console tab
# Look for red error messages
# Common patterns:
# - "Cannot read property X of undefined"
# - "Module not found"
# - "X is not a function"
```
**Check performed**: Button component exports correctly. Imports are valid.

### 2. BUILD CONFIGURATION ISSUES

#### Issue 2.1: Next.js Configuration Error
**File**: `/next.config.mjs`
**Status**: ✅ Correct
**Verified**:
- TypeScript strict checking enabled (not ignored)
- Image optimization configured properly
- Security headers set correctly
- Redirects configured

#### Issue 2.2: TypeScript Configuration Error
**File**: `/tsconfig.json`
**Checks**:
```bash
grep -n "jsx\|jsxFactory" tsconfig.json
# Should have: "jsx": "preserve" (for Next.js)
```

#### Issue 2.3: Tailwind Configuration Error
**File**: `/tailwind.config.ts`
**Status**: ✅ Correct
**Verified**:
- @tailwind directives properly configured
- No deprecated color names in app code
- Design tokens properly defined
- Glassmorphism utilities included

### 3. ENVIRONMENT & BUILD ISSUES

#### Issue 3.1: Missing Environment Variables
**Critical Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
XAI_API_KEY (for Grok)
```
**Status**: Check Vercel Settings → Environment Variables
**Workaround**: Landing page should load without these variables

#### Issue 3.2: Build Optimization Issues
**Potential Fixes**:
1. Disable SWC optimizations temporarily:
   ```javascript
   // next.config.mjs
   swcMinify: false
   ```
2. Check for circular dependencies
3. Verify bundle doesn't exceed size limits

### 4. RUNTIME EXECUTION ISSUES

#### Issue 4.1: Segment Exports Missing
**File**: App Router pages must export proper metadata
**Check**: 
```bash
grep -n "export" app/layout.tsx
# Should have: export const metadata
# Should have: export const viewport
```
**Status**: ✅ Present

#### Issue 4.2: Dynamic Import Failures
**Check**:
```bash
grep -n "dynamic\|React.lazy" app/page.tsx
# No dynamic imports in landing page - good
```

## Diagnostic Checklist

### Browser Developer Tools Tests
- [ ] **Network Tab**: Check if index.html loads (should be 200 OK)
- [ ] **Console Tab**: Look for JavaScript errors
- [ ] **Elements Tab**: Verify <body> has children content
- [ ] **Sources Tab**: Check for broken source maps
- [ ] **Application Tab**: Check localStorage/IndexedDB for errors

### Build Output Tests
```bash
# Check for warnings during build
npm run build

# Look for:
# - "error" in output (blockers)
# - Large warnings about bundle size
# - TypeScript errors
```

### Component Rendering Tests
```bash
# Temporarily simplify app/page.tsx to debug:
export default function Page() {
  return <div className="p-8 text-white bg-slate-950">Test Content</div>
}

# If this works: Issue is in complex component
# If this doesn't work: Issue is in setup
```

## Specific Issues Found & Status

### ✅ Verified Working
1. **Layout Structure**: Properly configured with Metadata and Viewport
2. **CSS Import**: globals.css correctly imported with all @tailwind directives
3. **Component Export**: Button and other components properly exported
4. **Next.js Config**: Security headers and optimization properly configured
5. **Typography**: Geist font properly loaded with CSS variables
6. **Design Tokens**: All Tailwind CSS custom properties defined

### ⚠️ Potential Issues to Check
1. **Tailwind Warnings**: Deprecated color names from shadcn/ui dependencies (non-critical)
   - lightBlue → sky (not used in our code)
   - warmGray → stone (not used in our code)
   - trueGray → neutral (not used in our code)
   - coolGray → gray (not used in our code)
   - blueGray → slate (not used in our code)

2. **Browser Cache**: Clear cache and hard refresh
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)
   - Or DevTools → Settings → Disable cache

3. **Vercel Edge Function Issue**: Preview might be using Edge Runtime
   - Check Vercel Settings → Project Settings → Node.js Runtime
   - Should be set to "Node.js" not "Edge"

## Step-by-Step Resolution

### Step 1: Verify Environment
```bash
# Check environment variables are set in Vercel
Vercel Dashboard → Project Settings → Environment Variables
Should have at least these public keys:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Step 2: Clear Cache
```bash
# Local development
rm -rf .next
npm run dev

# Or in browser DevTools
Settings → Storage → Clear Site Data
```

### Step 3: Check Browser Console
```bash
# Open DevTools (F12)
# Go to Console tab
# Look for red errors
# Common patterns to search for:
- "Cannot read"
- "is not defined"
- "Module not found"
- "404"
```

### Step 4: Verify CSS Loading
```bash
# Right-click page → Inspect
# Look for <style> tag with Tailwind CSS
# Should contain: @tailwind base { ... }
# If missing: CSS not compiling
```

### Step 5: Test Simple Component
Replace `/app/page.tsx` temporarily:
```tsx
export default function Page() {
  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center">
      <h1 className="text-4xl text-white">Test Page</h1>
    </div>
  )
}
```

If this works → Complex component issue
If this doesn't work → Setup issue

### Step 6: Check Build Errors
```bash
npm run build
# Look for errors (not warnings)
# Fix any errors before deploying
```

## Prevention Best Practices

1. **Always test locally first**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Verify landing page appears
   ```

2. **Build before deploying**
   ```bash
   npm run build
   # Should complete without errors
   ```

3. **Check browser console regularly**
   - F12 → Console
   - Watch for errors as you navigate

4. **Use React DevTools**
   - Install React DevTools browser extension
   - Check component tree is rendering

5. **Monitor Network Tab**
   - F12 → Network
   - Look for failed requests (404, 500)

## Common Solutions

| Symptom | Solution |
|---------|----------|
| White screen, console has errors | Fix JavaScript errors |
| White screen, no console errors | Check CSS loading |
| Page loads but no styling | Check Tailwind CSS compilation |
| Content visible but misaligned | Check responsive breakpoints |
| Images not loading | Check image paths and Vercel Blob setup |
| Slow loading | Check bundle size, optimize images |

## References

- **Next.js Debugging**: https://nextjs.org/docs/debugging
- **Vercel Deployment**: https://vercel.com/docs/deployments
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React DevTools**: https://react-devtools-tutorial.vercel.app/

## Contact & Support

If blank screen persists after these steps:
1. Check `/app/page.tsx` for syntax errors
2. Verify all imports resolve correctly
3. Check browser console for specific error messages
4. Review Vercel deployment logs
5. Consider rebuilding entire project: `npm ci && npm run build`
