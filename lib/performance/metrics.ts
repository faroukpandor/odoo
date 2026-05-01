/**
 * Performance Metrics & Monitoring System
 * Tracks Web Vitals, API performance, database queries, and optimization opportunities
 */

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  threshold: number
  status: 'good' | 'warning' | 'critical'
}

export interface WebVitals {
  LCP: number // Largest Contentful Paint (< 2.5s is good)
  FID: number // First Input Delay (< 100ms is good)
  CLS: number // Cumulative Layout Shift (< 0.1 is good)
  FCP: number // First Contentful Paint (< 1.8s is good)
  TTFB: number // Time to First Byte (< 600ms is good)
}

export interface PerformanceBudget {
  bundleSize: {
    js: number // KB
    css: number // KB
    html: number // KB
  }
  loadTime: number // ms
  firstPaint: number // ms
  interactivity: number // ms
}

/**
 * Web Vitals tracking using free tools (Google Analytics, web-vitals library)
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'status'>) {
    const status = this.determineStatus(metric.value, metric.threshold)
    
    this.metrics.push({
      ...metric,
      timestamp: new Date(),
      status
    })
  }

  private determineStatus(
    value: number,
    threshold: number
  ): 'good' | 'warning' | 'critical' {
    if (value <= threshold * 0.8) return 'good'
    if (value <= threshold) return 'warning'
    return 'critical'
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name)
  }

  /**
   * Calculate average metric value over time window
   */
  getAverageMetric(name: string, timeWindowMs: number = 3600000): number {
    const now = Date.now()
    const relevant = this.metrics.filter(
      m => m.name === name && now - m.timestamp.getTime() <= timeWindowMs
    )
    
    if (relevant.length === 0) return 0
    
    const sum = relevant.reduce((acc, m) => acc + m.value, 0)
    return sum / relevant.length
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(): string[] {
    const bottlenecks: string[] = []
    const criticalMetrics = this.metrics.filter(m => m.status === 'critical')
    
    criticalMetrics.forEach(metric => {
      bottlenecks.push(
        `${metric.name} is critical: ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit})`
      )
    })
    
    return bottlenecks
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      totalMetricsRecorded: this.metrics.length,
      criticalCount: this.metrics.filter(m => m.status === 'critical').length,
      warningCount: this.metrics.filter(m => m.status === 'warning').length,
      goodCount: this.metrics.filter(m => m.status === 'good').length,
      bottlenecks: this.identifyBottlenecks(),
      recentMetrics: this.metrics.slice(-10),
    }
    
    return report
  }
}

/**
 * Performance optimization recommendations
 */
export function getOptimizationRecommendations(metrics: PerformanceMetric[]): string[] {
  const recommendations: string[] = []
  
  const avgLCP = metrics
    .filter(m => m.name === 'LCP')
    .reduce((sum, m) => sum + m.value, 0) / Math.max(metrics.filter(m => m.name === 'LCP').length, 1)
  
  if (avgLCP > 2500) {
    recommendations.push('Optimize Largest Contentful Paint: Consider lazy loading images, reducing JavaScript, optimizing images')
  }
  
  const avgFCP = metrics
    .filter(m => m.name === 'FCP')
    .reduce((sum, m) => sum + m.value, 0) / Math.max(metrics.filter(m => m.name === 'FCP').length, 1)
  
  if (avgFCP > 1800) {
    recommendations.push('Improve First Contentful Paint: Reduce render-blocking resources, inline critical CSS')
  }
  
  const avgCLS = metrics
    .filter(m => m.name === 'CLS')
    .reduce((sum, m) => sum + m.value, 0) / Math.max(metrics.filter(m => m.name === 'CLS').length, 1)
  
  if (avgCLS > 0.1) {
    recommendations.push('Reduce Cumulative Layout Shift: Reserve space for images and dynamic content')
  }
  
  return recommendations
}

/**
 * Default performance budget for modern web applications
 */
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  bundleSize: {
    js: 150, // 150 KB
    css: 30, // 30 KB
    html: 50, // 50 KB
  },
  loadTime: 3000, // 3 seconds
  firstPaint: 1000, // 1 second
  interactivity: 100, // 100 ms
}
