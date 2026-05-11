// Run from project root: npm run generate-excel
// Output: dashboard-data.xlsx  → upload to Azure Blob Storage
//         dashboard-data.json  → used by local dev server (npm run dev)

const XLSX = require('xlsx')
const fs   = require('fs')
const path = require('path')
const contracts = require('../src/data/contracts.json')

// ── Sheet: KPI_Cards ────────────────────────────────────────────
const kpiCards = [
  // APAC — Adoption
  { view:'apac', section:'adopt', c:'cp', l:'FY26 Adoption Actual',  v:'72%',    s:'270 contracts',           d:'▲ 2pp vs target',      du:true  },
  { view:'apac', section:'adopt', c:'ct', l:'Agentic AI Scaling',     v:'31%',    s:'117 contracts',           d:'▲ 5pp vs benchmark',   du:true  },
  { view:'apac', section:'adopt', c:'ca', l:'Adoption Target',        v:'70%',    s:'Top-down FY26 target',    d:'',                     du:false },
  { view:'apac', section:'adopt', c:'cg', l:'Tech Avg Adoption',      v:'55%',    s:'Industry average',        d:'',                     du:false },
  { view:'apac', section:'adopt', c:'ct', l:'Scaling Benchmark',      v:'26%',    s:'Tech scaling benchmark',  d:'',                     du:false },
  { view:'apac', section:'adopt', c:'cp', l:'Total Eligible',         v:'377',    s:'APAC eligible contracts', d:'',                     du:false },
  // APAC — Savings
  { view:'apac', section:'sav',   c:'ct', l:'Savings Actuals',        v:'$55.5M', s:'vs $39M planned',         d:'+42%',                 du:true  },
  { view:'apac', section:'sav',   c:'cp', l:'Savings Planned',        v:'$39M',   s:'FY26 GenERA plan',        d:'',                     du:false },
  { view:'apac', section:'sav',   c:'cg', l:'FTE Savings Actuals',    v:'3,571',  s:'vs 2,279 planned',        d:'+57%',                 du:true  },
  { view:'apac', section:'sav',   c:'ca', l:'FTE Savings Target',     v:'6,518',  s:'Full-year target',        d:'',                     du:false },
  { view:'apac', section:'sav',   c:'ct', l:'GenAI Savings Actuals',  v:'$6.4M',  s:'vs $11M plan',            d:'58% attainment',       du:false },
  { view:'apac', section:'sav',   c:'cr', l:'GenAI Savings Target',   v:'$16M',   s:'Top-down GenAI target',   d:'',                     du:false },
  // ATCI — Adoption
  { view:'atci', section:'adopt', c:'cp', l:'FY26 Adoption Actual',   v:'73%',    s:'60 contracts',            d:'▲ 3pp vs target',      du:true  },
  { view:'atci', section:'adopt', c:'ct', l:'Agentic AI Scaling',     v:'37%',    s:'30 contracts',            d:'▲ 11pp vs benchmark',  du:true  },
  { view:'atci', section:'adopt', c:'ca', l:'Adoption Target',        v:'70%',    s:'Top-down FY26 target',    d:'',                     du:false },
  { view:'atci', section:'adopt', c:'cg', l:'Tech Avg Adoption',      v:'55%',    s:'Industry average',        d:'',                     du:false },
  { view:'atci', section:'adopt', c:'ct', l:'Scaling Benchmark',      v:'26%',    s:'Tech scaling benchmark',  d:'',                     du:false },
  { view:'atci', section:'adopt', c:'cp', l:'Total Eligible',         v:'82',     s:'ATCI eligible contracts', d:'',                     du:false },
  // ATCI — Savings
  { view:'atci', section:'sav',   c:'ct', l:'GenERA Actuals',         v:'$13.9M', s:'vs $11.7M planned',       d:'+19%',                 du:true  },
  { view:'atci', section:'sav',   c:'cp', l:'GenERA Planned',         v:'$11.7M', s:'FY26 ATCI GenERA plan',   d:'',                     du:false },
  { view:'atci', section:'sav',   c:'cg', l:'FTE Savings Actuals',    v:'1,086',  s:'vs 848 planned',          d:'+28%',                 du:true  },
  { view:'atci', section:'sav',   c:'ca', l:'FTE Savings Target',     v:'2,373',  s:'Full-year ATCI target',   d:'',                     du:false },
  { view:'atci', section:'sav',   c:'ct', l:'GenAI Savings Actuals',  v:'$2.0M',  s:'vs $2.6M plan',           d:'77% attainment',       du:false },
  { view:'atci', section:'sav',   c:'cr', l:'GenAI Savings Target',   v:'$8M',    s:'Top-down GenAI target',   d:'',                     du:false },
]

// ── Sheet: Banners ───────────────────────────────────────────────
const banners = [
  {
    view:'apac',
    adoptTitle:'Adoption & Scaling — APAC',
    savTitle:'GenERA & Delivery Savings — APAC',
    bannerTitle:'APAC — All Market Units',
    bannerSub:'377 eligible contracts · Target 70% adoption · 5 MUs',
    bannerAdopt:'72%', bannerScale:'31%', bannerSav:'$55.5M', bannerFte:'3,571',
    tableTitle:'APAC Market Unit Performance',
    chartsTitle:'APAC Savings Charts',
    savChartTitle:'GenERA Savings ($M) — APAC by MU',
    fteChartTitle:'FTE Savings — APAC by MU',
    statsGera:'$55.5M', statsGplan:'$39M',   statsBeat:'+42%',
    statsDelact:'$6.4M', statsDelplan:'$11M', statsAtt:'58%',
    savC1:'GenERA vs GenAI — Actuals by MU ($M)',
    savC2:'GenERA Attainment vs Plan ($M)',
    savC3:'Top APAC clients by realized savings ($K)',
    donutSc:36, donutWip:31, donutNi:15, donutYts:14,
  },
  {
    view:'atci',
    adoptTitle:'Adoption & Scaling — ATCI',
    savTitle:'GenERA & Delivery Savings — ATCI',
    bannerTitle:'APAC ATCI — Market Units',
    bannerSub:'82 eligible contracts · Savings target $8M · 5 MUs',
    bannerAdopt:'73%', bannerScale:'37%', bannerSav:'$13.9M', bannerFte:'1,086',
    tableTitle:'ATCI Market Unit Performance',
    chartsTitle:'ATCI Savings Charts',
    savChartTitle:'GenERA Savings ($M) — ATCI by MU',
    fteChartTitle:'FTE Savings — ATCI by MU',
    statsGera:'$13.9M', statsGplan:'$11.7M', statsBeat:'+19%',
    statsDelact:'$2.0M', statsDelplan:'$2.6M', statsAtt:'77%',
    savC1:'GenERA vs GenAI — Actuals by MU ($M)',
    savC2:'ATCI GenERA Attainment vs Plan ($M)',
    savC3:'ATCI Savings: GenAI vs GenERA ($M)',
    donutSc:36, donutWip:31, donutNi:15, donutYts:14,
  },
]

// ── Sheet: MU_Rows ───────────────────────────────────────────────
const muRows = [
  // APAC
  { view:'apac', mu:'ANZ',   eligible:83,  adopt:67,  adoptColor:'var(--purple)', scale:31, delPlan:'$1.3M', delAct:'$0.9M', geraPlan:'$8.0M',  geraAct:'$12.2M', geraActColor:'var(--teal)',  ftePlan:'555',   fteAct:'1,009', delta:'+82%',  dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  { view:'apac', mu:'India', eligible:47,  adopt:77,  adoptColor:'var(--purple)', scale:32, delPlan:'$0.4M', delAct:'$0.2M', geraPlan:'$7.3M',  geraAct:'$5.2M',  geraActColor:'var(--red)',   ftePlan:'633',   fteAct:'660',   delta:'+4%',   dClass:'rgba(76,175,130,.12)', dColor:'var(--green)' },
  { view:'apac', mu:'Japan', eligible:162, adopt:83,  adoptColor:'var(--purple)', scale:38, delPlan:'$8.6M', delAct:'$4.5M', geraPlan:'$20.8M', geraAct:'$31.9M', geraActColor:'var(--teal)',  ftePlan:'838',   fteAct:'1,159', delta:'+38%',  dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  { view:'apac', mu:'SEA',   eligible:74,  adopt:53,  adoptColor:'var(--amber)',  scale:19, delPlan:'$0.4M', delAct:'$0.4M', geraPlan:'$2.3M',  geraAct:'$5.2M',  geraActColor:'var(--teal)',  ftePlan:'200',   fteAct:'666',   delta:'+233%', dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  { view:'apac', mu:'GC',    eligible:11,  adopt:36,  adoptColor:'var(--red)',    scale:0,  delPlan:'$0.3M', delAct:'$0.5M', geraPlan:'$0.6M',  geraAct:'$0.9M',  geraActColor:'var(--teal)',  ftePlan:'53',    fteAct:'78',    delta:'+47%',  dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  // ATCI
  { view:'atci', mu:'ANZ',   eligible:31,  adopt:65,  adoptColor:'var(--purple)', scale:39, delPlan:'$0.4M', delAct:'$0.5M', geraPlan:'$3.5M',  geraAct:'$6.9M',  geraActColor:'var(--teal)',  ftePlan:'413',   fteAct:'546',   delta:'+32%',  dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  { view:'atci', mu:'India', eligible:13,  adopt:54,  adoptColor:'var(--amber)',  scale:23, delPlan:'$0.1M', delAct:'$0.1M', geraPlan:'$2.7M',  geraAct:'$1.8M',  geraActColor:'var(--red)',   ftePlan:'184',   fteAct:'233',   delta:'+27%',  dClass:'rgba(76,175,130,.12)', dColor:'var(--green)' },
  { view:'atci', mu:'Japan', eligible:23,  adopt:100, adoptColor:'var(--teal)',   scale:43, delPlan:'$1.4M', delAct:'$0.7M', geraPlan:'$3.5M',  geraAct:'$3.5M',  geraActColor:'var(--text2)', ftePlan:'130',   fteAct:'135',   delta:'+4%',   dClass:'rgba(76,175,130,.12)', dColor:'var(--green)' },
  { view:'atci', mu:'SEA',   eligible:13,  adopt:62,  adoptColor:'var(--purple)', scale:38, delPlan:'$0.4M', delAct:'$0.2M', geraPlan:'$1.4M',  geraAct:'$1.2M',  geraActColor:'var(--red)',   ftePlan:'69',    fteAct:'139',   delta:'+101%', dClass:'rgba(0,212,170,.12)',  dColor:'var(--teal)'  },
  { view:'atci', mu:'GC',    eligible:2,   adopt:100, adoptColor:'var(--teal)',   scale:0,  delPlan:'$0.3M', delAct:'$0.4M', geraPlan:'$0.6M',  geraAct:'$0.5M',  geraActColor:'var(--red)',   ftePlan:'51',    fteAct:'34',    delta:'-33%',  dClass:'rgba(255,92,92,.12)',  dColor:'var(--red)'   },
]

// ── Sheet: Clients_Chart ─────────────────────────────────────────
const clientsChart = [
  { client:'MIZUHO',        planned:270,   realized:180   },
  { client:'QBE',           planned:201,   realized:167.8 },
  { client:'NBN',           planned:115.5, realized:78.1  },
  { client:'PTT',           planned:254.3, realized:103.2 },
  { client:'IDEMITSU',      planned:110.4, realized:82.8  },
  { client:'RIO TINTO',     planned:0,     realized:213.3 },
  { client:'TORAY',         planned:134.2, realized:67.9  },
  { client:'STD CHAR.',     planned:55,    realized:64.5  },
  { client:'TOKYO ELEC.',   planned:30.7,  realized:20.2  },
  { client:'SUMITOMO',      planned:85.9,  realized:85.9  },
  { client:'HIGHMARK',      planned:27.9,  realized:25.2  },
  { client:'DIC AMS',       planned:68.4,  realized:51.4  },
  { client:'SINGAPORE CS',  planned:40.4,  realized:31.3  },
  { client:'KANSAI ELEC.',  planned:15.6,  realized:11.8  },
  { client:'AMPOL',         planned:0,     realized:1     },
]

// ── Sheet: Top_Clients ───────────────────────────────────────────
const topClients = [
  { name:'QBE',               meta:'ANZ · FS · AMS'     },
  { name:'NBN',               meta:'ANZ · CMT · AMS'    },
  { name:'Coles Group',       meta:'ANZ · PRD · AMS'    },
  { name:'Rio Tinto',         meta:'ANZ · RES · AMS'    },
  { name:'Idemitsu',          meta:'Japan · RES · AMS'  },
  { name:'Standard Chartered',meta:'SEA · FS · SI'      },
  { name:'MUFG',              meta:'Japan · FS · AMS'   },
  { name:'PTT Group',         meta:'SEA · RES · SI'     },
  { name:'HSBC',              meta:'SEA · FS · AMS'     },
  { name:'AMPOL',             meta:'ANZ · RES · AMS'    },
  { name:'CLP Holdings',      meta:'GC · RES · SI'      },
  { name:'Singapore CPFB',    meta:'SEA · H&PS · IMS'   },
]

// ── Sheet: Config ────────────────────────────────────────────────
const config = [
  { key: 'asOf', value: '30 Apr 2026' },
]

// ── Sheet: Highlights ────────────────────────────────────────────
const highlights = [
  { bg:'var(--hl-t)', icon:'🚀', title:'Scaling ahead of the curve',   body:'31% of eligible contracts scaled, outperforming the Tech benchmark of 26%.' },
  { bg:'var(--hl-p)', icon:'📈', title:'Adoption at scale',             body:'72% of APAC contracts live on GenAI / Agentic AI — ahead of the 55% Tech average.' },
  { bg:'var(--hl-g)', icon:'⚡', title:'Proven productivity impact',    body:'Average gains: 3.8% in AMS/IMS and 6.6% in SI engagements.' },
  { bg:'var(--hl-a)', icon:'🏗️', title:'AI Hub by design',             body:'Dedicated AI Hub of ~60 architects and engineers (currently 32, 40 by mid-May).' },
  { bg:'var(--hl-p)', icon:'🌏', title:'Pilots to scale',               body:'34 AI success stories across 31 APAC clients — NBN, QBE, CLP Holdings, AMPOL, Singapore CPFB.' },
  { bg:'var(--hl-t)', icon:'💰', title:'GenERA outperformance',         body:'$55.5M actuals vs $39M planned — 42% beat. FTE savings 57% above plan.' },
]

// ── Sheet: Benchmarks ────────────────────────────────────────────
const benchmarks = [
  { c:'ct', l:'AMS/IMS Productivity',    v:'3.8%',  s:'Average APAC AMS/IMS'    },
  { c:'cp', l:'SI Productivity',         v:'6.6%',  s:'Average APAC SI'          },
  { c:'cg', l:'Maybank GHCP Story Pts',  v:'+36%',  s:'Story points per hour'    },
  { c:'ca', l:'Maybank Unit Tests',      v:'+59%',  s:'Test cases per hour'      },
  { c:'ct', l:'UBE RICEF FTE Saving',    v:'7 FTE', s:'900 RICEF in 25 days'    },
  { c:'cp', l:'Highmark Use Cases',      v:'18',    s:'100% in production'       },
]

// ── Sheet: Contracts (from contracts.json) ───────────────────────
const contractRows = []
for (const [view, muData] of Object.entries(contracts)) {
  for (const [mu, muObj] of Object.entries(muData)) {
    for (const c of muObj.contracts) {
      contractRows.push({
        view,
        mu,
        client:    c.client    || '',
        dsg:       c.dsg       || '',
        industry:  c.industry  || '',
        status:    c.status    || '',
        step5:     c.step5     || '',
        uc:        c.uc        || 0,
        genAIPlan: c.genAIPlan || '—',
        genAIAct:  c.genAIAct  || '—',
        tooling:   c.tooling   || '',
      })
    }
  }
}

// ── Build workbook ───────────────────────────────────────────────
const wb = XLSX.utils.book_new()

function addSheet(name, data) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name)
}

addSheet('Config',       config)
addSheet('KPI_Cards',    kpiCards)
addSheet('Banners',      banners)
addSheet('Highlights',   highlights)
addSheet('Benchmarks',   benchmarks)
addSheet('MU_Rows',      muRows)
addSheet('Contracts',    contractRows)
addSheet('Clients_Chart',clientsChart)
addSheet('Top_Clients',  topClients)

// ── Write Excel ───────────────────────────────────────────────────
const xlsxOut = path.join(__dirname, '..', 'dashboard-data.xlsx')
XLSX.writeFile(wb, xlsxOut)
console.log('Generated:', xlsxOut)

// ── Write JSON (mirrors what the Azure Function returns) ──────────
const MU_ORDER = ['ANZ', 'India', 'Japan', 'SEA', 'GC']

function num(v) {
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0
}

// config
const configObj = Object.fromEntries(config.map(r => [r.key, r.value]))

// ovData
const ovData = {}
for (const b of banners) {
  const v = b.view.toLowerCase()
  ovData[v] = {
    adoptTitle: b.adoptTitle, savTitle: b.savTitle,
    donut: [b.donutSc, b.donutWip, b.donutNi, b.donutYts],
    adopt: [], sav: [],
  }
}
for (const r of kpiCards) {
  const v = r.view.toLowerCase(), sec = r.section.toLowerCase()
  const card = { c: r.c, l: r.l, v: r.v, s: r.s, du: r.du }
  if (r.d) card.d = r.d
  ovData[v][sec].push(card)
}

// data
const data = {}
for (const b of banners) {
  const v = b.view.toLowerCase()
  data[v] = {
    banner: { title: b.bannerTitle, sub: b.bannerSub, adopt: b.bannerAdopt, scale: b.bannerScale, gensav: b.bannerSav, fte: b.bannerFte },
    tableTitle: b.tableTitle, chartsTitle: b.chartsTitle,
    savChartTitle: b.savChartTitle, fteChartTitle: b.fteChartTitle,
    stats: { gera: b.statsGera, gplan: b.statsGplan, beat: b.statsBeat, delact: b.statsDelact, delplan: b.statsDelplan, att: b.statsAtt },
    savC1Title: b.savC1, savC2Title: b.savC2, savC3Title: b.savC3,
    rows: [], savPlan: [], savActuals: [], ftePlan: [], fteActuals: [], delActuals: [],
  }
}
for (const mu of MU_ORDER) {
  for (const r of muRows) {
    if (r.mu !== mu) continue
    const v = r.view.toLowerCase()
    data[v].rows.push({ mu: r.mu, eligible: r.eligible, adopt: r.adopt, adoptColor: r.adoptColor, scale: r.scale, delPlan: r.delPlan, delAct: r.delAct, geraPlan: r.geraPlan, geraAct: r.geraAct, geraActColor: r.geraActColor, ftePlan: r.ftePlan, fteAct: r.fteAct, delta: r.delta, dClass: r.dClass, dColor: r.dColor })
    data[v].savPlan.push(num(r.geraPlan))
    data[v].savActuals.push(num(r.geraAct))
    data[v].ftePlan.push(num(r.ftePlan))
    data[v].fteActuals.push(num(r.fteAct))
    data[v].delActuals.push(num(r.delAct))
  }
}

// contracts
const contractsObj = {}
for (const r of contractRows) {
  const v = r.view.toLowerCase(), mu = r.mu
  if (!contractsObj[v]) contractsObj[v] = {}
  if (!contractsObj[v][mu]) contractsObj[v][mu] = { stats: null, contracts: [] }
  contractsObj[v][mu].contracts.push({ client: r.client, dsg: r.dsg, industry: r.industry, status: r.status, step5: r.step5, uc: r.uc, genAIPlan: r.genAIPlan, genAIAct: r.genAIAct, tooling: r.tooling })
}
for (const v of Object.keys(contractsObj)) {
  for (const mu of Object.keys(contractsObj[v])) {
    const cs = contractsObj[v][mu].contracts
    const adopted = cs.filter(c => !['Not Implementing','Yet to Start','Initiated'].includes(c.status)).length
    const scaling = cs.filter(c => c.status === 'Scaling').length
    contractsObj[v][mu].stats = { eligible: cs.length, adopted, scaling, wip: cs.filter(c => c.status === 'Work in Progress').length, ni: cs.filter(c => c.status === 'Not Implementing').length, adopPct: cs.length ? Math.round(adopted/cs.length*100)+'%' : '0%', scalPct: cs.length ? Math.round(scaling/cs.length*100)+'%' : '0%' }
  }
}

const jsonPayload = {
  config: configObj,
  ovData,
  data,
  contracts: contractsObj,
  clientsChart,
  topClients: topClients.map(r => [r.name, r.meta]),
  highlights,
  benchmarks,
}

const jsonOut = path.join(__dirname, '..', 'dashboard-data.json')
fs.writeFileSync(jsonOut, JSON.stringify(jsonPayload, null, 2))
console.log('Generated:', jsonOut)
console.log('Upload the .xlsx to Azure Blob Storage. The .json is used by npm run dev.')
