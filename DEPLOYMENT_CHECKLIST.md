# Production Deployment Checklist

## Pre-Deployment (48 Hours Before)

### Code Readiness
- [ ] All tests passing locally
- [ ] No console errors or warnings
- [ ] No TODO/FIXME comments in critical paths
- [ ] Code reviewed and approved
- [ ] Changelog updated
- [ ] Version bumped (if applicable)
- [ ] Breaking changes documented

### Database
- [ ] All migrations tested in staging
- [ ] Database backup taken
- [ ] Migration rollback plan documented
- [ ] RLS policies verified
- [ ] Indexes created for common queries
- [ ] Slow queries optimized
- [ ] Connection pooling configured

### Configuration
- [ ] All environment variables set in Vercel
- [ ] No hardcoded values in code
- [ ] Secrets not in git history
- [ ] Feature flags configured
- [ ] API endpoints verified
- [ ] Third-party services tested (Grok, etc)
- [ ] Email service configured (if applicable)

### Monitoring & Alerts
- [ ] Error tracking enabled (Sentry setup ready)
- [ ] Performance monitoring ready
- [ ] Uptime monitoring configured
- [ ] Alert contacts configured
- [ ] Incident response plan shared
- [ ] On-call rotation established
- [ ] Slack/Email notifications ready

## 24 Hours Before Deployment

### Final Testing
- [ ] Full test suite passing
- [ ] E2E tests in staging environment
- [ ] Load testing completed (target: 100+ concurrent users)
- [ ] Backup/restore tested successfully
- [ ] Disaster recovery procedure tested
- [ ] SSL certificate valid (90+ days)
- [ ] DNS propagation verified

### Documentation
- [ ] Release notes prepared
- [ ] User-facing changes documented
- [ ] API changes documented
- [ ] Migration guide written (if needed)
- [ ] Support team briefed
- [ ] Customer communication drafted

### Team Communication
- [ ] Team notified of deployment window
- [ ] Stakeholders informed
- [ ] Support team on standby
- [ ] Escalation contacts shared
- [ ] Status page updated

## Deployment Day

### 1. Verify Staging (30 min before)
```bash
# Verify staging environment is healthy
curl https://staging.yourapp.com/api/health

# Check database connectivity
# Check all critical APIs responding
# Verify monitoring tools are collecting data
```

### 2. Create Backup
```bash
# Supabase: Create manual backup
# Vercel: Check auto-backup is enabled
# Document backup location
```

### 3. Deploy to Production
```bash
# Option 1: Push to main branch (auto-deploy via Vercel)
git push origin main

# Option 2: Manual deployment via Vercel dashboard
# Settings > Deployments > Deploy
```

### 4. Verify Deployment (15 min)
- [ ] Deployment shows "Ready" in Vercel
- [ ] No failed builds in build logs
- [ ] Health check endpoint returns 200
  ```bash
  curl https://app.yourapp.com/api/health
  ```
- [ ] Critical user paths tested manually
- [ ] Monitoring data flowing in
- [ ] Error rate normal (< 0.1%)
- [ ] Performance metrics acceptable

### 5. Monitor Closely (30 min)
- [ ] Watch error dashboard
- [ ] Monitor response times
- [ ] Check API latency
- [ ] Verify database performance
- [ ] Monitor server resources
- [ ] Review user activity patterns

## Post-Deployment (First 24 Hours)

### Immediate (First Hour)
- [ ] Monitor error rates continuously
- [ ] Check user reports
- [ ] Verify all modules loading
- [ ] Test core workflows manually
- [ ] Monitor database performance
- [ ] Check API response times

### Ongoing (First Day)
- [ ] Review analytics for anomalies
- [ ] Monitor error trends
- [ ] Check user feedback channels
- [ ] Verify automated tasks running
- [ ] Monitor resource utilization
- [ ] Review security logs

### Follow-up (First Week)
- [ ] Performance analysis complete
- [ ] User adoption metrics reviewed
- [ ] Any issues documented
- [ ] Lessons learned captured
- [ ] Retrospective scheduled if issues occurred

## Rollback Procedure (If Needed)

**Trigger:** Error rate > 1% or critical functionality broken

### Steps:
1. **Alert team immediately**
2. **Identify root cause** - Check logs, errors
3. **Decide:** Fix forward vs. rollback
4. **If rollback:** Revert to previous commit
   ```bash
   # In Vercel dashboard: Deployments > Select previous > Promote
   ```
5. **Test rollback** - Verify previous version works
6. **Communicate** - Update customers
7. **Investigate** - Root cause analysis
8. **Fix** - Resolve issue in code
9. **Redeploy** - Only after fix verified

## Post-Deployment Retrospective

**Schedule:** 2-3 days after successful deployment

**Topics:**
- What went well?
- What could improve?
- Were there any issues?
- How did monitoring perform?
- Any process changes needed?
- Document lessons learned

## Success Criteria

Deployment is successful if:
- ✓ No critical errors (500s < 0.01%)
- ✓ API response time acceptable (P95 < 500ms)
- ✓ All core features working
- ✓ No user complaints about functionality
- ✓ Database performing normally
- ✓ Monitoring tools operational
- ✓ No security incidents

## Emergency Contacts

- **On-call Engineer:** [Name/Phone]
- **Manager:** [Name/Phone]
- **Incident Commander:** [Name/Phone]
- **Escalation:** [Name/Phone]

## Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- Monitoring: [Your monitoring tool]
- Status Page: https://status.yourapp.com
- Analytics: [Your analytics tool]
