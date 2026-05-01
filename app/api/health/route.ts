/**
 * Health Check Endpoint
 * Used by monitoring and load balancers to verify app health
 * Returns 200 if healthy, 503 if unhealthy
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    // Simple health check query
    const { error } = await supabase.from('organizations').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function GET() {
  const dbHealthy = await checkDatabaseHealth()

  if (!dbHealthy) {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    { status: 200 }
  )
}
