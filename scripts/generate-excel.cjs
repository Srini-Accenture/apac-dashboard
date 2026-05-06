// Run from project root: npm run generate-excel
// Output: dashboard-data.xlsx  → upload this to Azure Blob Storage

const XLSX = require('xlsx')
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

addSheet('KPI_Cards',    kpiCards)
addSheet('Banners',      banners)
addSheet('MU_Rows',      muRows)
addSheet('Contracts',    contractRows)
addSheet('Clients_Chart',clientsChart)
addSheet('Top_Clients',  topClients)

const out = path.join(__dirname, '..', 'dashboard-data.xlsx')
XLSX.writeFile(wb, out)
console.log('Generated:', out)
console.log('Upload this file to your Azure Blob Storage container.')
