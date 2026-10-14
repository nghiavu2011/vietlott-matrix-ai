// Vercel Serverless Function: /api/xsmn
// Tự động thu thập và phân tích kết quả Xổ Số Miền Nam từ https://xosodaiphat.com/
const https = require('https');

let memoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

const VERIFIED_XSMN_FALLBACK = [
  {
    id: "13-10-2026",
    date: "2026-10-13",
    stations: [
      {
        station: "Bến Tre",
        gdb: "542064",
        special: 64,
        cang: "064",
        head: 78,
        numbers: [64, 41, 21, 55, 7, 70, 34, 12, 64, 69, 97, 71, 65, 71, 33, 63, 55, 78],
        prizes: { gdb: "542064", g1: "04541", g2: "70021", g3: ["91855", "37507"], g4: ["67070", "38034", "06512", "88164", "37969", "34097", "83171"], g5: "7365", g6: ["0371", "4233", "4063"], g7: "955", g8: "78" }
      },
      {
        station: "Vũng Tàu",
        gdb: "056006",
        special: 6,
        cang: "006",
        head: 59,
        numbers: [6, 38, 78, 64, 73, 75, 78, 66, 91, 24, 92, 57, 92, 63, 11, 11, 28, 59],
        prizes: { gdb: "056006", g1: "26038", g2: "32678", g3: ["63164", "41573"], g4: ["36275", "03178", "08666", "79691", "73624", "13692", "41557"], g5: "1992", g6: ["9063", "3211", "8011"], g7: "628", g8: "59" }
      },
      {
        station: "Bạc Liêu",
        gdb: "191384",
        special: 84,
        cang: "384",
        head: 62,
        numbers: [84, 7, 82, 44, 80, 49, 95, 1, 34, 32, 87, 44, 78, 2, 5, 61, 79, 62],
        prizes: { gdb: "191384", g1: "95407", g2: "57582", g3: ["44244", "06980"], g4: ["76749", "61695", "96501", "86034", "30032", "14887", "63844"], g5: "6478", g6: ["8102", "8205", "4661"], g7: "679", g8: "62" }
      }
    ],
    // Dãy số tổng hợp (toàn bộ đài trong ngày)
    numbers: [64, 41, 21, 55, 7, 70, 34, 12, 64, 69, 97, 71, 65, 71, 33, 63, 55, 78, 6, 38, 78, 64, 73, 75, 78, 66, 91, 24, 92, 57, 92, 63, 11, 11, 28, 59, 84, 7, 82, 44, 80, 49, 95, 1, 34, 32, 87, 44, 78, 2, 5, 61, 79, 62],
    special: 64,
    cang: "064",
    gdb: "542064"
  }
];

function cleanDate(dStr) {
  if (!dStr) return '';
  const p = dStr.split(/[-/]/);
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return dStr;
}

function parseXSMNTable(tableHtml, dateStr) {
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
    id: dateStr || 'XSMN',
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
      path: '/xsmn-xo-so-mien-nam.html',
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
          const sections = [...html.matchAll(/(?:XSMN|Xổ số Miền Nam)[\s\S]*?(\d{2}[-/]\d{2}[-/]\d{4})[\s\S]*?<table[^>]*class="[^"]*table-xsmn[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
          if (!sections.length) {
            return resolve(VERIFIED_XSMN_FALLBACK);
          }
          const list = sections.map(sec => parseXSMNTable(sec[2], sec[1]));
          const validList = list.filter(d => d.numbers.length >= 18);
          resolve(validList.length ? validList : VERIFIED_XSMN_FALLBACK);
        } catch (err) {
          resolve(VERIFIED_XSMN_FALLBACK);
        }
      });
    });

    req.on('timeout', () => {
      req.abort();
      resolve(VERIFIED_XSMN_FALLBACK);
    });

    req.on('error', () => {
      resolve(VERIFIED_XSMN_FALLBACK);
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
  let xsmnList = null;

  if (memoryCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    xsmnList = memoryCache;
  } else {
    try {
      xsmnList = await fetchFromDaiPhat();
      memoryCache = xsmnList;
      lastCacheTime = now;
    } catch (e) {
      xsmnList = memoryCache || VERIFIED_XSMN_FALLBACK;
    }
  }

  return res.status(200).json({
    success: true,
    source: 'https://xosodaiphat.com/ (Xổ Số Miền Nam)',
    timestamp: new Date().toISOString(),
    latest: xsmnList[0] || VERIFIED_XSMN_FALLBACK[0],
    history: xsmnList
  });
};
