/**
 * Market Intelligence & Competitive Analysis Engine
 * Tracks market trends, competitor features, pricing, and customer sentiment
 * Uses free resources: GitHub API, npm registry, public pricing pages
 */

export interface CompetitorAnalysis {
  name: string
  url: string
  pricing: string
  features: string[]
  lastUpdated: Date
  strengths: string[]
  weaknesses: string[]
  marketShare: number
}

export interface MarketTrend {
  category: string
  trend: string
  momentum: 'rising' | 'stable' | 'declining'
  relevance: number
  sources: string[]
}

/**
 * Competitor Tracking Configuration
 * Monitor: Odoo, SAP, Microsoft Dynamics, ERPNext, Xero
 */
export const COMPETITORS = [
  {
    name: 'Odoo',
    website: 'https://www.odoo.com/pricing',
    github: 'odoo/odoo',
    category: 'Open Source ERP'
  },
  {
    name: 'ERPNext',
    website: 'https://erpnext.com/pricing',
    github: 'frappe/erpnext',
    category: 'Open Source ERP'
  },
  {
    name: 'Xero',
    website: 'https://www.xero.com/us/pricing',
    github: null,
    category: 'Cloud Accounting'
  },
  {
    name: 'Wave',
    website: 'https://www.waveapps.com/pricing',
    github: null,
    category: 'Cloud Accounting'
  },
  {
    name: 'Square',
    website: 'https://squareup.com/us/en/point-of-sale/pricing',
    github: null,
    category: 'POS + Payments'
  }
]

/**
 * Fetch competitor GitHub repository stats using free GitHub API
 */
export async function getGitHubStats(owner: string, repo: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    const data = await response.json()
    
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      issues: data.open_issues_count,
      language: data.language,
      lastUpdate: data.updated_at,
      license: data.license?.name,
    }
  } catch (error) {
    console.error('[Market Intelligence] Failed to fetch GitHub stats:', error)
    return null
  }
}

/**
 * Check npm package download trends (free npm registry API)
 */
export async function getNpmDownloads(packageName: string) {
  try {
    const response = await fetch(
      `https://api.npmjs.org/downloads/point/last-month/${packageName}`
    )
    const data = await response.json()
    return data.downloads || 0
  } catch (error) {
    console.error('[Market Intelligence] Failed to fetch npm downloads:', error)
    return 0
  }
}

/**
 * Monitor feature gap analysis between Nexus and competitors
 */
export function analyzeFeatureGap(
  nexusFeatures: string[],
  competitorFeatures: string[]
): { gap: string[]; advantage: string[] } {
  const gap = competitorFeatures.filter(f => !nexusFeatures.includes(f))
  const advantage = nexusFeatures.filter(f => !competitorFeatures.includes(f))
  
  return { gap, advantage }
}

/**
 * Identify market opportunities based on competitor weaknesses
 */
export function identifyOpportunities(competitors: CompetitorAnalysis[]): string[] {
  const opportunities: string[] = []
  
  // Common weaknesses across competitors
  const weaknessFrequency: Record<string, number> = {}
  
  competitors.forEach(competitor => {
    competitor.weaknesses.forEach(weakness => {
      weaknessFrequency[weakness] = (weaknessFrequency[weakness] || 0) + 1
    })
  })
  
  // Opportunities are weaknesses present in multiple competitors
  Object.entries(weaknessFrequency)
    .filter(([_, count]) => count >= 2)
    .forEach(([weakness, _]) => {
      opportunities.push(`Address: ${weakness}`)
    })
  
  return opportunities
}

/**
 * Track market sentiment and social signals
 * Uses free APIs: GitHub discussions, npm community
 */
export async function trackMarketSentiment() {
  const sentimentData = {
    githubTrending: null,
    npmTrending: null,
    communityGrowth: null,
    timestamp: new Date()
  }
  
  // This would connect to free APIs for real-time sentiment tracking
  // Examples: GitHub Trending, npm weekly stats, Hacker News API
  
  return sentimentData
}
