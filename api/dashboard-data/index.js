const { BlobServiceClient } = require('@azure/storage-blob')
const XLSX = require('xlsx')

const MU_ORDER = ['ANZ', 'India', 'Japan', 'SEA', 'GC']
const MU_MAP = { anz:'ANZ', india:'India', japan:'Japan', sea:'SEA', gc:'GC', 'greater china':'GC', 'southeast asia':'SEA' }

function normMU(v) {
  const s = String(v || '').trim()
  return MU_MAP[s.toLowerCase()] || s
}
function sheetJson(wb, name) {
  const ws = wb.Sheets[name]
  return ws ? XLSX.utils.sheet_to_json(ws, { defval: '' }) : []
}
function num(v) {
  const n = parseFloat(String(v || '').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
function fmtM(kDollars) {
  const m = kDollars / 1000
  const r = Math.round(m * 10) / 10
  return '$' + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + 'M'
}
function fmtK(k) {
  if (!k) return '—'
  const r = Math.round(k * 10) / 10
  return '$' + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + 'K'
}
function adoptColorVar(pct) {
  if (pct >= 100) return 'var(--teal)'
  if (pct >= 60)  return 'var(--purple)'
  if (pct >= 50)  return 'var(--amber)'
  return 'var(--red)'
}
function deltaInfo(ftePlan, fteAct) {
  if (!ftePlan) return { delta: '—', dClass: '', dColor: 'var(--text2)' }
  const pct = Math.round((fteAct - ftePlan) / ftePlan * 100)
  const s = (pct >= 0 ? '+' : '') + pct + '%'
  if (pct < 0)   return { delta: s, dClass: 'rgba(255,92,92,.12)',   dColor: 'var(--red)' }
  if (pct <= 25) return { delta: s, dClass: 'rgba(76,175,130,.12)',  dColor: 'var(--green)' }
  return             { delta: s, dClass: 'rgba(0,212,170,.12)',    dColor: 'var(--teal)' }
}

// ── Parse MMD Export for contract drill data ──────────────────────
function parseContracts(wb) {
  const out = { apac: {}, atci: {} }
  for (const r of sheetJson(wb, 'MMD Export')) {
    const mu = normMU(r['MarketUnit'])
    if (!MU_ORDER.includes(mu)) continue
    const isAtci = String(r['ATCI'] || '').trim().toUpperCase() === 'Y'
    const contract = {
      client:    String(r['Client']   || '').trim() || '—',
      dsg:       String(r['DSG']      || '').trim() || '—',
      industry:  String(r['Industry'] || '').trim() || '—',
      status:    String(r['Progress'] || '').trim() || '—',
      step5:     String(r['(Step 5) Scaled production implementation started'] || '').trim(),
      uc:        num(r['#UseCases Implementation in Contract']),
      genAIPlan: fmtK(num(r['Planned Savings ($K)'])),
      genAIAct:  fmtK(num(r['Realized Savings ($K)'])),
      tooling:   String(r['Tooling']  || '').trim() || '—',
    }
    if (!out.apac[mu]) out.apac[mu] = { stats: null, contracts: [] }
    out.apac[mu].contracts.push(contract)
    if (isAtci) {
      if (!out.atci[mu]) out.atci[mu] = { stats: null, contracts: [] }
      out.atci[mu].contracts.push(contract)
    }
  }
  const EXCLUDE = new Set(['Not Implementing', 'Yet to Start', 'Initiated', '—', ''])
  for (const view of ['apac', 'atci']) {
    for (const mu of Object.keys(out[view])) {
      const cs = out[view][mu].contracts
      const adopted  = cs.filter(c => !EXCLUDE.has(c.status)).length
      const scaling  = cs.filter(c => c.step5 === 'Scaling').length
      out[view][mu].stats = {
        eligible: cs.length, adopted, scaling,
        wip:     cs.filter(c => c.status === 'Work in Progress').length,
        ni:      cs.filter(c => c.status === 'Not Implementing').length,
        adopPct: cs.length ? Math.round(adopted  / cs.length * 100) + '%' : '0%',
        scalPct: cs.length ? Math.round(scaling  / cs.length * 100) + '%' : '0%',
      }
    }
  }
  return out
}

// ── Parse GenERA Export for savings by MU/view ───────────────────
function parseGenERA(wb) {
  const result = { apac: {}, atci: {} }
  function add(target, mu, r) {
    if (!target[mu]) target[mu] = { ftePlan:0, fteAct:0, geraPlanK:0, geraActK:0, genAIPlanK:0, genAIActK:0 }
    target[mu].ftePlan    += num(r['Plan Productivity- FTE Savings'])
    target[mu].fteAct     += num(r['Actual Productivity- FTE Savings'])
    target[mu].geraPlanK  += num(r['$ Planned Productivity (CCI Impact + Client Benefit) ($K)'])
    target[mu].geraActK   += num(r['$ Realized Productivity (CCI Impact + Client Benefit) ($K)'])
    target[mu].genAIPlanK += num(r['$ GenAI Planned Productivity ($K)'])
    target[mu].genAIActK  += num(r['$ GenAI Realized Productivity ($K)'])
  }
  for (const r of sheetJson(wb, 'GenERA Export')) {
    const mu = normMU(r['Market Unit'])
    if (!MU_ORDER.includes(mu)) continue
    add(result.apac, mu, r)
    if (String(r['ATCI'] || '').trim().toUpperCase() === 'Y') add(result.atci, mu, r)
  }
  return result
}

// ── Build per-view MU table + chart arrays ────────────────────────
function buildViewData(view, contracts, geraByMU) {
  const rows = [], savPlan = [], savActuals = [], ftePlan = [], fteActuals = [], delActuals = []
  let totElig=0, totAdopt=0, totScale=0, totFtePlan=0, totFteAct=0
  let totGeraPlanK=0, totGeraActK=0, totGenAIPlanK=0, totGenAIActK=0

  for (const mu of MU_ORDER) {
    const mc = contracts[view]?.[mu]
    const gs = geraByMU[view]?.[mu] || {}
    if (!mc) {
      rows.push({ mu, eligible:0, adopt:0, adoptColor:'var(--gray)', scale:0, delPlan:'—', delAct:'—', geraPlan:'—', geraAct:'—', geraActColor:'var(--text2)', ftePlan:'—', fteAct:'—', delta:'—', dClass:'', dColor:'var(--text2)' })
      savPlan.push(0); savActuals.push(0); ftePlan.push(0); fteActuals.push(0); delActuals.push(0)
      continue
    }
    const { eligible, adopted, scaling } = mc.stats
    const adoptPct   = eligible ? Math.round(adopted  / eligible * 100) : 0
    const scalePct   = eligible ? Math.round(scaling  / eligible * 100) : 0
    const ftePlanV   = Math.round(gs.ftePlan    || 0)
    const fteActV    = Math.round(gs.fteAct     || 0)
    const geraPlanKV = gs.geraPlanK   || 0
    const geraActKV  = gs.geraActK    || 0
    const genAIPlanKV= gs.genAIPlanK  || 0
    const genAIActKV = gs.genAIActK   || 0
    const di = deltaInfo(ftePlanV, fteActV)

    rows.push({
      mu, eligible,
      adopt: adoptPct, adoptColor: adoptColorVar(adoptPct),
      scale: scalePct,
      delPlan:  genAIPlanKV ? fmtM(genAIPlanKV) : '—',
      delAct:   genAIActKV  ? fmtM(genAIActKV)  : '—',
      geraPlan: geraPlanKV  ? fmtM(geraPlanKV)  : '—',
      geraAct:  geraActKV   ? fmtM(geraActKV)   : '—',
      geraActColor: geraActKV > geraPlanKV ? 'var(--teal)' : geraActKV < geraPlanKV ? 'var(--red)' : 'var(--text2)',
      ftePlan: ftePlanV.toLocaleString(),
      fteAct:  fteActV.toLocaleString(),
      ...di,
    })
    savPlan.push(Math.round(geraPlanKV  / 100) / 10)
    savActuals.push(Math.round(geraActKV  / 100) / 10)
    ftePlan.push(ftePlanV); fteActuals.push(fteActV)
    delActuals.push(Math.round(genAIActKV / 100) / 10)

    totElig += eligible; totAdopt += adopted; totScale += scaling
    totFtePlan += ftePlanV; totFteAct += fteActV
    totGeraPlanK += geraPlanKV; totGeraActK += geraActKV
    totGenAIPlanK += genAIPlanKV; totGenAIActK += genAIActKV
  }

  const adoptPct = totElig ? Math.round(totAdopt / totElig * 100) : 0
  const scalePct = totElig ? Math.round(totScale / totElig * 100) : 0
  const beatPct  = totGeraPlanK ? Math.round((totGeraActK - totGeraPlanK) / totGeraPlanK * 100) : 0
  const attPct   = totGenAIPlanK ? Math.round(totGenAIActK / totGenAIPlanK * 100) : 0
  const T = view.toUpperCase()

  return {
    banner: {
      title: view === 'apac' ? 'APAC — All Market Units' : 'APAC ATCI — Market Units',
      sub: `${totElig} eligible contracts · Target 70% adoption · 5 MUs`,
      adopt: adoptPct + '%', scale: scalePct + '%',
      gensav: totGeraActK ? fmtM(totGeraActK) : '—',
      fte: totFteAct.toLocaleString(),
    },
    tableTitle:    view === 'apac' ? 'APAC Market Unit Performance' : 'ATCI Market Unit Performance',
    chartsTitle:   view === 'apac' ? 'APAC Savings Charts' : 'ATCI Savings Charts',
    savChartTitle: `GenERA Savings ($M) — ${T} by MU`,
    fteChartTitle: `FTE Savings — ${T} by MU`,
    rows, savPlan, savActuals, ftePlan, fteActuals, delActuals,
    stats: {
      gera:    totGeraActK   ? fmtM(totGeraActK)   : '—',
      gplan:   totGeraPlanK  ? fmtM(totGeraPlanK)  : '—',
      beat:    (beatPct >= 0 ? '+' : '') + beatPct  + '%',
      delact:  totGenAIActK  ? fmtM(totGenAIActK)  : '—',
      delplan: totGenAIPlanK ? fmtM(totGenAIPlanK) : '—',
      att:     attPct + '%',
    },
    savC1Title: 'GenERA vs GenAI — Actuals by MU ($M)',
    savC2Title: view === 'apac' ? 'GenERA Attainment vs Plan ($M)' : 'ATCI GenERA Attainment vs Plan ($M)',
    savC3Title: view === 'apac' ? 'Top APAC clients by realized savings ($K)' : 'ATCI Savings: GenAI vs GenERA ($M)',
  }
}

function buildData(contracts, geraByMU) {
  return {
    apac: buildViewData('apac', contracts, geraByMU),
    atci: buildViewData('atci', contracts, geraByMU),
  }
}

// ── Build overview KPI cards ─────────────────────────────────────
function buildOvData(contracts, geraByMU) {
  const result = {}
  for (const view of ['apac', 'atci']) {
    let totElig=0, totAdopt=0, totScale=0
    let totFtePlan=0, totFteAct=0
    let totGeraPlanK=0, totGeraActK=0, totGenAIPlanK=0, totGenAIActK=0
    let sc=0, wip=0, ni=0, yts=0

    for (const mu of MU_ORDER) {
      const mc = contracts[view]?.[mu]
      const gs = geraByMU[view]?.[mu] || {}
      if (!mc) continue
      const { eligible, adopted, scaling } = mc.stats
      totElig += eligible; totAdopt += adopted; totScale += scaling
      totFtePlan    += Math.round(gs.ftePlan    || 0)
      totFteAct     += Math.round(gs.fteAct     || 0)
      totGeraPlanK  += gs.geraPlanK   || 0
      totGeraActK   += gs.geraActK    || 0
      totGenAIPlanK += gs.genAIPlanK  || 0
      totGenAIActK  += gs.genAIActK   || 0
      sc  += mc.contracts.filter(c => c.step5 === 'Scaling').length
      wip += mc.contracts.filter(c => c.status === 'Work in Progress').length
      ni  += mc.contracts.filter(c => c.status === 'Not Implementing').length
      yts += mc.contracts.filter(c => c.status === 'Yet to Start' || c.status === 'Initiated').length
    }

    const adoptPct   = totElig ? Math.round(totAdopt / totElig * 100) : 0
    const scalePct   = totElig ? Math.round(totScale / totElig * 100) : 0
    const fteVsPlan  = totFtePlan ? Math.round((totFteAct - totFtePlan) / totFtePlan * 100) : 0
    const geraVsPlan = totGeraPlanK ? Math.round((totGeraActK - totGeraPlanK) / totGeraPlanK * 100) : 0
    const genAIAtt   = totGenAIPlanK ? Math.round(totGenAIActK / totGenAIPlanK * 100) : 0
    const T = view.toUpperCase()

    result[view] = {
      adoptTitle: `Adoption & Scaling — ${T}`,
      savTitle:   `GenERA & Delivery Savings — ${T}`,
      donut: [sc, wip, ni, yts],
      adopt: [
        { c:'cp', l:'FY26 Adoption Actual',  v: adoptPct+'%',               s: totAdopt+' contracts',              d:(adoptPct-70>=0?'▲ ':'▼ ')+Math.abs(adoptPct-70)+'pp vs target',    du:true },
        { c:'ct', l:'Agentic AI Scaling',    v: scalePct+'%',               s: totScale+' contracts',              d:(scalePct-26>=0?'▲ ':'▼ ')+Math.abs(scalePct-26)+'pp vs benchmark', du:true },
        { c:'ca', l:'Adoption Target',        v:'70%',                       s:'Top-down FY26 target' },
        { c:'cg', l:'Tech Avg Adoption',      v:'55%',                       s:'Industry average' },
        { c:'ct', l:'Scaling Benchmark',      v:'26%',                       s:'Tech scaling benchmark' },
        { c:'cp', l:'Total Eligible',          v: totElig,                    s:`${T} eligible contracts` },
      ],
      sav: [
        { c:'ct', l:'GenERA Actuals',         v: totGeraActK   ? fmtM(totGeraActK)   : '—', s:'vs '+(totGeraPlanK  ? fmtM(totGeraPlanK)  : '—')+' planned', d:(geraVsPlan>=0?'+':'')+geraVsPlan+'%', du:true },
        { c:'cp', l:'GenERA Planned',         v: totGeraPlanK  ? fmtM(totGeraPlanK)  : '—', s:`FY26 ${T} GenERA plan` },
        { c:'cg', l:'FTE Savings Actuals',    v: totFteAct.toLocaleString(),               s:'vs '+totFtePlan.toLocaleString()+' planned', d:(fteVsPlan>=0?'+':'')+fteVsPlan+'%', du:true },
        { c:'ca', l:'FTE Savings Target',     v: view==='apac' ? '6,518' : '2,373',        s:'Full-year target' },
        { c:'ct', l:'GenAI Savings Actuals',  v: totGenAIActK  ? fmtM(totGenAIActK)  : '—', s:'vs '+(totGenAIPlanK ? fmtM(totGenAIPlanK) : '—')+' plan',    d: genAIAtt+'% attainment', du:false },
        { c:'cr', l:'GenAI Savings Target',   v: view==='apac' ? '$16M' : '$8M',            s:`Top-down ${T} target` },
      ],
    }
  }
  return result
}

// ── Client savings chart (top 15 by realized) ────────────────────
function buildClientsChart(wb) {
  const byClient = {}
  for (const r of sheetJson(wb, 'GenERA Export')) {
    const client = String(r['Client'] || '').trim()
    if (!client) continue
    if (!byClient[client]) byClient[client] = { planned: 0, realized: 0 }
    byClient[client].planned  += num(r['$ Planned Productivity (CCI Impact + Client Benefit) ($K)'])
    byClient[client].realized += num(r['$ Realized Productivity (CCI Impact + Client Benefit) ($K)'])
  }
  return Object.entries(byClient)
    .map(([client, d]) => ({ client, planned: Math.round(d.planned*10)/10, realized: Math.round(d.realized*10)/10 }))
    .filter(x => x.realized > 0 || x.planned > 0)
    .sort((a, b) => b.realized - a.realized)
    .slice(0, 15)
}

function buildTopClients(wb) {
  const byClient = {}
  for (const r of sheetJson(wb, 'GenERA Export')) {
    const client = String(r['Client'] || '').trim()
    if (!client) continue
    const mu = normMU(r['Market Unit'])
    const dsg = String(r['DSG'] || '').trim()
    if (!byClient[client]) byClient[client] = { mu, dsg, realized: 0 }
    byClient[client].realized += num(r['$ Realized Productivity (CCI Impact + Client Benefit) ($K)'])
  }
  return Object.entries(byClient)
    .sort((a, b) => b[1].realized - a[1].realized)
    .slice(0, 12)
    .map(([name, d]) => [name, `${d.mu} · ${d.dsg}`])
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', d => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

module.exports = async function (context, req) {
  try {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING
    if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING app setting is missing')

    const container = process.env.STORAGE_CONTAINER || 'dashboard'
    const blobName  = process.env.EXCEL_BLOB_NAME   || 'dashboard-data.xlsx'

    const blobClient = BlobServiceClient
      .fromConnectionString(connStr)
      .getContainerClient(container)
      .getBlobClient(blobName)

    const download = await blobClient.download(0)
    const buffer   = await streamToBuffer(download.readableStreamBody)
    const wb       = XLSX.read(buffer, { type: 'buffer' })

    const contracts    = parseContracts(wb)
    const geraByMU     = parseGenERA(wb)
    const data         = buildData(contracts, geraByMU)
    const ovData       = buildOvData(contracts, geraByMU)
    const clientsChart = buildClientsChart(wb)
    const topClients   = buildTopClients(wb)

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        config: { asOf: '30 Apr 2026' },
        ovData, data, contracts, clientsChart, topClients,
        highlights: [
          { bg:'var(--hl-t)', icon:'🚀', title:'Scaling ahead of the curve',  body:'31% of eligible contracts scaled, outperforming the Tech benchmark of 26%.' },
          { bg:'var(--hl-p)', icon:'📈', title:'Adoption at scale',            body:'72% of APAC contracts live on GenAI / Agentic AI — ahead of the 55% Tech average.' },
          { bg:'var(--hl-g)', icon:'⚡', title:'Proven productivity impact',   body:'Average gains: 3.8% in AMS/IMS and 6.6% in SI engagements.' },
          { bg:'var(--hl-a)', icon:'🏗️', title:'AI Hub by design',            body:'Dedicated AI Hub of ~60 architects and engineers (currently 32, 40 by mid-May).' },
          { bg:'var(--hl-p)', icon:'🌏', title:'Pilots to scale',              body:'34 AI success stories across 31 APAC clients — NBN, QBE, CLP Holdings, AMPOL, Singapore CPFB.' },
          { bg:'var(--hl-t)', icon:'💰', title:'GenERA outperformance',        body:'$55.5M actuals vs $39M planned — 42% beat. FTE savings 57% above plan.' },
        ],
        benchmarks: [
          { c:'ct', l:'AMS/IMS Productivity',   v:'3.8%',  s:'Average APAC AMS/IMS' },
          { c:'cp', l:'SI Productivity',         v:'6.6%',  s:'Average APAC SI' },
          { c:'cg', l:'Maybank GHCP Story Pts',  v:'+36%',  s:'Story points per hour' },
          { c:'ca', l:'Maybank Unit Tests',       v:'+59%',  s:'Test cases per hour' },
          { c:'ct', l:'UBE RICEF FTE Saving',    v:'7 FTE', s:'900 RICEF in 25 days' },
          { c:'cp', l:'Highmark Use Cases',       v:'18',    s:'100% in production' },
        ],
      }),
    }
  } catch (err) {
    context.log.error('dashboard-data:', err.message)
    let sheetDiag = null
    try {
      const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING
      if (connStr) {
        const blobClient = BlobServiceClient
          .fromConnectionString(connStr)
          .getContainerClient(process.env.STORAGE_CONTAINER || 'dashboard')
          .getBlobClient(process.env.EXCEL_BLOB_NAME || 'dashboard-data.xlsx')
        const download = await blobClient.download(0)
        const buffer   = await streamToBuffer(download.readableStreamBody)
        const wb       = XLSX.read(buffer, { type: 'buffer' })
        sheetDiag = {}
        for (const name of wb.SheetNames) {
          const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 })
          sheetDiag[name] = r[0] || []
        }
      }
    } catch (_) {}
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, sheets: sheetDiag }),
    }
  }
}
