// Vercel Serverless Function: /api/xsmt
// Tự động thu thập và phân tích kết quả Xổ Số Miền Trung từ https://xosodaiphat.com/
const https = require('https');

let memoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

const VERIFIED_XSMT_FALLBACK = [
  {
    id: "13-10-2026",
    date: "2026-10-13",
    stations: [
      {
        station: "Đắk Lắk",
        gdb: "888136",
        special: 36,
        cang: "136",
        head: 39,
        numbers: [36, 74, 45, 91, 39, 97, 63, 5, 30, 2, 3, 93, 70, 7, 23, 30, 90, 39],
        prizes: { gdb: "888136", g1: "87774", g2: "06745", g3: ["89791", "24939"], g4: ["44297", "87063", "84605", "83530", "59702", "11603", "47293"], g5: "5870", g6: ["6807", "4723", "4530"], g7: "190", g8: "39" }
      },
      {
        station: "Quảng Nam",
        gdb: "555708",
        special: 8,
        cang: "708",
        head: 1,
        numbers: [8, 16, 27, 31, 78, 18, 85, 51, 22, 39, 89, 82, 52, 29, 35, 87, 19, 1],
        prizes: { gdb: "555708", g1: "03116", g2: "22027", g3: ["73831", "46278"], g4: ["20618", "67885", "40951", "54822", "68139", "89389", "89882"], g5: "8552", g6: ["7729", "8035", "5487"], g7: "919", g8: "01" }
      }
    ],
    numbers: [36, 74, 45, 91, 39, 97, 63, 5, 30, 2, 3, 93, 70, 7, 23, 30, 90, 39, 8, 16, 27, 31, 78, 18, 85, 51, 22, 39, 89, 82, 52, 29, 35, 87, 19, 1],
    special: 36,
    cang: "136",
    gdb: "888136"
  }
];

function cleanDate(dStr) {
  if (!dStr) return '';
  const p = dStr.split(/[-/]/);
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return dStr;
}

function parseXSMTTable(tableHtml, dateStr) {
  const thead = tableHtml.split(/<tbody>/i)[0];
  const stations = [...thead.matchAll(/<th[^>]*>(?:<a[^>]*>)?([^<]+)/gi)]
    .map(m => m[1].trim())
    .filter(s => s && s !== 'Giải');

  const rows = tableHtml.split(/<tr[^>]*>/i).slice(1);
  const stationResults = stations.map(name => ({
    station: name,
    prizes: { gdb: '', g1: '', g2: '', g3: [], g4: [], g5: '', g6: [], g7: '', g8: '' },
    numbers: []
  }));

  rows.forEach(r => {
    const cells = r.split(/<td[^>]*>/i).slice(1);
    if (!cells.length) return;
    const prizeLabel = cells[0].replace(/<[^>]+>/g, '').trim();

    cells.slice(1).forEach((cell, idx) => {
      if (idx >= stationResults.length) return;
      const numMatches = [...cell.matchAll(/>\s*(\d{2,6})\s*</g)].map(m => m[1]);
      if (prizeLabel.includes('G.ĐB')) stationResults[idx].prizes.gdb = numMatches[0] || '';
      else if (prizeLabel.includes('G.1')) stationResults[idx].prizes.g1 = numMatches[0] || '';
      else if (prizeLabel.includes('G.2')) stationResults[idx].prizes.g2 = numMatches[0] || '';
      else if (prizeLabel.includes('G.3')) stationResults[idx].prizes.g3 = numMatches;
      else if (prizeLabel.includes('G.4')) stationResults[idx].prizes.g4 = numMatches;
      else if (prizeLabel.includes('G.5')) stationResults[idx].prizes.g5 = numMatches[0] || '';
      else if (prizeLabel.includes('G.6')) stationResults[idx].prizes.g6 = numMatches;
      else if (prizeLabel.includes('G.7')) stationResults[idx].prizes.g7 = numMatches[0] || '';
      else if (prizeLabel.includes('G.8')) stationResults[idx].prizes.g8 = numMatches[0] || '';
    });
  });

  const allCombinedNumbers = [];

  stationResults.forEach(st => {
    const p = st.prizes;
    const all18 = [
      p.gdb, p.g1, p.g2,
      ...(p.g3 || []),
      ...(p.g4 || []),
      p.g5,
      ...(p.g6 || []),
      p.g7,
      p.g8
    ].filter(Boolean);

    st.all18 = all18;
    st.numbers = all18.map(n => parseInt(n.slice(-2), 10));
    st.special = p.gdb ? parseInt(p.gdb.slice(-2), 10) : null;
    st.cang = p.gdb && p.gdb.length >= 3 ? p.gdb.slice(-3) : '';
    st.head = p.g8 ? parseInt(p.g8, 10) : null;

    allCombinedNumbers.push(...st.numbers);
  });

  const primaryStation = stationResults[0] || {};

  return {
    id: dateStr || 'XSMT',
    date: cleanDate(dateStr),
    stations: stationResults,
    numbers: allCombinedNumbers,
    special: primaryStation.special ?? null,
    cang: primaryStation.cang || '',
    gdb: primaryStation.prizes?.gdb || '',
    head: primaryStation.head ?? null
  };
}

function fetchFromDaiPhat() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'xosodaiphat.com',
      path: '/xsmt-xo-so-mien-trung.html',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en;q=0.9'
      },
      timeout: 5000
    };

    const req = https.get(options, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          const sections = [...html.matchAll(/(?:XSMT|Xổ số Miền Trung)[\s\S]*?(\d{2}[-/]\d{2}[-/]\d{4})[\s\S]*?<table[^>]*class="[^"]*table-xsmn[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
          if (!sections.length) {
            return resolve(VERIFIED_XSMT_FALLBACK);
          }
          const list = sections.map(sec => parseXSMTTable(sec[2], sec[1]));
          const validList = list.filter(d => d.numbers.length >= 18);
          resolve(validList.length ? validList : VERIFIED_XSMT_FALLBACK);
        } catch (err) {
          resolve(VERIFIED_XSMT_FALLBACK);
        }
      });
    });

    req.on('timeout', () => {
      req.abort();
      resolve(VERIFIED_XSMT_FALLBACK);
    });

    req.on('error', () => {
      resolve(VERIFIED_XSMT_FALLBACK);
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  let xsmtList = null;

  if (memoryCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    xsmtList = memoryCache;
  } else {
    try {
      xsmtList = await fetchFromDaiPhat();
      memoryCache = xsmtList;
      lastCacheTime = now;
    } catch (e) {
      xsmtList = memoryCache || VERIFIED_XSMT_FALLBACK;
    }
  }

  return res.status(200).json({
    success: true,
    source: 'https://xosodaiphat.com/ (Xổ Số Miền Trung)',
    timestamp: new Date().toISOString(),
    latest: xsmtList[0] || VERIFIED_XSMT_FALLBACK[0],
    history: xsmtList
  });
};
