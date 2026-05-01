/**
 * AI Chat API Endpoint
 * Uses OpenRouter for powerful, free AI
 * Server-side only - API key never exposed
 */

import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouter } from '@/lib/ai/openrouter-client'

export const runtime = 'nodejs'

interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function POST(request: NextRequest) {
  try {
    // Verify request
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    }

    // Parse request body
    let body: ChatRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array cannot be empty' },
        { status: 400 }
      )
    }

    // Call OpenRouter
    const response = await callOpenRouter(body.messages, {
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    })

    return NextResponse.json({
      success: true,
      message: response,
    })
  } catch (error) {
    console.error('[AI Chat Error]', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limited. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
