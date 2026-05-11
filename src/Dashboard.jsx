import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const MU_LABELS = ['ANZ', 'India', 'Japan', 'SEA', 'GC']
const STATUS_ORDER = { Scaling: 0, 'Work in Progress': 1, 'Yet to Start': 2, Initiated: 3, 'Not Implementing': 4 }

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
function chartColors() {
  const p = getCSSVar('--purple'), t = getCSSVar('--teal'), a = getCSSVar('--amber')
  const dk = document.documentElement.dataset.theme === 'dark'
  return {
    p, t, a,
    pA: p + (dk ? '80' : '55'),
    aA: a + (dk ? '55' : '44'),
    red: getCSSVar('--red'), green: getCSSVar('--green'), gray: getCSSVar('--gray'),
    tx: dk ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)',
    gr: dk ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
  }
}
function baseOpts(yCb) {
  const c = chartColors()
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label || ''}: ${ctx.raw}` } } },
    scales: {
      x: { ticks: { color: c.tx, font: { size: 11, family: 'DM Sans' } }, grid: { color: c.gr } },
      y: { ticks: { color: c.tx, font: { size: 11, family: 'DM Sans' }, callback: yCb || undefined }, grid: { color: c.gr } },
    },
  }
}
function stClass(st) {
  if (st === 'Scaling') return 'st-sc'
  if (st === 'Work in Progress') return 'st-wi'
  if (st === 'Not Implementing') return 'st-ni'
  return 'st-yt'
}
function parseSav(v) {
  if (!v || v === '—') return -1
  return parseFloat(v.replace(/[$,K]/g, '')) || 0
}

function KpiCard({ c, l, v, s, d, du }) {
  return (
    <div className={`kc ${c}`}>
      <div className="kl">{l}</div>
      <div className="kv">{v}</div>
      <div className="ks">
        {s}
        {d && <span className={`kd ${du ? 'du' : 'dd'}`}>{d}</span>}
      </div>
    </div>
  )
}

function DrillPanel({ mu, view, contracts, onClose }) {
  const [sort, setSort] = useState({ col: 'status', dir: 'asc' })
  const scrollRef = useRef(null)

  const data = contracts?.[view]?.[mu]
  if (!data) return null
  const { stats, contracts: list } = data

  const scaling = list.filter(c => c.step5 === 'Scaling').length
  const wip = list.filter(c => c.status === 'Work in Progress').length
  const ni = list.filter(c => c.status === 'Not Implementing').length
  const totalUC = list.reduce((s, c) => s + (c.uc || 0), 0)

  function handleSort(col) {
    setSort(prev => {
      const dir = prev.col === col
        ? (prev.dir === 'asc' ? 'desc' : 'asc')
        : (['uc', 'plan', 'act'].includes(col) ? 'desc' : 'asc')
      const top = scrollRef.current?.scrollTop || 0
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = top }, 0)
      return { col, dir }
    })
  }

  const sorted = [...list].sort((a, b) => {
    let av, bv
    switch (sort.col) {
      case 'client':   av = (a.client || '').toLowerCase();   bv = (b.client || '').toLowerCase();   break
      case 'dsg':      av = (a.dsg || '').toLowerCase();      bv = (b.dsg || '').toLowerCase();      break
      case 'industry': av = (a.industry || '').toLowerCase(); bv = (b.industry || '').toLowerCase(); break
      case 'status':   av = STATUS_ORDER[a.status] ?? 5;      bv = STATUS_ORDER[b.status] ?? 5;      break
      case 'uc':       av = a.uc || 0;                        bv = b.uc || 0;                        break
      case 'plan':     av = parseSav(a.genAIPlan);            bv = parseSav(b.genAIPlan);            break
      case 'act':      av = parseSav(a.genAIAct);             bv = parseSav(b.genAIAct);             break
      case 'tooling':  av = (a.tooling || '').toLowerCase();  bv = (b.tooling || '').toLowerCase();  break
      default:         av = 0; bv = 0
    }
    if (av === bv) return (b.uc || 0) - (a.uc || 0)
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return sort.dir === 'asc' ? cmp : -cmp
  })

  function thCls(col) { return sort.col === col ? `sort-${sort.dir}` : '' }
  function Th({ col, children, style }) {
    return <th className={thCls(col)} onClick={() => handleSort(col)} style={style}>{children}</th>
  }

  return (
    <div className="drill-panel">
      <div className="drill-header">
        <div>
          <div className="drill-title">
            {mu} — Contract Detail View <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>{view.toUpperCase()}</span>
          </div>
          <div className="drill-sub">{list.length} contracts · Adoption {stats.adopPct} · Scaling {stats.scalPct} · {totalUC} total use cases</div>
        </div>
        <button className="drill-close" onClick={onClose}>✕</button>
      </div>
      <div className="drill-body">
        <div className="drill-stats">
          {[
            { v: stats.adopted, l: 'Adopted', c: 'var(--teal)' },
            { v: stats.scaling, l: 'Scaling (Step 5)', c: 'var(--purple)' },
            { v: scaling, l: 'At Scale', c: 'var(--green)' },
            { v: wip, l: 'Work in Progress', c: 'var(--purple)' },
            { v: ni, l: 'Not Implementing', c: 'var(--gray)' },
            { v: totalUC, l: 'Total Use Cases', c: 'var(--amber)' },
            { v: list.length, l: 'Total Contracts', c: 'var(--text2)' },
          ].map(s => (
            <div className="ds" key={s.l}>
              <div className="ds-val" style={{ color: s.c }}>{s.v}</div>
              <div className="ds-lbl">{s.l}</div>
            </div>
          ))}
        </div>
        {list.length > 8 && (
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
            ↕ Scroll to see all {list.length} contracts · Click column headers to sort
          </div>
        )}
        <div className="drill-contracts" ref={scrollRef}>
          <table className="dct">
            <thead>
              <tr>
                <th style={{ width: 36, cursor: 'default' }}>#</th>
                <Th col="client">Client</Th>
                <Th col="dsg">DSG</Th>
                <Th col="industry">Industry</Th>
                <Th col="status">Status</Th>
                <Th col="uc" style={{ textAlign: 'center' }}>Use Cases</Th>
                <Th col="plan">GenAI Plan</Th>
                <Th col="act">GenAI Actuals</Th>
                <Th col="tooling">Tooling</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>{i + 1}</td>
                  <td>{c.client || '—'}</td>
                  <td>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, background: 'rgba(123,97,255,.12)', color: 'var(--purple)', padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                      {c.dsg || '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text3)' }}>{c.industry || '—'}</td>
                  <td><span className={`stbadge ${stClass(c.status || '')}`}>{c.status || '—'}</span></td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: (c.uc || 0) > 0 ? 'var(--teal)' : 'var(--text3)', textAlign: 'center' }}>{c.uc || 0}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--text2)' }}>{c.genAIPlan || '—'}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: c.genAIAct && c.genAIAct !== '—' ? 'var(--teal)' : 'var(--text3)' }}>{c.genAIAct || '—'}</td>
                  <td style={{ color: 'var(--text3)' }}>{c.tooling || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [theme, setTheme] = useState('dark')
  const [activeTab, setActiveTab] = useState('overview')
  const [ovView, setOvView] = useState('apac')
  const [muView, setMuView] = useState('apac')
  const [savView, setSavView] = useState('apac')
  const [activeMU, setActiveMU] = useState(null)
  const [dashData, setDashData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const charts = useRef({})

  useEffect(() => {
    fetch('/api/dashboard-data')
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.error || r.statusText) })
        return r.json()
      })
      .then(d => { setDashData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => { if (dashData) setTimeout(buildOverviewCharts, 50) }, [ovView, theme, activeTab, dashData])
  useEffect(() => { if (dashData) setTimeout(buildMUCharts, 50) }, [muView, theme, activeTab, dashData])
  useEffect(() => { if (dashData) setTimeout(buildSavCharts, 50) }, [savView, theme, activeTab, dashData])
  useEffect(() => { if (dashData) setTimeout(buildClientsChart, 50) }, [savView, theme, activeTab, dashData])
  useEffect(() => { if (dashData && activeTab === 'clients') setTimeout(buildTopClientsChart, 50) }, [theme, activeTab, dashData])

  function mkChart(id, cfg) {
    const el = document.getElementById(id)
    if (!el) return
    if (charts.current[id]) charts.current[id].destroy()
    charts.current[id] = new Chart(el, cfg)
  }

  function buildOverviewCharts() {
    if (!dashData) return
    const c = chartColors()
    const rows = dashData.data[ovView].rows
    const adopt = rows.map(r => r.adopt)
    const scale = rows.map(r => r.scale)
    const donut = dashData.ovData[ovView].donut || [36, 31, 15, 14]

    mkChart('adoptionBar', {
      type: 'bar',
      data: {
        labels: MU_LABELS,
        datasets: [
          { label: 'Adoption %', data: adopt, backgroundColor: c.p, borderRadius: 4 },
          { label: 'Scaling %', data: scale, backgroundColor: c.t, borderRadius: 4 },
          { label: 'Target 70%', data: [70, 70, 70, 70, 70], backgroundColor: c.aA, borderColor: c.a, borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: { ...baseOpts(), scales: { ...baseOpts().scales, y: { ...baseOpts().scales.y, max: 110, ticks: { ...baseOpts().scales.y.ticks, callback: v => v + '%' } } } },
    })
    mkChart('statusDonut', {
      type: 'doughnut',
      data: {
        labels: ['Scaling', 'WIP', 'Not Impl.', 'Yet to Start'],
        datasets: [{ data: donut, backgroundColor: [c.t, c.p, c.gray, c.a], borderWidth: 0, hoverOffset: 4 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '68%' },
    })
  }

  function buildMUCharts() {
    if (!dashData) return
    const c = chartColors(), d = dashData.data[muView], mCb = v => '$' + v + 'M'
    mkChart('muSavChart', {
      type: 'bar',
      data: { labels: MU_LABELS, datasets: [{ label: 'Plan $M', data: d.savPlan, backgroundColor: c.pA, borderRadius: 3 }, { label: 'Actuals $M', data: d.savActuals, backgroundColor: c.t, borderRadius: 3 }] },
      options: baseOpts(mCb),
    })
    mkChart('muFteChart', {
      type: 'bar',
      data: { labels: MU_LABELS, datasets: [{ label: 'Plan', data: d.ftePlan, backgroundColor: c.pA, borderRadius: 3 }, { label: 'Actuals', data: d.fteActuals, backgroundColor: c.t, borderRadius: 3 }] },
      options: baseOpts(),
    })
  }

  function buildSavCharts() {
    if (!dashData) return
    const c = chartColors(), d = dashData.data[savView], mCb = v => '$' + v + 'M'
    mkChart('savCompare', {
      type: 'bar',
      data: { labels: MU_LABELS, datasets: [{ label: 'GenERA $M', data: d.savActuals, backgroundColor: c.t, borderRadius: 4 }, { label: 'GenAI $M', data: d.delActuals, backgroundColor: c.p, borderRadius: 4 }] },
      options: baseOpts(mCb),
    })
    mkChart('savAttain', {
      type: 'bar',
      data: { labels: MU_LABELS, datasets: [{ label: 'Plan $M', data: d.savPlan, backgroundColor: c.aA, borderColor: c.a, borderWidth: 1, borderRadius: 3 }, { label: 'Actuals $M', data: d.savActuals, backgroundColor: c.t, borderRadius: 3 }] },
      options: baseOpts(mCb),
    })
  }

  function clientChartOpts() {
    const c = chartColors()
    return { ...baseOpts(), scales: { ...baseOpts().scales, x: { ticks: { color: c.tx, font: { size: 10 }, maxRotation: 40 }, grid: { color: c.gr } }, y: { ticks: { color: c.tx, font: { size: 11 }, callback: v => '$' + v + 'K' }, grid: { color: c.gr } } } }
  }

  function buildClientsChart() {
    if (!dashData) return
    const c = chartColors()
    if (savView === 'apac') {
      const cc = dashData.clientsChart
      mkChart('savClients', {
        type: 'bar',
        data: {
          labels: cc.map(r => r.client),
          datasets: [
            { label: 'Planned $K', data: cc.map(r => r.planned), backgroundColor: c.pA, borderRadius: 3 },
            { label: 'Realized $K', data: cc.map(r => r.realized), backgroundColor: c.t, borderRadius: 3 },
          ],
        },
        options: clientChartOpts(),
      })
    } else {
      const d = dashData.data.atci
      mkChart('savClients', {
        type: 'bar',
        data: { labels: ['GenAI Savings', 'GenERA Savings'], datasets: [{ label: 'Plan $M', data: [parseSav(d.stats.delplan), parseSav(d.stats.gplan)], backgroundColor: c.aA, borderColor: c.a, borderWidth: 1, borderRadius: 4 }, { label: 'Actuals $M', data: [parseSav(d.stats.delact), parseSav(d.stats.gera)], backgroundColor: c.t, borderRadius: 4 }] },
        options: baseOpts(v => '$' + v + 'M'),
      })
    }
  }

  function buildTopClientsChart() {
    if (!dashData) return
    const c = chartColors(), cc = dashData.clientsChart
    mkChart('topClientChart', {
      type: 'bar',
      data: {
        labels: cc.map(r => r.client),
        datasets: [
          { label: 'Planned $K', data: cc.map(r => r.planned), backgroundColor: c.pA, borderRadius: 3 },
          { label: 'Realized $K', data: cc.map(r => r.realized), backgroundColor: c.t, borderRadius: 3 },
        ],
      },
      options: clientChartOpts(),
    })
  }

  function toggleMU(mu) {
    setActiveMU(prev => prev === mu ? null : mu)
  }

  if (loading) {
    return (
      <div className="pw" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text2)', fontFamily: 'DM Sans', fontSize: 16 }}>Loading dashboard data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pw" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 16 }}>Failed to load dashboard data</div>
        <div style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{error}</div>
      </div>
    )
  }

  const d = dashData.data[muView]

  return (
    <div className="pw">
      {/* HEADER */}
      <header className="header">
        <div>
          <div className="logo-row">
            <div className="logo-mark">A</div>
            <span className="org-name">Accenture · Asia Pacific Delivery</span>
          </div>
          <h1 className="page-title">AgenticAI in Delivery <span>@ APAC</span></h1>
          <p className="header-meta">FY26 Dashboard · Fiscal Year 2026</p>
        </div>
        <div className="hr">
          <div className="dbadge">Data as of <b>{dashData.config.asOf}</b></div>
          <div className="dbadge">Source: <b>MMD</b></div>
          <button className="ttheme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            <span className="isun">☀️</span>
            <div className="tt"><div className="tk" /></div>
            <span className="imoon">🌙</span>
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="tab-bar">
        {['overview', 'mu', 'savings', 'clients'].map(tab => (
          <button key={tab} className={`tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
            {{ overview: 'Overview', mu: 'Market Units', savings: 'Savings Analysis', clients: 'Top Clients' }[tab]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      <div className={`tab-panel${activeTab === 'overview' ? ' active' : ''}`}>
        <div className="sec">
          <div className="seg-wrap">
            <span className="seg-lbl">View</span>
            <div className="seg-ctrl">
              {['apac', 'atci'].map(v => (
                <button key={v} className={`seg-btn${ovView === v ? ' active' : ''}`} onClick={() => setOvView(v)}>{v.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="sh"><h2>{dashData.ovData[ovView].adoptTitle}</h2></div>
          <div className="kg">{dashData.ovData[ovView].adopt.map((k, i) => <KpiCard key={i} {...k} />)}</div>
        </div>
        <div className="sec">
          <div className="sh"><h2>{dashData.ovData[ovView].savTitle}</h2></div>
          <div className="kg">{dashData.ovData[ovView].sav.map((k, i) => <KpiCard key={i} {...k} />)}</div>
        </div>
        <div className="sec">
          <div className="sh"><h2>Adoption by Market Unit</h2></div>
          <div className="cg3">
            <div className="cc">
              <div className="cct">Adoption % vs Scaling % per MU</div>
              <div className="leg">
                <div className="li"><div className="ld" style={{ background: 'var(--purple)' }} />Adoption actual</div>
                <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Agentic scaling</div>
                <div className="li"><div className="ld" style={{ background: 'var(--amber)', opacity: .5 }} />Target 70%</div>
              </div>
              <div className="cw" style={{ height: 240 }}><canvas id="adoptionBar" /></div>
            </div>
            <div className="cc">
              <div className="cct">Contracts by status</div>
              <div className="cw" style={{ height: 190 }}><canvas id="statusDonut" /></div>
              <div style={{ marginTop: 12 }}>
                {[['var(--teal)', 'Scaling', dashData.ovData[ovView].donut[0]], ['var(--purple)', 'Work in Progress', dashData.ovData[ovView].donut[1]], ['var(--gray)', 'Not Implementing', dashData.ovData[ovView].donut[2]], ['var(--amber)', 'Yet to Start', dashData.ovData[ovView].donut[3]]].map(([col, lbl, n]) => (
                  <div className="dlr" key={lbl}><div className="dls" style={{ background: col }} /><span style={{ color: 'var(--text2)', flex: 1 }}>{lbl}</span><span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{n}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="sec">
          <div className="sh"><h2>Key Highlights</h2></div>
          <div className="hlg">
            {dashData.highlights.map(h => (
              <div className="hlc" key={h.title}>
                <div className="hli" style={{ background: h.bg }}>{h.icon}</div>
                <div><div className="hlt">{h.title}</div><div className="hlb">{h.body}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MARKET UNITS ── */}
      <div className={`tab-panel${activeTab === 'mu' ? ' active' : ''}`}>
        <div className="sec">
          <div className="seg-wrap">
            <span className="seg-lbl">View</span>
            <div className="seg-ctrl">
              {['apac', 'atci'].map(v => (
                <button key={v} className={`seg-btn${muView === v ? ' active' : ''}`} onClick={() => { setMuView(v); setActiveMU(null) }}>{v.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="banner">
            <div>
              <div className="bt">{d.banner.title}</div>
              <div className="bs">{d.banner.sub}</div>
            </div>
            <div className="bkk">
              {[['var(--purple)', d.banner.adopt, 'Adoption'], ['var(--teal)', d.banner.scale, 'Scaling'], ['var(--green)', d.banner.gensav, 'GenERA actuals'], ['var(--amber)', d.banner.fte, 'FTE actuals']].map(([col, val, lbl]) => (
                <div key={lbl}><div className="bkv" style={{ color: col }}>{val}</div><div className="bkl">{lbl}</div></div>
              ))}
            </div>
          </div>
          <div className="sh"><h2>{d.tableTitle}</h2></div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10, fontFamily: 'DM Mono, monospace' }}>
            ↗ Click on the eligible contracts number of any MU to view contract details
          </p>
          <div className="cc" style={{ padding: 0 }}>
            <div className="muw">
              <table className="mut">
                <thead>
                  <tr>
                    <th>MU</th><th>Eligible ↗</th><th>Adoption</th><th>Scaling (Step 5)</th>
                    <th>GenAI Plan</th><th>GenAI Actuals</th>
                    <th>GenERA Plan</th><th>GenERA Actuals</th>
                    <th>FTE Plan</th><th>FTE Actuals</th><th>FTE vs Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map(r => (
                    <tr key={r.mu} className={`data-row${activeMU === r.mu ? ' selected' : ''}`} onClick={() => toggleMU(r.mu)}>
                      <td><span className="mn">{r.mu}</span></td>
                      <td className="nc" title={`Click to view ${r.mu} contracts`}>{r.eligible}<span className="elig-hint">↗</span></td>
                      <td>
                        <div className="pbw">
                          <div className="pbb"><div className="pbf" style={{ width: r.adopt + '%', background: r.adoptColor }} /></div>
                          <span className="pbp" style={{ color: r.adoptColor }}>{r.adopt}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="pbw">
                          <div className="pbb"><div className="pbf" style={{ width: r.scale + '%', background: 'var(--teal)' }} /></div>
                          <span className="pbp">{r.scale}%</span>
                        </div>
                      </td>
                      <td className="nc">{r.delPlan}</td>
                      <td className="nc">{r.delAct}</td>
                      <td className="nc">{r.geraPlan}</td>
                      <td className="nc" style={{ color: r.geraActColor }}>{r.geraAct}</td>
                      <td className="nc">{r.ftePlan}</td>
                      <td className="nc">{r.fteAct}</td>
                      <td><span className="bp" style={{ background: r.dClass, color: r.dColor }}>{r.delta}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {activeMU && (
            <DrillPanel mu={activeMU} view={muView} contracts={dashData.contracts} onClose={() => setActiveMU(null)} />
          )}

          <div className="sec" style={{ marginTop: 20 }}>
            <div className="sh"><h2>{d.chartsTitle}</h2></div>
            <div className="cg2">
              <div className="cc">
                <div className="cct">{d.savChartTitle}</div>
                <div className="leg">
                  <div className="li"><div className="ld" style={{ background: 'var(--purple)', opacity: .55 }} />Plan</div>
                  <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Actuals</div>
                </div>
                <div className="cw" style={{ height: 220 }}><canvas id="muSavChart" /></div>
              </div>
              <div className="cc">
                <div className="cct">{d.fteChartTitle}</div>
                <div className="leg">
                  <div className="li"><div className="ld" style={{ background: 'var(--purple)', opacity: .55 }} />Plan</div>
                  <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Actuals</div>
                </div>
                <div className="cw" style={{ height: 220 }}><canvas id="muFteChart" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SAVINGS ANALYSIS ── */}
      <div className={`tab-panel${activeTab === 'savings' ? ' active' : ''}`}>
        <div className="sec">
          <div className="seg-wrap">
            <span className="seg-lbl">View</span>
            <div className="seg-ctrl">
              {['apac', 'atci'].map(v => (
                <button key={v} className={`seg-btn${savView === v ? ' active' : ''}`} onClick={() => setSavView(v)}>{v.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="sb">
            {[
              ['var(--teal)', dashData.data[savView].stats.gera, 'GenERA Actuals'],
              ['var(--purple)', dashData.data[savView].stats.gplan, 'GenERA Planned'],
              ['var(--green)', dashData.data[savView].stats.beat, 'Beat vs Plan'],
              ['var(--teal)', dashData.data[savView].stats.delact, 'GenAI Actuals'],
              ['var(--amber)', dashData.data[savView].stats.delplan, 'GenAI Planned'],
              ['var(--red)', dashData.data[savView].stats.att, 'Delivery Attainment'],
            ].map(([col, val, lbl]) => (
              <div className="si" key={lbl}><div className="sv" style={{ color: col }}>{val}</div><div className="sl">{lbl}</div></div>
            ))}
          </div>
          <div className="cg2" style={{ marginBottom: 16 }}>
            <div className="cc">
              <div className="cct">{dashData.data[savView].savC1Title}</div>
              <div className="leg">
                <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />GenERA</div>
                <div className="li"><div className="ld" style={{ background: 'var(--purple)' }} />GenAI</div>
              </div>
              <div className="cw" style={{ height: 240 }}><canvas id="savCompare" /></div>
            </div>
            <div className="cc">
              <div className="cct">{dashData.data[savView].savC2Title}</div>
              <div className="leg">
                <div className="li"><div className="ld" style={{ background: 'var(--amber)', opacity: .6 }} />Plan</div>
                <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Actuals</div>
              </div>
              <div className="cw" style={{ height: 240 }}><canvas id="savAttain" /></div>
            </div>
          </div>
          <div className="cc">
            <div className="cct">{dashData.data[savView].savC3Title}</div>
            <div className="leg">
              <div className="li"><div className="ld" style={{ background: 'var(--purple)', opacity: .55 }} />Planned</div>
              <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Realized</div>
            </div>
            <div className="cw" style={{ height: 310 }}><canvas id="savClients" /></div>
          </div>
        </div>
      </div>

      {/* ── TOP CLIENTS ── */}
      <div className={`tab-panel${activeTab === 'clients' ? ' active' : ''}`}>
        <div className="sec">
          <div className="sh"><h2>Top Clients with Highest Agentic AI Impact</h2></div>
          <div className="clg">
            {dashData.topClients.map(([name, meta]) => (
              <div className="clc" key={name}><div className="cln">{name}</div><div className="clm">{meta}</div></div>
            ))}
          </div>
        </div>
        <div className="sec">
          <div className="sh"><h2>Client savings — top 15 ($K)</h2></div>
          <div className="cc">
            <div className="leg">
              <div className="li"><div className="ld" style={{ background: 'var(--purple)', opacity: .55 }} />Planned</div>
              <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Realized</div>
            </div>
            <div className="cw" style={{ height: 420 }}><canvas id="topClientChart" /></div>
          </div>
        </div>
        <div className="sec">
          <div className="sh"><h2>Productivity benchmarks</h2></div>
          <div className="kg">
            {dashData.benchmarks.map((k, i) => <KpiCard key={i} {...k} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
