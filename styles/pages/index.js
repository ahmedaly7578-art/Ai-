import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

// ─── helpers ────────────────────────────────────────────────────────────────
const sum = (a, k) => a.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0)
const avg = (a, k) => (a.length ? sum(a, k) / a.length : 0)
const fc = n => (isNaN(n) || n === 0 ? '$0.00' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fp = n => (isNaN(n) ? '0.00%' : n.toFixed(2) + '%')
const fk = n => (n > 999999 ? (n / 1000000).toFixed(1) + 'M' : n > 999 ? (n / 1000).toFixed(1) + 'K' : Math.round(n).toString())

function calcMetrics(arr) {
  const spend = sum(arr, 'spend')
  const clicks = sum(arr, 'clicks')
  const impressions = sum(arr, 'impressions')
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : avg(arr, 'ctr')
  const cpc = clicks > 0 ? spend / clicks : avg(arr, 'cpc')
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : avg(arr, 'cpm')
  return { spend, clicks, impressions, ctr, cpc, cpm }
}

function groupByCampaign(arr) {
  const g = {}
  arr.forEach(r => {
    const k = (r.campaign || 'Unknown') + '__' + (r.datasource || r.source || '')
    if (!g[k]) g[k] = { name: r.campaign || 'Unknown', src: r.datasource || r.source || '', rows: [] }
    g[k].rows.push(r)
  })
  return Object.values(g)
    .map(x => ({ name: x.name, src: x.src, ...calcMetrics(x.rows) }))
    .sort((a, b) => b.spend - a.spend)
}

function getByDate(arr) {
  const m = {}
  arr.forEach(r => {
    const d = (r.date || '').substring(0, 10) || 'n/a'
    m[d] = (m[d] || 0) + (parseFloat(r.spend) || 0)
  })
  return m
}

// ─── sub-components ─────────────────────────────────────────────────────────
function MetricCard({ label, value }) {
  return (
    <div style={S.metricCard}>
      <div style={S.metricLabel}>{label}</div>
      <div style={S.metricValue}>{value}</div>
    </div>
  )
}

function MetricsRow({ arr }) {
  const m = calcMetrics(arr)
  return (
    <div style={S.metricsGrid}>
      <MetricCard label="Spend" value={fc(m.spend)} />
      <MetricCard label="Clicks" value={fk(m.clicks)} />
      <MetricCard label="Impressions" value={fk(m.impressions)} />
      <MetricCard label="CTR" value={fp(m.ctr)} />
      <MetricCard label="CPC" value={fc(m.cpc)} />
      <MetricCard label="CPM" value={fc(m.cpm)} />
    </div>
  )
}

function PlatBadge({ src }) {
  const isTik = src.toLowerCase().includes('tik')
  return (
    <span style={{ ...S.badge, ...(isTik ? S.badgeTik : S.badgeSnap) }}>
      {isTik ? 'TikTok' : 'Snapchat'}
    </span>
  )
}

function CampaignTable({ arr, showSrc }) {
  const rows = groupByCampaign(arr)
  if (!rows.length) return <div style={S.empty}>No data for this period</div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>
            {showSrc && <th style={S.th}>Platform</th>}
            <th style={S.th}>Campaign</th>
            <th style={S.th}>Spend</th>
            <th style={S.th}>Clicks</th>
            <th style={S.th}>Impressions</th>
            <th style={S.th}>CTR</th>
            <th style={S.th}>CPC</th>
            <th style={S.th}>CPM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={i % 2 === 0 ? {} : { background: '#fafaf9' }}>
              {showSrc && <td style={S.td}><PlatBadge src={r.src} /></td>}
              <td style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</td>
              <td style={S.td}>{fc(r.spend)}</td>
              <td style={S.td}>{fk(r.clicks)}</td>
              <td style={S.td}>{fk(r.impressions)}</td>
              <td style={S.td}>{fp(r.ctr)}</td>
              <td style={S.td}>{fc(r.cpc)}</td>
              <td style={S.td}>{fc(r.cpm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SpendChart({ tiktokData, snapData }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.Chart) return
    if (chartRef.current) { chartRef.current.destroy() }

    const tm = getByDate(tiktokData)
    const sm = getByDate(snapData)
    const dates = [...new Set([...Object.keys(tm), ...Object.keys(sm)])].sort()

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          { label: 'TikTok', data: dates.map(d => +((tm[d] || 0).toFixed(2))), borderColor: '#1a6fa8', backgroundColor: 'rgba(26,111,168,.07)', tension: 0.3, fill: true, pointRadius: 3, borderWidth: 2 },
          { label: 'Snapchat', data: dates.map(d => +((sm[d] || 0).toFixed(2))), borderColor: '#c4960f', backgroundColor: 'rgba(196,150,15,.07)', tension: 0.3, fill: true, pointRadius: 3, borderDash: [5, 3], borderWidth: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v, font: { size: 11 } } }, x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 7, font: { size: 10 } } } },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [tiktokData, snapData])

  return <canvas ref={canvasRef} aria-label="Daily spend by platform" />
}

function DonutChart({ tiktokData, snapData }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.Chart) return
    if (chartRef.current) { chartRef.current.destroy() }
    const ts = sum(tiktokData, 'spend'), ss = sum(snapData, 'spend')
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'doughnut',
      data: { labels: ['TikTok', 'Snapchat'], datasets: [{ data: [+ts.toFixed(2), +ss.toFixed(2)], backgroundColor: ['#1a6fa8', '#f5c518'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } } }, cutout: '65%' },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [tiktokData, snapData])

  return <canvas ref={canvasRef} aria-label="Spend split between TikTok and Snapchat" />
}

function BarChart({ arr, color }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.Chart) return
    if (chartRef.current) { chartRef.current.destroy() }
    if (!arr.length) return

    const bc = {}
    arr.forEach(r => { const k = r.campaign || 'Unknown'; bc[k] = (bc[k] || 0) + (parseFloat(r.spend) || 0) })
    const sorted = Object.entries(bc).sort((a, b) => b[1] - a[1]).slice(0, 12)

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: { labels: sorted.map(([k]) => (k.length > 28 ? k.substring(0, 28) + '…' : k)), datasets: [{ label: 'Spend', data: sorted.map(([, v]) => +v.toFixed(2)), backgroundColor: color, borderRadius: 3 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { callback: v => '$' + v, font: { size: 10 } } }, y: { ticks: { font: { size: 11 } } } } },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [arr])

  return <canvas ref={canvasRef} aria-label="Spend by campaign" />
}

// ─── pages ──────────────────────────────────────────────────────────────────
function OverviewPage({ data }) {
  const all = [...data.tiktok, ...data.snapchat]
  return (
    <>
      <MetricsRow arr={all} />
      <div style={S.chartsRow}>
        <div style={S.card}>
          <div style={S.cardTitle}>Spend over time</div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 11, color: '#666' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#1a6fa8', display: 'inline-block' }} />TikTok</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f5c518', display: 'inline-block' }} />Snapchat</span>
          </div>
          <div style={{ position: 'relative', height: 200 }}>
            <SpendChart tiktokData={data.tiktok} snapData={data.snapchat} />
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Platform share</div>
          <div style={{ position: 'relative', height: 200 }}>
            <DonutChart tiktokData={data.tiktok} snapData={data.snapchat} />
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>All campaigns</div>
        <CampaignTable arr={all} showSrc={true} />
      </div>
    </>
  )
}

function PlatformPage({ arr, color }) {
  const camps = groupByCampaign(arr)
  const h = Math.max(260, camps.length * 36 + 60)
  return (
    <>
      <MetricsRow arr={arr} />
      <div style={S.card}>
        <div style={S.cardTitle}>Spend by campaign</div>
        <div style={{ position: 'relative', height: h }}>
          <BarChart arr={arr} color={color} />
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>Campaign details</div>
        <CampaignTable arr={arr} showSrc={false} />
      </div>
    </>
  )
}

function AuditPage({ data, period }) {
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [text, setText] = useState('')

  async function runAudit() {
    const all = [...data.tiktok, ...data.snapchat]
    if (!all.length) { alert('Load data first'); return }
    setStatus('loading'); setText('')

    const body = {
      period,
      metrics: calcMetrics(all),
      tiktokMetrics: calcMetrics(data.tiktok),
      snapMetrics: calcMetrics(data.snapchat),
      campaigns: groupByCampaign(all),
    }

    const resp = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of dec.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6))
            if (d.delta?.text) { full += d.delta.text; setText(full) }
          } catch (e) {}
        }
      }
    }
    setStatus('done')
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>AI campaign audit</div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Claude will analyze all your campaigns and give detailed insights, identify issues, and suggest improvements.</p>
      <button style={{ ...S.btnPrimary, opacity: status === 'loading' ? 0.6 : 1 }} onClick={runAudit} disabled={status === 'loading'}>
        {status === 'loading' ? '⟳ Analyzing...' : '✦ Run full audit'}
      </button>
      {(status === 'loading' || status === 'done') && (
        <div style={{ ...S.analysisBox, marginTop: 16 }}>
          {text ? <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} /> : <span style={{ color: '#999', fontSize: 13 }}>Generating...</span>}
        </div>
      )}
    </div>
  )
}

function ReportsPage({ data, period }) {
  const [email, setEmail] = useState('')
  const [preview, setPreview] = useState(false)

  const all = [...data.tiktok, ...data.snapchat]
  const m = calcMetrics(all), tm = calcMetrics(data.tiktok), sm = calcMetrics(data.snapchat)
  const camps = groupByCampaign(all)
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const bodyText = `Ad Performance Report — ${date}\nPeriod: ${period}\n\nOVERALL\nSpend: ${fc(m.spend)} | Clicks: ${fk(m.clicks)} | Impressions: ${fk(m.impressions)}\nCTR: ${fp(m.ctr)} | CPC: ${fc(m.cpc)} | CPM: ${fc(m.cpm)}\n\nTIKTOK\nSpend: ${fc(tm.spend)} | Clicks: ${fk(tm.clicks)} | Impressions: ${fk(tm.impressions)}\nCTR: ${fp(tm.ctr)} | CPC: ${fc(tm.cpc)} | CPM: ${fc(tm.cpm)}\n\nSNAPCHAT\nSpend: ${fc(sm.spend)} | Clicks: ${fk(sm.clicks)} | Impressions: ${fk(sm.impressions)}\nCTR: ${fp(sm.ctr)} | CPC: ${fc(sm.cpc)} | CPM: ${fc(sm.cpm)}\n\nTOP CAMPAIGNS\n${camps.slice(0, 10).map(c => `${c.name}: ${fc(c.spend)} spend, ${fk(c.clicks)} clicks, ${fp(c.ctr)} CTR`).join('\n')}\n\n---\nGenerated by AdsDash`

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Send performance report</div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Generate a full report and send it to your email.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={S.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <button style={S.btn} onClick={() => setPreview(true)}>Preview</button>
        <button style={S.btnPrimary} onClick={() => { if (!email) { alert('Enter email'); return }; window.location.href = `mailto:${email}?subject=Ad Report — ${date}&body=${encodeURIComponent(bodyText)}` }}>Send</button>
      </div>

      {preview && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...S.card, background: '#fafaf9' }}>
            <div style={{ ...S.cardTitle, marginBottom: 4 }}>Performance report — {date}</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Period: {period.replace(/_/g, ' ')}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Platform</th><th style={S.th}>Spend</th><th style={S.th}>Clicks</th>
                    <th style={S.th}>Impressions</th><th style={S.th}>CTR</th><th style={S.th}>CPC</th><th style={S.th}>CPM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={S.td}><span style={{ ...S.badge, ...S.badgeTik }}>TikTok</span></td><td style={S.td}>{fc(tm.spend)}</td><td style={S.td}>{fk(tm.clicks)}</td><td style={S.td}>{fk(tm.impressions)}</td><td style={S.td}>{fp(tm.ctr)}</td><td style={S.td}>{fc(tm.cpc)}</td><td style={S.td}>{fc(tm.cpm)}</td></tr>
                  <tr><td style={S.td}><span style={{ ...S.badge, ...S.badgeSnap }}>Snapchat</span></td><td style={S.td}>{fc(sm.spend)}</td><td style={S.td}>{fk(sm.clicks)}</td><td style={S.td}>{fk(sm.impressions)}</td><td style={S.td}>{fp(sm.ctr)}</td><td style={S.td}>{fc(sm.cpc)}</td><td style={S.td}>{fc(sm.cpm)}</td></tr>
                  <tr style={{ fontWeight: 500 }}><td style={S.td}>Total</td><td style={S.td}>{fc(m.spend)}</td><td style={S.td}>{fk(m.clicks)}</td><td style={S.td}>{fk(m.impressions)}</td><td style={S.td}>{fp(m.ctr)}</td><td style={S.td}>{fc(m.cpc)}</td><td style={S.td}>{fc(m.cpm)}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ ...S.cardTitle, marginBottom: 10 }}>Top campaigns</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr><th style={S.th}>Campaign</th><th style={S.th}>Platform</th><th style={S.th}>Spend</th><th style={S.th}>Clicks</th><th style={S.th}>CTR</th><th style={S.th}>CPC</th></tr></thead>
                  <tbody>
                    {camps.slice(0, 10).map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</td>
                        <td style={S.td}><PlatBadge src={c.src} /></td>
                        <td style={S.td}>{fc(c.spend)}</td>
                        <td style={S.td}>{fk(c.clicks)}</td>
                        <td style={S.td}>{fp(c.ctr)}</td>
                        <td style={S.td}>{fc(c.cpc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 14 }}>Generated by AdsDash · {date}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── main dashboard ──────────────────────────────────────────────────────────
const PAGES = ['overview', 'tiktok', 'snapchat', 'audit', 'reports']
const PAGE_LABELS = { overview: 'Overview', tiktok: 'TikTok Ads', snapchat: 'Snapchat Ads', audit: 'AI Audit', reports: 'Reports' }
const NAV_ICONS = { overview: '▦', tiktok: '◈', snapchat: '◉', audit: '✦', reports: '◧' }

export default function Dashboard() {
  const [page, setPage] = useState('overview')
  const [dateRange, setDateRange] = useState('last_7d')
  const [data, setData] = useState({ tiktok: [], snapchat: [] })
  const [loading, setLoading] = useState(false)

  async function loadData(preset) {
    setLoading(true)
    try {
      const [tr, sr] = await Promise.all([
        fetch(`/api/windsor?platform=tiktok&date_preset=${preset}`).then(r => r.json()),
        fetch(`/api/windsor?platform=snapchat&date_preset=${preset}`).then(r => r.json()),
      ])
      setData({ tiktok: Array.isArray(tr.data) ? tr.data : Array.isArray(tr) ? tr : [], snapchat: Array.isArray(sr.data) ? sr.data : Array.isArray(sr) ? sr : [] })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadData(dateRange) }, [])

  function handleDateChange(e) {
    const v = e.target.value
    setDateRange(v)
    loadData(v)
  }

  return (
    <>
      <Head>
        <title>AdsDash</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* sidebar */}
        <div style={S.sidebar}>
          <div style={S.logo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="0" y="0" width="7" height="7" rx="1.5" fill="#1a6fa8" />
              <rect x="9" y="0" width="7" height="7" rx="1.5" fill="#f5c518" />
              <rect x="0" y="9" width="7" height="7" rx="1.5" fill="#f5c518" opacity=".6" />
              <rect x="9" y="9" width="7" height="7" rx="1.5" fill="#1a6fa8" opacity=".6" />
            </svg>
            AdsDash
          </div>
          {PAGES.map(p => (
            <div key={p} style={{ ...S.navItem, ...(page === p ? S.navActive : {}) }} onClick={() => setPage(p)}>
              <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{NAV_ICONS[p]}</span>
              {PAGE_LABELS[p]}
            </div>
          ))}
        </div>

        {/* main */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <div style={S.topbar}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{PAGE_LABELS[page]}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={dateRange} onChange={handleDateChange} style={S.btn}>
                <option value="last_7d">Last 7 days</option>
                <option value="last_14d">Last 14 days</option>
                <option value="last_30d">Last 30 days</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
              </select>
              <button style={S.btn} onClick={() => loadData(dateRange)} disabled={loading}>
                {loading ? '⟳' : '↻'} Refresh
              </button>
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {loading && <div style={{ padding: '30px 0', color: '#999', fontSize: 13 }}>Loading data...</div>}
            {!loading && page === 'overview' && <OverviewPage data={data} />}
            {!loading && page === 'tiktok' && <PlatformPage arr={data.tiktok} color="#1a6fa8" />}
            {!loading && page === 'snapchat' && <PlatformPage arr={data.snapchat} color="#f5c518" />}
            {!loading && page === 'audit' && <AuditPage data={data} period={dateRange} />}
            {!loading && page === 'reports' && <ReportsPage data={data} period={dateRange} />}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────
const S = {
  sidebar: { width: 210, background: '#fff', borderRight: '0.5px solid #e5e5e3', padding: '14px 0', flexShrink: 0, minHeight: '100vh' },
  logo: { padding: '0 16px 14px', fontSize: 15, fontWeight: 500, borderBottom: '0.5px solid #e5e5e3', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 },
  navItem: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer', color: '#666' },
  navActive: { background: '#f5f5f4', color: '#1a1a1a', fontWeight: 500 },
  topbar: { background: '#fff', borderBottom: '0.5px solid #e5e5e3', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  btn: { padding: '6px 12px', border: '0.5px solid #ccc', borderRadius: 8, background: 'transparent', color: '#1a1a1a', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  btnPrimary: { padding: '6px 14px', border: '0.5px solid #1a1a1a', borderRadius: 8, background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  input: { flex: 1, padding: '7px 10px', border: '0.5px solid #ccc', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1a1a1a' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 },
  metricCard: { background: '#f5f5f4', borderRadius: 8, padding: '12px 14px' },
  metricLabel: { fontSize: 11, color: '#888', marginBottom: 5 },
  metricValue: { fontSize: 20, fontWeight: 500 },
  card: { background: '#fff', border: '0.5px solid #e5e5e3', borderRadius: 12, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: 500, marginBottom: 12 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '7px 10px', fontSize: 10, fontWeight: 500, color: '#888', borderBottom: '0.5px solid #e5e5e3', textTransform: 'uppercase', letterSpacing: '.04em' },
  td: { padding: '9px 10px', borderBottom: '0.5px solid #e5e5e3' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
  badgeTik: { background: '#e8f4fd', color: '#1a6fa8' },
  badgeSnap: { background: '#fef9e1', color: '#9a7b0a' },
  analysisBox: { background: '#f5f5f4', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.7 },
  empty: { textAlign: 'center', padding: 30, color: '#999', fontSize: 13 },
}
