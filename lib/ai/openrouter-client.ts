/**
 * OpenRouter AI Client
 * Server-side only - API key never exposed to frontend
 * Supports 200+ models including Claude, GPT-4, Llama, etc.
 */

interface OpenRouterOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

interface OpenRouterRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  top_p?: number
}

interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Model configuration with recommendations
const MODELS = {
  // Best for complex reasoning and analysis
  reasoning: 'anthropic/claude-3.5-sonnet',
  
  // Best for balanced performance/speed
  balanced: 'meta-llama/llama-3.1-405b-instruct',
  
  // Fastest, still high quality
  fast: 'meta-llama/llama-3.1-70b-instruct',
  
  // Most economical
  budget: 'mistralai/mixtral-8x7b-instruct',
}

/**
 * Call OpenRouter API
 * @param messages - Chat messages array
 * @param options - Configuration options
 * @returns Generated response text
 */
export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  options: OpenRouterOptions = {}
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured in environment variables')
  }

  const model = options.model || MODELS.balanced
  const maxTokens = options.maxTokens || 1000
  const temperature = options.temperature ?? 0.7
  const topP = options.topP ?? 0.9

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nexus-erp.vercel.app',
        'X-Title': 'Nexus ERP',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[OpenRouter Error]', error)
      throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data: OpenRouterResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('[OpenRouter Client Error]', error)
    throw error
  }
}

/**
 * Predict revenue for next N months
 */
export async function predictRevenue(
  historicalData: number[],
  months: number = 12
): Promise<Array<{ month: number; predicted: number; confidence: number }>> {
  const prompt = `
Analyze this revenue data and predict the next ${months} months:
Historical revenue (last ${historicalData.length} months): ${historicalData.join(', ')}

Provide predictions as JSON array with structure:
[{"month": 1, "predicted": <number>, "confidence": <0-1>}, ...]

Consider:
- Trend direction
- Seasonality
- Growth rate
- Confidence based on data consistency

Respond ONLY with valid JSON array, no explanations.
  `

  const response = await callOpenRouter(
    [{ role: 'user', content: prompt }],
    { model: MODELS.reasoning, temperature: 0.3 }
  )

  try {
    return JSON.parse(response)
  } catch {
    console.error('[Revenue Prediction Parse Error]', response)
    return []
  }
}

/**
 * Answer natural language questions about business data
 */
export async function queryBusinessData(
  question: string,
  context: string
): Promise<string> {
  const prompt = `
You are an expert business analyst. Answer this question based on the provided data context.

Question: ${question}

Data context:
${context}

Provide a clear, concise answer with specific insights.
  `

  return callOpenRouter(
    [{ role: 'user', content: prompt }],
    { model: MODELS.reasoning }
  )
}

/**
 * Generate business insights from data
 */
export async function generateInsights(
  businessData: Record<string, unknown>,
  numberOfInsights: number = 5
): Promise<string[]> {
  const prompt = `
Analyze this business data and provide ${numberOfInsights} actionable insights:

${JSON.stringify(businessData, null, 2)}

Format as JSON array of strings: ["insight 1", "insight 2", ...]

Focus on:
- Risk areas
- Growth opportunities
- Efficiency improvements
- Customer insights
- Financial health

Respond ONLY with valid JSON array.
  `

  const response = await callOpenRouter(
    [{ role: 'user', content: prompt }],
    { model: MODELS.reasoning, temperature: 0.5 }
  )

  try {
    return JSON.parse(response)
  } catch {
    console.error('[Insights Parse Error]', response)
    return [
      'Unable to generate insights at this time',
      'Please try again or contact support',
    ]
  }
}

/**
 * Suggest workflow automations
 */
export async function suggestAutomations(
  currentProcesses: string[]
): Promise<Array<{ name: string; description: string; impact: string }>> {
  const prompt = `
Review these current business processes and suggest useful automations:

${currentProcesses.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Return as JSON array with structure:
[{"name": "...", "description": "...", "impact": "..."}, ...]

Each automation should:
- Save time
- Reduce errors
- Be implementable with AI

Respond ONLY with valid JSON array.
  `

  const response = await callOpenRouter(
    [{ role: 'user', content: prompt }],
    { model: MODELS.balanced }
  )

  try {
    return JSON.parse(response)
  } catch {
    console.error('[Automations Parse Error]', response)
    return []
  }
}

export default {
  callOpenRouter,
  predictRevenue,
  queryBusinessData,
  generateInsights,
  suggestAutomations,
  MODELS,
}
