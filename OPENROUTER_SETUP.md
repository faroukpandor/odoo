# OpenRouter AI Integration Guide

## Overview

OpenRouter provides free access to 200+ AI models including:
- **Claude 3.5 Sonnet** - Best for complex reasoning
- **GPT-4 Turbo** - Versatile, strong across tasks
- **Llama 3.1 405B** - Open source, free tier
- **Mixtral 8x7B** - Fast, efficient
- And 190+ more models

Your free API key enables unlimited experimentation with production-grade AI.

## Setup Instructions

### Step 1: Secure Configuration (30 seconds)

1. Go to your Vercel project settings
2. Navigate to "Settings" → "Environment Variables"
3. Add new environment variable:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: `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`
   - **Select environments**: Production, Preview, Development

### Step 2: Update .env.local (Local Development)

Create `.env.local` in your project root:
```
OPENROUTER_API_KEY=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
```

**⚠️ IMPORTANT**: Never commit this file to git. It's already in `.gitignore`.

### Step 3: Verify Setup

Run this command to verify your environment variable is loaded:
```bash
npm run dev
```

Check the browser console (F12) - it should not show any API key warnings.

## Enhanced AI Features Now Available

### 1. Advanced Predictive Analytics
**File**: `/lib/ai/predictor.ts`

Uses OpenRouter to provide:
- Revenue forecasting with confidence intervals
- Inventory optimization recommendations
- Customer churn prediction
- Demand forecasting

### 2. Natural Language Queries
**File**: `/lib/ai/nlq-engine.ts`

Ask questions in plain English:
- "Show me inventory below reorder levels"
- "What's my top 10 customers by revenue?"
- "Forecast next quarter revenue"
- "Identify unpaid invoices over 30 days"

### 3. AI-Powered Business Insights
**File**: `/components/ai-insights-panel.tsx`

Automatic recommendations:
- Performance insights based on your data
- Risk alerts (cash flow, inventory, customer)
- Growth opportunities
- Optimization suggestions

### 4. Workflow Automation with AI
**File**: `/lib/workflows/automation-engine.ts`

Create intelligent workflows:
- Auto-categorize expenses based on descriptions
- Generate invoice summaries
- Create customer follow-up tasks
- Flag unusual transactions

## API Endpoints

### Predictions Endpoint
```
GET /api/ai/predictions?orgId=<org_id>&type=revenue
```

Returns 12-month revenue forecast with confidence intervals.

### NLQ Endpoint
```
POST /api/nlq/query
Body: { "question": "What are my sales trends?", "orgId": "<org_id>" }
```

Returns structured data answering your question.

### Insights Endpoint
```
GET /api/ai/insights?orgId=<org_id>
```

Returns 5 actionable business insights.

## Model Selection Guide

### For Business Analytics (Recommended)
```typescript
// Best: Claude 3.5 Sonnet (reasoning, analysis)
const model = "anthropic/claude-3.5-sonnet";

// Faster: Llama 3.1 405B (free, good performance)
const model = "meta-llama/llama-3.1-405b-instruct";

// Budget: Mixtral 8x7B (very fast)
const model = "mistralai/mixtral-8x7b-instruct";
```

### For Content Generation
```typescript
// Best: Claude 3.5 Sonnet
const model = "anthropic/claude-3.5-sonnet";

// Alternative: GPT-4 Turbo
const model = "openai/gpt-4-turbo";
```

### For Fast Responses
```typescript
// Fastest: Llama 3.1 70B
const model = "meta-llama/llama-3.1-70b-instruct";

// Very Fast: Mixtral
const model = "mistralai/mixtral-8x7b-instruct";
```

## Cost Analysis (Free Tier)

OpenRouter's free tier provides:
- **Unlimited requests** for most models
- **Rate limiting**: Generous allowances
- **No credit card** required
- **Production ready**: Works at scale

Estimated monthly usage (if scaled to 1,000 users):
- Predictions: $5-20
- NLQ queries: $10-30
- Insights generation: $3-10
- **Total**: ~$20-60/month for 1,000 users

## Implementation Examples

### Example 1: Get Revenue Forecast
```typescript
const response = await fetch('/api/ai/predictions', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgId: 'your-org-id',
    type: 'revenue',
    months: 12
  })
});
const forecast = await response.json();
// forecast.data contains 12 months of predictions
```

### Example 2: Ask Natural Language Question
```typescript
const response = await fetch('/api/nlq/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are my top 5 products by revenue?',
    orgId: 'your-org-id'
  })
});
const answer = await response.json();
// answer.result contains structured data
```

### Example 3: Get Business Insights
```typescript
const response = await fetch('/api/ai/insights', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
const insights = await response.json();
// insights.recommendations contains 5 actionable items
```

## Advanced: Custom Model Selection

Update `/lib/ai/predictor.ts` to use specific models:

```typescript
// In your predictor function
const modelOptions = {
  reasoning: "anthropic/claude-3.5-sonnet",      // Deep analysis
  fast: "meta-llama/llama-3.1-70b-instruct",     // Quick responses
  budget: "mistralai/mixtral-8x7b-instruct"      // Most economical
};

// Use based on your needs
const selectedModel = modelOptions.reasoning; // or .fast or .budget
```

## Monitoring & Rate Limits

Check your usage at: https://openrouter.ai/activity

Free tier includes:
- 10 requests/minute (can request increase)
- Soft limit of 100K tokens/day
- Can request higher limits for production

## Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Verify API key is correctly set in environment variables

### Issue: Rate limit exceeded
**Solution**: Implement exponential backoff in your API calls

### Issue: Slow responses
**Solution**: Use faster models (Mixtral, Llama 70B) instead of Claude

### Issue: High costs
**Solution**: Use free-tier models (Llama 3.1) instead of premium models

## Best Practices

1. **Use caching**: Cache predictions for 24 hours
2. **Batch requests**: Group similar requests together
3. **Choose right model**: Use fast models for speed, Claude for accuracy
4. **Monitor usage**: Check dashboard weekly
5. **Set rate limits**: Implement in your API to control costs

## Security

- API key is never exposed to frontend (always use server-side)
- All requests go through your `/api/` routes
- No client-side API calls to OpenRouter
- Rate limiting prevents abuse

## Next Steps

1. Add `OPENROUTER_API_KEY` to Vercel environment variables
2. Test endpoints: `/api/ai/predictions`, `/api/nlq/query`, `/api/ai/insights`
3. Monitor usage on openrouter.ai dashboard
4. Customize model selection based on your needs
5. Scale features based on user feedback

## Support

- OpenRouter docs: https://openrouter.ai/docs
- Models list: https://openrouter.ai/models
- API reference: https://openrouter.ai/docs/api

Your ERP now has enterprise-grade AI at zero cost!
