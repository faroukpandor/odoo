# Security Checklist - Pre-Deployment

## Critical Security Requirements

### 1. Authentication & Authorization
- [ ] Email verification enabled
- [ ] Password hashing with bcrypt (minimum 12 rounds)
- [ ] Session timeout after 30 minutes of inactivity
- [ ] Refresh token rotation enabled
- [ ] MFA/2FA ready (can be enabled later)
- [ ] Password reset links expire after 1 hour
- [ ] Logout clears all sessions

### 2. Data Protection
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] SSL/TLS certificate valid
- [ ] Data encryption at rest (Supabase default)
- [ ] Database backups automated daily
- [ ] Backup encryption enabled
- [ ] Row Level Security (RLS) policies configured
- [ ] PII data masked in logs

### 3. API Security
- [ ] Rate limiting enabled (100 req/15min per IP)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection headers set
- [ ] CSRF tokens on form submissions
- [ ] CORS properly configured
- [ ] API versioning strategy
- [ ] Deprecated endpoints removed

### 4. Code Security
- [ ] No hardcoded secrets in code
- [ ] Environment variables for all secrets
- [ ] Dependency vulnerabilities checked (`npm audit`)
- [ ] No eval() or dynamic code execution
- [ ] No console.log() with sensitive data
- [ ] Error messages don't leak system info
- [ ] Type checking enabled (`typescript`)

### 5. Infrastructure Security
- [ ] Vercel security headers configured
- [ ] CSP header enabled
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] Server-side rendering for sensitive pages
- [ ] Database credentials not in git
- [ ] Vercel environment secrets used

### 6. Monitoring & Response
- [ ] Error logging enabled
- [ ] Suspicious activity alerts set up
- [ ] Failed login attempts tracked
- [ ] Incident response plan documented
- [ ] Security contact information available
- [ ] Uptime monitoring enabled
- [ ] Performance degradation alerts

### 7. Compliance & Documentation
- [ ] Privacy Policy written
- [ ] Terms of Service written
- [ ] GDPR compliance plan (if EU customers)
- [ ] Data retention policy documented
- [ ] Disaster recovery plan
- [ ] Security documentation
- [ ] Incident log template

### 8. Testing
- [ ] OWASP Top 10 vulnerabilities tested
- [ ] Penetration testing (basic)
- [ ] SQL injection tests passed
- [ ] XSS prevention verified
- [ ] CSRF protection tested
- [ ] Authentication bypass attempts failed
- [ ] Authorization enforced correctly

## Pre-Deployment Security Audit

### 1. Code Review
\`\`\`bash
# Check for secrets
git log -p | grep -i "password\|token\|key\|secret"

# Run security audit
npm audit --production
snyk test --severity=high
\`\`\`

### 2. Dependency Check
\`\`\`bash
npm outdated
npm audit fix
\`\`\`

### 3. Configuration Verification
\`\`\`bash
# Verify no .env files in git
git ls-files | grep ".env"

# Check for exposed keys
grep -r "SUPABASE_SERVICE_ROLE_KEY" --include="*.ts" --include="*.tsx"
\`\`\`

### 4. Environment Setup
- [ ] Production env vars set in Vercel
- [ ] Database backups tested
- [ ] Recovery procedures documented
- [ ] Staging environment matches production

## Response to Vulnerabilities

1. **Critical (CVSS 9-10):** Patch and redeploy within 24 hours
2. **High (CVSS 7-8):** Patch and redeploy within 1 week
3. **Medium (CVSS 4-6):** Schedule patch in next release
4. **Low (CVSS 0-3):** Track and patch in regular updates

## Security Contacts & Resources

- **Supabase Security:** security@supabase.io
- **Vercel Security:** https://vercel.com/security
- **Report Issues:** [Your contact email]
- **Security Policy:** /SECURITY.md

## Regular Security Maintenance

- **Weekly:** Check Vercel alerts
- **Monthly:** Run `npm audit`, check logs for errors
- **Quarterly:** Review RLS policies, test backups
- **Annually:** Full penetration testing
