export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { metrics, tiktokMetrics, snapMetrics, campaigns, period } = req.body

  const prompt = `You are a senior digital advertising analyst. Analyze these real campaign metrics and give a thorough professional audit.

OVERALL (${period}):
Spend: $${metrics.spend.toFixed(2)} | Clicks: ${metrics.clicks} | Impressions: ${metrics.impressions}
CTR: ${metrics.ctr.toFixed(2)}% | CPC: $${metrics.cpc.toFixed(2)} | CPM: $${metrics.cpm.toFixed(2)}

TIKTOK:
Spend: $${tiktokMetrics.spend.toFixed(2)} | Clicks: ${tiktokMetrics.clicks} | Impressions: ${tiktokMetrics.impressions}
CTR: ${tiktokMetrics.ctr.toFixed(2)}% | CPC: $${tiktokMetrics.cpc.toFixed(2)} | CPM: $${tiktokMetrics.cpm.toFixed(2)}

SNAPCHAT:
Spend: $${snapMetrics.spend.toFixed(2)} | Clicks: ${snapMetrics.clicks} | Impressions: ${snapMetrics.impressions}
CTR: ${snapMetrics.ctr.toFixed(2)}% | CPC: $${snapMetrics.cpc.toFixed(2)} | CPM: $${snapMetrics.cpm.toFixed(2)}

CAMPAIGNS (by spend):
${campaigns.slice(0, 15).map(c => `- "${c.name}" | ${c.src} | Spend: $${c.spend.toFixed(2)} | Clicks: ${c.clicks} | CTR: ${c.ctr.toFixed(2)}% | CPC: $${c.cpc.toFixed(2)} | CPM: $${c.cpm.toFixed(2)}`).join('\n')}

Provide a full audit with these sections:
1. **Overall performance assessment** — are these numbers healthy?
2. **Platform comparison** — TikTok vs Snapchat winner and why
3. **Top & worst campaigns** — which to scale, which to pause
4. **Issues & red flags** — what needs immediate attention with specific numbers
5. **Quick wins** — 3-5 specific actions to do this week
6. **Budget reallocation** — where to shift spend for better ROI
7. **Industry benchmarks** — how these compare (TikTok avg CTR 1-3%, Snapchat avg CTR 0.5-1.5%, TikTok CPM $6-10, Snapchat CPM $3-8)

Be specific with numbers. Write in English, include Arabic for key terms where helpful.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(decoder.decode(value))
  }

  res.end()
}
