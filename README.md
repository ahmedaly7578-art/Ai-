# AdsDash — TikTok & Snapchat Analytics

## Deploy on Vercel (5 minutes)

### 1. Upload to GitHub
- Create new repo on github.com
- Upload all these files

### 2. Deploy on Vercel
- Go to vercel.com → New Project → Import from GitHub
- Select your repo → click Deploy

### 3. Add Environment Variables on Vercel
Go to: Project Settings → Environment Variables → add these two:

| Name | Value |
|------|-------|
| `WINDSOR_API_KEY` | afe048ab9a4c35d25ed9f20e08fae477fa02 |
| `ANTHROPIC_API_KEY` | sk-ant-api03-ey2_... |

Then redeploy.

---

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

---

## Features
- Overview dashboard with combined TikTok + Snapchat metrics
- Spend over time chart + platform donut chart
- TikTok tab: metrics, bar chart, campaign table
- Snapchat tab: same
- AI Audit: Claude analyzes your campaigns (streaming)
- Reports: preview + send to email
- Date range selector: last 7d / 14d / 30d / this month / last month
