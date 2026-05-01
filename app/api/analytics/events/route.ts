/**
 * Analytics Events API
 * Collects and processes user analytics events
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory event store (use database in production)
const eventStore: any[] = []

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()
    
    const { userId, eventName, eventType, timestamp } = event
    
    if (!userId || !eventName || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, eventName, eventType' },
        { status: 400 }
      )
    }
    
    // Store event
    eventStore.push({
      ...event,
      receivedAt: new Date(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })
    
    // Keep only last 10000 events in memory
    if (eventStore.length > 10000) {
      eventStore.shift()
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Analytics] Error recording event:', error)
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const metrics = {
      totalEvents: eventStore.length,
      uniqueUsers: new Set(eventStore.map((e: any) => e.userId)).size,
      eventTypes: getEventTypeDistribution(),
      topEvents: getTopEvents(),
      recentEvents: eventStore.slice(-20).reverse(),
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('[Analytics] Error generating metrics:', error)
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    )
  }
}

function getEventTypeDistribution(): Record<string, number> {
  const distribution: Record<string, number> = {}
  
  eventStore.forEach((event: any) => {
    distribution[event.eventType] = (distribution[event.eventType] || 0) + 1
  })
  
  return distribution
}

function getTopEvents(): Array<{ name: string; count: number }> {
  const eventCounts: Record<string, number> = {}
  
  eventStore.forEach((event: any) => {
    eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1
  })
  
  return Object.entries(eventCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}
