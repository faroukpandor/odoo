/**
 * User Analytics & Behavior Tracking
 * Tracks user behavior, feature usage, and engagement metrics
 * Free tools: Google Analytics, Vercel Analytics, Plausible (free tier)
 */

export interface UserEvent {
  userId: string
  eventName: string
  eventType: 'click' | 'navigation' | 'feature_use' | 'error' | 'conversion'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface FeatureUsage {
  featureName: string
  usageCount: number
  uniqueUsers: number
  lastUsed: Date
  adoptionRate: number
}

export interface UserEngagement {
  userId: string
  sessionCount: number
  totalDuration: number // minutes
  lastActive: Date
  engagementScore: number // 0-100
  features: string[]
}

export interface AnalyticsMetrics {
  totalSessions: number
  uniqueUsers: number
  averageSessionDuration: number // minutes
  conversionRate: number
  churnRate: number
  retentionRate: number
  topFeatures: FeatureUsage[]
  topPages: string[]
}

/**
 * Track user events (use in event handlers)
 */
export async function trackEvent(event: UserEvent): Promise<void> {
  try {
    // Send to analytics endpoint
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date()
      })
    })
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Track page view
 */
export async function trackPageView(pageName: string, metadata?: Record<string, any>): Promise<void> {
  await trackEvent({
    userId: getCurrentUserId(),
    eventName: `view_${pageName}`,
    eventType: 'navigation',
    timestamp: new Date(),
    metadata
  })
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(
  featureName: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    userId: getCurrentUserId(),
    eventName: `${featureName}_${action}`,
    eventType: 'feature_use',
    timestamp: new Date(),
    metadata
  })
}

/**
 * Track conversion event (purchase, signup, etc.)
 */
export async function trackConversion(
  conversionType: string,
  value?: number,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    userId: getCurrentUserId(),
    eventName: `conversion_${conversionType}`,
    eventType: 'conversion',
    timestamp: new Date(),
    metadata: {
      ...metadata,
      value
    }
  })
}

/**
 * Track errors
 */
export async function trackError(
  errorName: string,
  error: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    userId: getCurrentUserId(),
    eventName: `error_${errorName}`,
    eventType: 'error',
    timestamp: new Date(),
    metadata: {
      ...metadata,
      message: error.message,
      stack: error.stack
    }
  })
}

/**
 * Get current user ID (from session/auth)
 */
function getCurrentUserId(): string {
  // This should be implemented based on your auth system
  return typeof window !== 'undefined' && (window as any).__userId || 'anonymous'
}

/**
 * Analyze feature adoption
 */
export function analyzeFeatureAdoption(features: FeatureUsage[]): string[] {
  const insights: string[] = []
  
  features.forEach(feature => {
    if (feature.adoptionRate > 80) {
      insights.push(`${feature.featureName} has excellent adoption (${feature.adoptionRate}%)`)
    } else if (feature.adoptionRate > 50) {
      insights.push(`${feature.featureName} has good adoption (${feature.adoptionRate}%)`)
    } else {
      insights.push(`${feature.featureName} needs improvement (${feature.adoptionRate}% adoption) - consider redesigning or better onboarding`)
    }
  })
  
  return insights
}

/**
 * Calculate engagement score based on behavior
 */
export function calculateEngagementScore(engagement: UserEngagement): number {
  let score = 0
  
  // Session frequency (max 25 points)
  if (engagement.sessionCount > 10) score += 25
  else if (engagement.sessionCount > 5) score += 20
  else if (engagement.sessionCount > 1) score += 10
  
  // Session duration (max 25 points)
  if (engagement.totalDuration > 120) score += 25
  else if (engagement.totalDuration > 60) score += 20
  else if (engagement.totalDuration > 30) score += 10
  
  // Feature usage (max 25 points)
  if (engagement.features.length > 5) score += 25
  else if (engagement.features.length > 3) score += 20
  else if (engagement.features.length > 1) score += 10
  
  // Recency (max 25 points)
  const daysSinceActive = Math.floor(
    (Date.now() - engagement.lastActive.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceActive < 1) score += 25
  else if (daysSinceActive < 7) score += 20
  else if (daysSinceActive < 30) score += 10
  
  return Math.min(score, 100)
}

/**
 * Identify at-risk users (low engagement score)
 */
export function identifyAtRiskUsers(users: UserEngagement[]): UserEngagement[] {
  return users
    .map(user => ({
      ...user,
      engagementScore: calculateEngagementScore(user)
    }))
    .filter(user => user.engagementScore < 30)
    .sort((a, b) => a.engagementScore - b.engagementScore)
}

/**
 * Calculate cohort metrics for retention analysis
 */
export function calculateCohortMetrics(
  signupDate: Date,
  activeUsers: number,
  totalCohortUsers: number
): { retentionRate: number; churnRate: number } {
  const retentionRate = (activeUsers / totalCohortUsers) * 100
  const churnRate = 100 - retentionRate
  
  return { retentionRate, churnRate }
}
