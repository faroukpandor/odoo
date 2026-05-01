import { generateText } from "ai"

export interface QueryResult {
  type: "data" | "calculation" | "forecast" | "recommendation"
  data: any
  natural_response: string
  sql?: string
}

// Natural Language Query Engine
export async function queryWithNaturalLanguage(
  question: string,
  schema: any,
  organizationId: string,
): Promise<QueryResult> {
  const schemaDescription = JSON.stringify(schema, null, 2)

  const { text } = await generateText({
    model: "grok-4",
    prompt: `You are an expert SQL analyst. Given this database schema and a user question, generate the appropriate SQL query or analysis.

Database Schema:
${schemaDescription}

User Question: ${question}

Respond in this exact JSON format:
{
  "sql": "SELECT ... (only if query is needed, otherwise null)",
  "type": "data|calculation|forecast|recommendation",
  "explanation": "Plain English explanation of what was done",
  "insights": "Additional insights relevant to the question"
}`,
  })

  try {
    const result = JSON.parse(text)
    return {
      type: result.type,
      data: { sql: result.sql },
      natural_response: result.explanation,
      sql: result.sql,
    }
  } catch {
    return {
      type: "recommendation",
      data: { error: "Unable to parse query" },
      natural_response: text,
    }
  }
}

// Generate smart business recommendations
export async function getSmartRecommendations(businessData: any): Promise<string[]> {
  const { text } = await generateText({
    model: "grok-4",
    prompt: `As a business strategist, analyze this data and provide 5 specific, actionable recommendations:

${JSON.stringify(businessData, null, 2)}

Format as JSON array of strings, each under 100 characters.`,
  })

  try {
    const recommendations = JSON.parse(text)
    return Array.isArray(recommendations) ? recommendations : []
  } catch {
    return []
  }
}
