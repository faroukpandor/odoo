/**
 * Competitive Analysis API
 * Generates periodic competitive analysis reports
 * Tracks market positioning and feature gaps
 */

import { NextResponse } from 'next/server'
import { getGitHubStats, getNpmDownloads, COMPETITORS } from '@/lib/analytics/market-intelligence'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const analysis: Record<string, any> = {}

    // Fetch stats for major open-source competitors
    for (const competitor of COMPETITORS) {
      if (competitor.github) {
        const [owner, repo] = competitor.github.split('/')
        const stats = await getGitHubStats(owner, repo)
        
        analysis[competitor.name] = {
          category: competitor.category,
          github: {
            ...stats,
            url: `https://github.com/${competitor.github}`
          },
          website: competitor.website,
          lastAnalyzed: new Date().toISOString()
        }
      }
    }

    // Generate competitive summary
    const summary = {
      analysisDate: new Date().toISOString(),
      competitorsAnalyzed: COMPETITORS.length,
      competitors: analysis,
      recommendations: generateRecommendations(analysis)
    }

    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('[Competitive Analysis] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate competitive analysis' },
      { status: 500 }
    )
  }
}

function generateRecommendations(analysis: Record<string, any>): string[] {
  const recommendations: string[] = []

  // Find the highest growth competitor
  const mostPopular = Object.entries(analysis).reduce((prev, current) => {
    const prevStars = prev[1]?.github?.stars || 0
    const currentStars = current[1]?.github?.stars || 0
    return currentStars > prevStars ? current : prev
  })

  if (mostPopular) {
    recommendations.push(
      `${mostPopular[0]} is the market leader - focus on differentiation in UI/UX and pricing`
    )
  }

  // Identify niche opportunities
  recommendations.push(
    'Market shift towards AI-powered features - prioritize ML/AI capabilities'
  )
  recommendations.push(
    'Cloud-first deployment dominates - ensure serverless-first architecture'
  )
  recommendations.push(
    'Emphasis on ease-of-use - competitors still have steep learning curves'
  )

  return recommendations
}
