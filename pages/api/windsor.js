export default async function handler(req, res) {
  const { platform, date_preset } = req.query
  const key = process.env.WINDSOR_API_KEY
  const fields = 'account_name,campaign,clicks,datasource,date,source,spend,impressions,ctr,cpm,cpc'

  const base =
    platform === 'tiktok'
      ? 'https://connectors.windsor.ai/tiktok_ads'
      : 'https://connectors.windsor.ai/snapchat'

  const url = `${base}?api_key=${key}&date_preset=${date_preset || 'last_7d'}&fields=${fields}`

  try {
    const r = await fetch(url)
    const json = await r.json()
    res.status(200).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
