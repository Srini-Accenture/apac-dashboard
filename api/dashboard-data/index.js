const { BlobServiceClient } = require('@azure/storage-blob')
const XLSX = require('xlsx')

// ── Excel sheet structure expected ───────────────────────────────
//
// Sheet: Config        key, value  (e.g. asOf → "30 Apr 2026")
// Sheet: KPI_Cards     view, section, c, l, v, s, d, du
// Sheet: Banners       view, adoptTitle, savTitle, bannerTitle, bannerSub,
//                      bannerAdopt, bannerScale, bannerSav, bannerFte,
//                      tableTitle, chartsTitle, savChartTitle, fteChartTitle,
//                      statsGera, statsGplan, statsBeat, statsDelact, statsDelplan, statsAtt,
//                      savC1, savC2, savC3, donutSc, donutWip, donutNi, donutYts
// Sheet: Highlights    bg, icon, title, body
// Sheet: Benchmarks    c, l, v, s
// Sheet: MU_Rows       view, mu, eligible, adopt, adoptColor, scale,
//                      delPlan, delAct, geraPlan, geraAct, geraActColor,
//                      ftePlan, fteAct, delta, dClass, dColor
// Sheet: Contracts     view, mu, client, dsg, industry, status, step5, uc, genAIPlan, genAIAct, tooling
// Sheet: Clients_Chart client, planned, realized
// Sheet: Top_Clients   name, meta
// ─────────────────────────────────────────────────────────────────

const MU_ORDER = ['ANZ', 'India', 'Japan', 'SEA', 'GC']

function rows(wb, sheetName) {
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in workbook`)
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

function bool(v) {
  return v === true || v === 'TRUE' || v === 1
}

function num(v) {
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0
}

function buildOvData(wb) {
  const banners = rows(wb, 'Banners')
  const kpis = rows(wb, 'KPI_Cards')
  const result = {}

  for (const b of banners) {
    const v = String(b.view).toLowerCase()
    result[v] = {
      adoptTitle: b.adoptTitle,
      savTitle: b.savTitle,
      donut: [Number(b.donutSc), Number(b.donutWip), Number(b.donutNi), Number(b.donutYts)],
      adopt: [],
      sav: [],
    }
  }

  for (const r of kpis) {
    const v = String(r.view).toLowerCase()
    const sec = String(r.section).toLowerCase()
    if (!result[v]) continue
    const card = { c: r.c, l: r.l, v: r.v, s: r.s, du: bool(r.du) }
    if (r.d) card.d = r.d
    result[v][sec].push(card)
  }

  return result
}

function buildData(wb) {
  const banners = rows(wb, 'Banners')
  const muRows = rows(wb, 'MU_Rows')
  const result = {}

  for (const b of banners) {
    const v = String(b.view).toLowerCase()
    result[v] = {
      banner: {
        title: b.bannerTitle, sub: b.bannerSub,
        adopt: b.bannerAdopt, scale: b.bannerScale,
        gensav: b.bannerSav, fte: b.bannerFte,
      },
      tableTitle: b.tableTitle,
      chartsTitle: b.chartsTitle,
      savChartTitle: b.savChartTitle,
      fteChartTitle: b.fteChartTitle,
      stats: {
        gera: b.statsGera, gplan: b.statsGplan, beat: b.statsBeat,
        delact: b.statsDelact, delplan: b.statsDelplan, att: b.statsAtt,
      },
      savC1Title: b.savC1,
      savC2Title: b.savC2,
      savC3Title: b.savC3,
      rows: [],
      savPlan: [], savActuals: [],
      ftePlan: [], fteActuals: [],
      delActuals: [],
    }
  }

  for (const mu of MU_ORDER) {
    for (const v of Object.keys(result)) {
      const r = muRows.find(x => String(x.view).toLowerCase() === v && x.mu === mu)
      if (!r) continue
      result[v].rows.push({
        mu: r.mu,
        eligible: Number(r.eligible),
        adopt: Number(r.adopt),
        adoptColor: r.adoptColor,
        scale: Number(r.scale),
        delPlan: r.delPlan, delAct: r.delAct,
        geraPlan: r.geraPlan, geraAct: r.geraAct, geraActColor: r.geraActColor,
        ftePlan: r.ftePlan, fteAct: r.fteAct,
        delta: r.delta, dClass: r.dClass, dColor: r.dColor,
      })
      result[v].savPlan.push(num(r.geraPlan))
      result[v].savActuals.push(num(r.geraAct))
      result[v].ftePlan.push(num(r.ftePlan))
      result[v].fteActuals.push(num(r.fteAct))
      result[v].delActuals.push(num(r.delAct))
    }
  }

  return result
}

function buildContracts(wb) {
  const contractRows = rows(wb, 'Contracts')
  const result = {}

  for (const r of contractRows) {
    const v = String(r.view).toLowerCase()
    const mu = r.mu
    if (!result[v]) result[v] = {}
    if (!result[v][mu]) result[v][mu] = { stats: null, contracts: [] }
    result[v][mu].contracts.push({
      client: r.client || '—',
      dsg: r.dsg || '—',
      industry: r.industry || '—',
      status: r.status || '—',
      step5: r.step5 || '',
      uc: Number(r.uc) || 0,
      genAIPlan: r.genAIPlan || '—',
      genAIAct: r.genAIAct || '—',
      tooling: r.tooling || '—',
    })
  }

  // Compute per-MU stats from contracts
  for (const v of Object.keys(result)) {
    for (const mu of Object.keys(result[v])) {
      const cs = result[v][mu].contracts
      const adopted = cs.filter(c => c.status !== 'Not Implementing' && c.status !== 'Yet to Start' && c.status !== 'Initiated').length
      const scaling = cs.filter(c => c.status === 'Scaling').length
      result[v][mu].stats = {
        eligible: cs.length,
        adopted,
        scaling,
        wip: cs.filter(c => c.status === 'Work in Progress').length,
        ni: cs.filter(c => c.status === 'Not Implementing').length,
        adopPct: cs.length ? Math.round(adopted / cs.length * 100) + '%' : '0%',
        scalPct: cs.length ? Math.round(scaling / cs.length * 100) + '%' : '0%',
      }
    }
  }

  return result
}

function buildClientsChart(wb) {
  return rows(wb, 'Clients_Chart').map(r => ({
    client: r.client,
    planned: Number(r.planned) || 0,
    realized: Number(r.realized) || 0,
  }))
}

function buildTopClients(wb) {
  return rows(wb, 'Top_Clients').map(r => [r.name, r.meta])
}

function buildConfig(wb) {
  const result = {}
  for (const r of rows(wb, 'Config')) result[r.key] = r.value
  return result
}

function buildHighlights(wb) {
  return rows(wb, 'Highlights').map(r => ({
    bg: r.bg, icon: r.icon, title: r.title, body: r.body,
  }))
}

function buildBenchmarks(wb) {
  return rows(wb, 'Benchmarks').map(r => ({
    c: r.c, l: r.l, v: r.v, s: r.s,
  }))
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
    const blobName = process.env.EXCEL_BLOB_NAME || 'dashboard-data.xlsx'

    const blobClient = BlobServiceClient
      .fromConnectionString(connStr)
      .getContainerClient(container)
      .getBlobClient(blobName)

    const download = await blobClient.download(0)
    const buffer = await streamToBuffer(download.readableStreamBody)
    const wb = XLSX.read(buffer, { type: 'buffer' })

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        config: buildConfig(wb),
        ovData: buildOvData(wb),
        data: buildData(wb),
        contracts: buildContracts(wb),
        clientsChart: buildClientsChart(wb),
        topClients: buildTopClients(wb),
        highlights: buildHighlights(wb),
        benchmarks: buildBenchmarks(wb),
      }),
    }
  } catch (err) {
    context.log.error('dashboard-data:', err.message)
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
