import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import CONTRACTS_FALLBACK from './data/contracts.json'

Chart.register(...registerables)

// ── DATA ────────────────────────────────────────────────────────
const MU_LABELS = ['ANZ', 'India', 'Japan', 'SEA', 'GC']

const OV_DATA = {
  apac: {
    adoptTitle: 'Adoption & Scaling — APAC',
    savTitle: 'GenERA & Delivery Savings — APAC',
    adopt: [
      { c: 'cp', l: 'FY26 Adoption Actual', v: '72%', s: '270 contracts', d: '▲ 2pp vs target', du: true },
      { c: 'ct', l: 'Agentic AI Scaling', v: '31%', s: '117 contracts', d: '▲ 5pp vs benchmark', du: true },
      { c: 'ca', l: 'Adoption Target', v: '70%', s: 'Top-down FY26 target' },
      { c: 'cg', l: 'Tech Avg Adoption', v: '55%', s: 'Industry average' },
      { c: 'ct', l: 'Scaling Benchmark', v: '26%', s: 'Tech scaling benchmark' },
      { c: 'cp', l: 'Total Eligible', v: '377', s: 'APAC eligible contracts' },
    ],
    sav: [
      { c: 'ct', l: 'Savings Actuals', v: '$55.5M', s: 'vs $39M planned', d: '+42%', du: true },
      { c: 'cp', l: 'Savings Planned', v: '$39M', s: 'FY26 GenERA plan' },
      { c: 'cg', l: 'FTE Savings Actuals', v: '3,571', s: 'vs 2,279 planned', d: '+57%', du: true },
      { c: 'ca', l: 'FTE Savings Target', v: '6,518', s: 'Full-year target' },
      { c: 'ct', l: 'GenAI Savings Actuals', v: '$6.4M', s: 'vs $11M plan', d: '58% attainment', du: false },
      { c: 'cr', l: 'GenAI Savings Target', v: '$16M', s: 'Top-down GenAI target' },
    ],
  },
  atci: {
    adoptTitle: 'Adoption & Scaling — ATCI',
    savTitle: 'GenERA & Delivery Savings — ATCI',
    adopt: [
      { c: 'cp', l: 'FY26 Adoption Actual', v: '73%', s: '60 contracts', d: '▲ 3pp vs target', du: true },
      { c: 'ct', l: 'Agentic AI Scaling', v: '37%', s: '30 contracts', d: '▲ 11pp vs benchmark', du: true },
      { c: 'ca', l: 'Adoption Target', v: '70%', s: 'Top-down FY26 target' },
      { c: 'cg', l: 'Tech Avg Adoption', v: '55%', s: 'Industry average' },
      { c: 'ct', l: 'Scaling Benchmark', v: '26%', s: 'Tech scaling benchmark' },
      { c: 'cp', l: 'Total Eligible', v: '82', s: 'ATCI eligible contracts' },
    ],
    sav: [
      { c: 'ct', l: 'GenERA Actuals', v: '$13.9M', s: 'vs $11.7M planned', d: '+19%', du: true },
      { c: 'cp', l: 'GenERA Planned', v: '$11.7M', s: 'FY26 ATCI GenERA plan' },
      { c: 'cg', l: 'FTE Savings Actuals', v: '1,086', s: 'vs 848 planned', d: '+28%', du: true },
      { c: 'ca', l: 'FTE Savings Target', v: '2,373', s: 'Full-year ATCI target' },
      { c: 'ct', l: 'GenAI Savings Actuals', v: '$2.0M', s: 'vs $2.6M plan', d: '77% attainment', du: false },
      { c: 'cr', l: 'GenAI Savings Target', v: '$8M', s: 'Top-down ATCI target' },
    ],
  },
}

const DATA = {
  apac: {
    banner: { title: 'APAC — All Market Units', sub: '377 eligible contracts · Target 70% adoption · 5 MUs', adopt: '72%', scale: '31%', gensav: '$55.5M', fte: '3,571' },
    tableTitle: 'APAC Market Unit Performance', chartsTitle: 'APAC Savings Charts',
    savChartTitle: 'GenERA Savings ($M) — APAC by MU', fteChartTitle: 'FTE Savings — APAC by MU',
    rows: [
      { mu: 'ANZ', eligible: 83, adopt: 67, adoptColor: 'var(--purple)', scale: 31, delPlan: '$1.3M', delAct: '$0.9M', geraPlan: '$8.0M', geraAct: '$12.2M', geraActColor: 'var(--teal)', ftePlan: '555', fteAct: '1,009', delta: '+82%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
      { mu: 'India', eligible: 47, adopt: 77, adoptColor: 'var(--purple)', scale: 32, delPlan: '$0.4M', delAct: '$0.2M', geraPlan: '$7.3M', geraAct: '$5.2M', geraActColor: 'var(--red)', ftePlan: '633', fteAct: '660', delta: '+4%', dClass: 'rgba(76,175,130,.12)', dColor: 'var(--green)' },
      { mu: 'Japan', eligible: 162, adopt: 83, adoptColor: 'var(--purple)', scale: 38, delPlan: '$8.6M', delAct: '$4.5M', geraPlan: '$20.8M', geraAct: '$31.9M', geraActColor: 'var(--teal)', ftePlan: '838', fteAct: '1,159', delta: '+38%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
      { mu: 'SEA', eligible: 74, adopt: 53, adoptColor: 'var(--amber)', scale: 19, delPlan: '$0.4M', delAct: '$0.4M', geraPlan: '$2.3M', geraAct: '$5.2M', geraActColor: 'var(--teal)', ftePlan: '200', fteAct: '666', delta: '+233%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
      { mu: 'GC', eligible: 11, adopt: 36, adoptColor: 'var(--red)', scale: 0, delPlan: '$0.3M', delAct: '$0.5M', geraPlan: '$0.6M', geraAct: '$0.9M', geraActColor: 'var(--teal)', ftePlan: '53', fteAct: '78', delta: '+47%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
    ],
    savPlan: [8, 7.3, 20.8, 2.3, 0.6], savActuals: [12.2, 5.2, 31.9, 5.2, 0.9],
    ftePlan: [555, 633, 838, 200, 53], fteActuals: [1009, 660, 1159, 666, 78], delActuals: [0.9, 0.2, 4.5, 0.4, 0.5],
    stats: { gera: '$55.5M', gplan: '$39M', beat: '+42%', delact: '$6.4M', delplan: '$11M', att: '58%' },
    savC1Title: 'GenERA vs GenAI — Actuals by MU ($M)', savC2Title: 'GenERA Attainment vs Plan ($M)', savC3Title: 'Top APAC clients by realized savings ($K)',
  },
  atci: {
    banner: { title: 'APAC ATCI — Market Units', sub: '82 eligible contracts · Savings target $8M · 5 MUs', adopt: '73%', scale: '37%', gensav: '$13.9M', fte: '1,086' },
    tableTitle: 'ATCI Market Unit Performance', chartsTitle: 'ATCI Savings Charts',
    savChartTitle: 'GenERA Savings ($M) — ATCI by MU', fteChartTitle: 'FTE Savings — ATCI by MU',
    rows: [
      { mu: 'ANZ', eligible: 31, adopt: 65, adoptColor: 'var(--purple)', scale: 39, delPlan: '$0.4M', delAct: '$0.5M', geraPlan: '$3.5M', geraAct: '$6.9M', geraActColor: 'var(--teal)', ftePlan: '413', fteAct: '546', delta: '+32%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
      { mu: 'India', eligible: 13, adopt: 54, adoptColor: 'var(--amber)', scale: 23, delPlan: '$0.1M', delAct: '$0.1M', geraPlan: '$2.7M', geraAct: '$1.8M', geraActColor: 'var(--red)', ftePlan: '184', fteAct: '233', delta: '+27%', dClass: 'rgba(76,175,130,.12)', dColor: 'var(--green)' },
      { mu: 'Japan', eligible: 23, adopt: 100, adoptColor: 'var(--teal)', scale: 43, delPlan: '$1.4M', delAct: '$0.7M', geraPlan: '$3.5M', geraAct: '$3.5M', geraActColor: 'var(--text2)', ftePlan: '130', fteAct: '135', delta: '+4%', dClass: 'rgba(76,175,130,.12)', dColor: 'var(--green)' },
      { mu: 'SEA', eligible: 13, adopt: 62, adoptColor: 'var(--purple)', scale: 38, delPlan: '$0.4M', delAct: '$0.2M', geraPlan: '$1.4M', geraAct: '$1.2M', geraActColor: 'var(--red)', ftePlan: '69', fteAct: '139', delta: '+101%', dClass: 'rgba(0,212,170,.12)', dColor: 'var(--teal)' },
      { mu: 'GC', eligible: 2, adopt: 100, adoptColor: 'var(--teal)', scale: 0, delPlan: '$0.3M', delAct: '$0.4M', geraPlan: '$0.6M', geraAct: '$0.5M', geraActColor: 'var(--red)', ftePlan: '51', fteAct: '34', delta: '-33%', dClass: 'rgba(255,92,92,.12)', dColor: 'var(--red)' },
    ],
    savPlan: [3.5, 2.7, 3.5, 1.4, 0.6], savActuals: [6.9, 1.8, 3.5, 1.2, 0.5],
    ftePlan: [413, 184, 130, 69, 51], fteActuals: [546, 233, 135, 139, 34], delActuals: [0.5, 0.1, 0.7, 0.2, 0.4],
    stats: { gera: '$13.9M', gplan: '$11.7M', beat: '+19%', delact: '$2.0M', delplan: '$2.6M', att: '77%' },
    savC1Title: 'GenERA vs GenAI — Actuals by MU ($M)', savC2Title: 'ATCI GenERA Attainment vs Plan ($M)', savC3Title: 'ATCI Savings: GenAI vs GenERA ($M)',
  },
}

// ── HELPERS ─────────────────────────────────────────────────────
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

const STATUS_ORDER = { Scaling: 0, 'Work in Progress': 1, 'Yet to Start': 2, Initiated: 3, 'Not Implementing': 4 }
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

// ── SUBCOMPONENTS ────────────────────────────────────────────────
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

function DrillPanel({ mu, view, contractsData, onClose }) {
  const [sort, setSort] = useState({ col: 'status', dir: 'asc' })
  const scrollRef = useRef(null)

  const data = contractsData?.[view]?.[mu]
  if (!data) return null
  const { stats, contracts } = data

  const scaling = contracts.filter(c => c.step5 === 'Scaling').length
  const wip = contracts.filter(c => c.status === 'Work in Progress').length
  const ni = contracts.filter(c => c.status === 'Not Implementing').length
  const totalUC = contracts.reduce((s, c) => s + (c.uc || 0), 0)

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

  const sorted = [...contracts].sort((a, b) => {
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
          <div className="drill-sub">{contracts.length} contracts · Adoption {stats.adopPct} · Scaling {stats.scalPct} · {totalUC} total use cases</div>
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
            { v: contracts.length, l: 'Total Contracts', c: 'var(--text2)' },
          ].map(s => (
            <div className="ds" key={s.l}>
              <div className="ds-val" style={{ color: s.c }}>{s.v}</div>
              <div className="ds-lbl">{s.l}</div>
            </div>
          ))}
        </div>
        {contracts.length > 8 && (
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
            ↕ Scroll to see all {contracts.length} contracts · Click column headers to sort
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

// ── MAIN COMPONENT ───────────────────────────────────────────────
export default function Dashboard() {
  const theme = 'light'
  const [activeTab, setActiveTab] = useState('overview')
  const [ovView, setOvView] = useState('apac')
  const [muView, setMuView] = useState('apac')
  const [savView, setSavView] = useState('apac')
  const [activeMU, setActiveMU] = useState(null)
  const [apiData, setApiData] = useState(null)
  const charts = useRef({})

  // Fetch live data from Azure Function
  useEffect(() => {
    fetch('/api/dashboard-data')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setApiData(d) })
      .catch(() => {})
  }, [])

  // Apply theme to <html>
  useEffect(() => { document.documentElement.dataset.theme = 'light' }, [])

  // Rebuild charts when view, theme, or data changes
  useEffect(() => { setTimeout(buildOverviewCharts, 50) }, [ovView, theme, activeTab, apiData])
  useEffect(() => { setTimeout(buildMUCharts, 50) }, [muView, theme, activeTab, apiData])
  useEffect(() => { setTimeout(() => { buildSavCharts(); buildClientsSavChart() }, 50) }, [savView, theme, activeTab, apiData])
  useEffect(() => { setTimeout(buildTopClientsChart, 50) }, [activeTab, apiData])

  function mkChart(id, cfg) {
    const el = document.getElementById(id)
    if (!el) return
    if (charts.current[id]) charts.current[id].destroy()
    charts.current[id] = new Chart(el, cfg)
  }

  function buildOverviewCharts() {
    const c = chartColors()
    const liveRows = apiData?.data?.[ovView]?.rows
    const adopt = liveRows ? liveRows.map(r => r.adopt) : (ovView === 'apac' ? [67, 77, 83, 53, 36] : [65, 54, 100, 62, 100])
    const scale = liveRows ? liveRows.map(r => r.scale) : (ovView === 'apac' ? [31, 32, 38, 19, 0]  : [39, 23, 43, 38, 0])
    const donut = apiData?.ovData?.[ovView]?.donut || [36, 31, 15, 14]
    mkChart('adoptionBar', {
      type: 'bar',
      data: {
        labels: MU_LABELS,
        datasets: [
          { label: 'Adoption %', data: adopt, backgroundColor: c.p, borderRadius: 4 },
          { label: 'Scaling %',  data: scale, backgroundColor: c.t, borderRadius: 4 },
          { label: 'Target 70%', data: [70,70,70,70,70], backgroundColor: c.aA, borderColor: c.a, borderWidth: 1, borderRadius: 4 },
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
    const c = chartColors(), d = apiData?.data?.[muView] || DATA[muView], mCb = v => '$' + v + 'M'
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
    const c = chartColors(), d = apiData?.data?.[savView] || DATA[savView], mCb = v => '$' + v + 'M'
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

  function buildClientsSavChart() {
    const c = chartColors()
    const clients = apiData?.clientsChart
    if (savView === 'apac' && clients?.length) {
      mkChart('savClients', {
        type: 'bar',
        data: {
          labels: clients.map(x => x.client.substring(0, 14).toUpperCase()),
          datasets: [
            { label: 'Planned $K',  data: clients.map(x => x.planned),  backgroundColor: c.pA, borderRadius: 3 },
            { label: 'Realized $K', data: clients.map(x => x.realized), backgroundColor: c.t,  borderRadius: 3 },
          ],
        },
        options: { ...baseOpts(), scales: { ...baseOpts().scales, x: { ticks: { color: c.tx, font: { size: 10 }, maxRotation: 40 }, grid: { color: c.gr } }, y: { ticks: { color: c.tx, font: { size: 11 }, callback: v => '$' + v + 'K' }, grid: { color: c.gr } } } },
      })
    } else if (savView === 'apac') {
      mkChart('savClients', {
        type: 'bar',
        data: {
          labels: ['MIZUHO','QBE','NBN','PTT','IDEMITSU','RIO TINTO','TORAY','STD CHAR.','TOKYO ELEC.','SUMITOMO','HIGHMARK','DIC AMS','SINGAPORE CS','KANSAI ELEC.','AMPOL'],
          datasets: [
            { label: 'Planned $K',  data: [270,201,115.5,254.3,110.4,0,134.2,55,30.7,85.9,27.9,68.4,40.4,15.6,0],       backgroundColor: c.pA, borderRadius: 3 },
            { label: 'Realized $K', data: [180,167.8,78.1,103.2,82.8,213.3,67.9,64.5,20.2,85.9,25.2,51.4,31.3,11.8,1], backgroundColor: c.t,  borderRadius: 3 },
          ],
        },
        options: { ...baseOpts(), scales: { ...baseOpts().scales, x: { ticks: { color: c.tx, font: { size: 10 }, maxRotation: 40 }, grid: { color: c.gr } }, y: { ticks: { color: c.tx, font: { size: 11 }, callback: v => '$' + v + 'K' }, grid: { color: c.gr } } } },
      })
    } else {
      const d = apiData?.data?.atci || DATA.atci
      mkChart('savClients', {
        type: 'bar',
        data: { labels: ['GenAI Savings','GenERA Savings'], datasets: [{ label: 'Plan $M', data: [d.stats?.delplan?.replace(/[^0-9.]/g,'') || 2.6, d.stats?.gplan?.replace(/[^0-9.]/g,'') || 11.7], backgroundColor: c.aA, borderColor: c.a, borderWidth: 1, borderRadius: 4 }, { label: 'Actuals $M', data: [d.stats?.delact?.replace(/[^0-9.]/g,'') || 2.0, d.stats?.gera?.replace(/[^0-9.]/g,'') || 13.9], backgroundColor: c.t, borderRadius: 4 }] },
        options: baseOpts(v => '$' + v + 'M'),
      })
    }
  }

  function buildTopClientsChart() {
    if (activeTab !== 'clients') return
    const c = chartColors()
    const clients = apiData?.clientsChart
    if (!clients?.length) return
    mkChart('topClientChart', {
      type: 'bar',
      data: {
        labels: clients.map(x => x.client.substring(0, 16).toUpperCase()),
        datasets: [
          { label: 'Planned $K',  data: clients.map(x => x.planned),  backgroundColor: c.pA, borderRadius: 3 },
          { label: 'Realized $K', data: clients.map(x => x.realized), backgroundColor: c.t,  borderRadius: 3 },
        ],
      },
      options: { ...baseOpts(), scales: { ...baseOpts().scales, x: { ticks: { color: c.tx, font: { size: 10 }, maxRotation: 45 }, grid: { color: c.gr } }, y: { ticks: { color: c.tx, font: { size: 11 }, callback: v => '$' + v + 'K' }, grid: { color: c.gr } } } },
    })
  }

  function toggleMU(mu) {
    setActiveMU(prev => prev === mu ? null : mu)
  }

  const d = apiData?.data?.[muView] || DATA[muView]

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
          <div className="dbadge">Data as of <b>{apiData?.config?.asOf || '30 Apr 2026'}</b></div>
          <div className="dbadge">Source: <b>MMD</b></div>
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
          <div className="sh"><h2>{(apiData?.ovData?.[ovView] || OV_DATA[ovView]).adoptTitle.replace(/&amp;/g, '&')}</h2></div>
          <div className="kg">{(apiData?.ovData?.[ovView] || OV_DATA[ovView]).adopt.map((k, i) => <KpiCard key={i} {...k} />)}</div>
        </div>
        <div className="sec">
          <div className="sh"><h2>{(apiData?.ovData?.[ovView] || OV_DATA[ovView]).savTitle.replace(/&amp;/g, '&')}</h2></div>
          <div className="kg">{(apiData?.ovData?.[ovView] || OV_DATA[ovView]).sav.map((k, i) => <KpiCard key={i} {...k} />)}</div>
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
                {(() => {
                  const dn = apiData?.ovData?.[ovView]?.donut || [36, 31, 15, 14]
                  return [['var(--teal)', 'Scaling', dn[0]], ['var(--purple)', 'Work in Progress', dn[1]], ['var(--gray)', 'Not Implementing', dn[2]], ['var(--amber)', 'Yet to Start', dn[3]]].map(([col, lbl, n]) => (
                    <div className="dlr" key={lbl}><div className="dls" style={{ background: col }} /><span style={{ color: 'var(--text2)', flex: 1 }}>{lbl}</span><span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{n}</span></div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
        <div className="sec">
          <div className="sh"><h2>Performance Summary</h2></div>
          {(() => {
            const ov   = apiData?.ovData?.[ovView]   || OV_DATA[ovView]
            const vd   = apiData?.data?.[ovView]     || DATA[ovView]
            const rows = vd.rows || []
            const adopt  = ov.adopt[0], scale  = ov.adopt[1], elig = ov.adopt[5]
            const geraAct= ov.sav[0],   geraPln= ov.sav[1],   fteAct= ov.sav[2]
            const genAIAct= ov.sav[4]
            const hi  = v => <strong style={{ color:'var(--purple)', fontWeight:600 }}>{v}</strong>
            const pos = v => <strong style={{ color:'var(--teal)',   fontWeight:600 }}>{v}</strong>
            const neg = v => <strong style={{ color:'var(--red)',    fontWeight:600 }}>{v}</strong>
            const label = ovView.toUpperCase()

            const adoptNum  = parseInt(String(adopt.v))
            const scaleNum  = parseInt(String(scale.v))
            const adoptVsTgt = adoptNum - 70
            const scaleVsBmk = scaleNum - 26

            const topAdoptMU = [...rows].sort((a,b) => b.adopt - a.adopt)[0]
            const topSavMU   = [...rows].filter(r => r.geraAct && r.geraAct !== '—')
              .sort((a,b) => parseFloat((b.geraAct||'').replace(/[^0-9.]/g,'')) - parseFloat((a.geraAct||'').replace(/[^0-9.]/g,'')))[0]

            const sentences = [
              <p key="adopt" style={{ margin:0 }}>
                {label} achieved {hi(adopt.v)} adoption across {hi(String(elig.v))} eligible contracts —{' '}
                {adoptVsTgt >= 0
                  ? <>{pos(adoptVsTgt + 'pp ahead')} of the 70% target</>
                  : <>{neg(Math.abs(adoptVsTgt) + 'pp behind')} the 70% target</>}.{' '}
                Agentic AI scaling reached {hi(scale.v)},{' '}
                {scaleVsBmk >= 0
                  ? <>{pos(scaleVsBmk + 'pp above')} the 26% Tech benchmark</>
                  : <>{neg(Math.abs(scaleVsBmk) + 'pp below')} the 26% Tech benchmark</>}.
              </p>,
              <p key="gera" style={{ margin:0 }}>
                GenERA productivity savings stand at {pos(geraAct.v)} against {geraPln.v} planned
                {geraAct.d ? <> — a {pos(geraAct.d)} beat</> : ''}.{' '}
                FTE savings reached {pos(fteAct.v)}{fteAct.d ? <>, {pos(fteAct.d)} vs plan</> : ''}.
              </p>,
              <p key="genai" style={{ margin:0 }}>
                GenAI delivery savings reached {hi(genAIAct.v)}{genAIAct.d ? <> ({genAIAct.d})</> : ''}.
                {topAdoptMU ? <> {hi(topAdoptMU.mu)} leads on adoption at {topAdoptMU.adopt}%{topAdoptMU.geraAct && topAdoptMU.geraAct !== '—' ? <>, with {pos(topAdoptMU.geraAct)} GenERA actuals</> : ''}.</> : ''}
                {topSavMU && topSavMU.mu !== topAdoptMU?.mu ? <> {hi(topSavMU.mu)} leads on GenERA savings at {pos(topSavMU.geraAct)}.</> : ''}
              </p>,
            ]

            return (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 24px', display:'flex', flexDirection:'column', gap:14, fontSize:14.5, lineHeight:1.75, color:'var(--text2)' }}>
                {sentences}
              </div>
            )
          })()}
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
            <DrillPanel mu={activeMU} view={muView} contractsData={apiData?.contracts || CONTRACTS_FALLBACK} onClose={() => setActiveMU(null)} />
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
            {(() => {
              const sv = apiData?.data?.[savView]?.stats || DATA[savView].stats
              return [
                ['var(--teal)',   sv.gera,    'GenERA Actuals'],
                ['var(--purple)', sv.gplan,   'GenERA Planned'],
                ['var(--green)',  sv.beat,    'Beat vs Plan'],
                ['var(--teal)',   sv.delact,  'GenAI Actuals'],
                ['var(--amber)',  sv.delplan, 'GenAI Planned'],
                ['var(--red)',    sv.att,     'Delivery Attainment'],
              ].map(([col, val, lbl]) => (
                <div className="si" key={lbl}><div className="sv" style={{ color: col }}>{val}</div><div className="sl">{lbl}</div></div>
              ))
            })()}
          </div>
          <div className="cg2" style={{ marginBottom: 16 }}>
            <div className="cc">
              <div className="cct">{(apiData?.data?.[savView] || DATA[savView]).savC1Title}</div>
              <div className="leg">
                <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />GenERA</div>
                <div className="li"><div className="ld" style={{ background: 'var(--purple)' }} />GenAI</div>
              </div>
              <div className="cw" style={{ height: 240 }}><canvas id="savCompare" /></div>
            </div>
            <div className="cc">
              <div className="cct">{(apiData?.data?.[savView] || DATA[savView]).savC2Title}</div>
              <div className="leg">
                <div className="li"><div className="ld" style={{ background: 'var(--amber)', opacity: .6 }} />Plan</div>
                <div className="li"><div className="ld" style={{ background: 'var(--teal)' }} />Actuals</div>
              </div>
              <div className="cw" style={{ height: 240 }}><canvas id="savAttain" /></div>
            </div>
          </div>
          <div className="cc">
            <div className="cct">{(apiData?.data?.[savView] || DATA[savView]).savC3Title}</div>
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
            {(apiData?.topClients || [['QBE', 'ANZ · FS · AMS'], ['NBN', 'ANZ · CMT · AMS'], ['Coles Group', 'ANZ · PRD · AMS'], ['Rio Tinto', 'ANZ · RES · AMS'], ['Idemitsu', 'Japan · RES · AMS'], ['Standard Chartered', 'SEA · FS · SI'], ['MUFG', 'Japan · FS · AMS'], ['PTT Group', 'SEA · RES · SI'], ['HSBC', 'SEA · FS · AMS'], ['AMPOL', 'ANZ · RES · AMS'], ['CLP Holdings', 'GC · RES · SI'], ['Singapore CPFB', 'SEA · H&PS · IMS']]).map(([name, meta]) => (
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
      </div>
    </div>
  )
}
