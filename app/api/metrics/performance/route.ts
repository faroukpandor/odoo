/**
 * Performance Metrics API
 * Collects and analyzes performance data from client and server
 * Tracks Web Vitals, load times, and optimization opportunities
 */

import { NextRequest, NextResponse } from 'next/server'
import { PerformanceMonitor, DEFAULT_PERFORMANCE_BUDGET } from '@/lib/performance/metrics'

// In-memory store for metrics (use persistent storage in production)
const performanceMonitor = new PerformanceMonitor()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { metric, value, unit, threshold } = body
    
    if (!metric || value === undefined || !unit || threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: metric, value, unit, threshold' },
        { status: 400 }
      )
    }
    
    performanceMonitor.recordMetric({
      name: metric,
      value: parseFloat(value),
      unit,
      threshold: parseFloat(threshold),
    })
    
    return NextResponse.json({
      success: true,
      message: 'Metric recorded',
      metric: metric,
      value: value,
    })
  } catch (error) {
    console.error('[Performance API] Error recording metric:', error)
    return NextResponse.json(
      { error: 'Failed to record metric' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const report = performanceMonitor.generateReport()
    const bottlenecks = performanceMonitor.identifyBottlenecks()
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      performanceBudget: DEFAULT_PERFORMANCE_BUDGET,
      currentMetrics: report,
      bottlenecks,
      recommendations: [
        'Run Google PageSpeed Insights for detailed analysis',
        'Monitor Core Web Vitals continuously',
        'Set up real user monitoring (RUM) for production traffic',
        'Use Lighthouse CI for automated performance testing'
      ]
    })
  } catch (error) {
    console.error('[Performance API] Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
