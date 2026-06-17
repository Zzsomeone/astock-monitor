const fetch = require('node-fetch');

function parseSinaLine(raw) {
  const match = raw.match(/var hq_str_(\w+)="(.*)"/);
  if (!match) return null;
  const code = match[1];
  const parts = match[2].split(',');
  if (parts.length < 32) return null;
  const now   = parseFloat(parts[3])  || 0;
  const close = parseFloat(parts[2])  || 0;
  const open  = parseFloat(parts[1])  || 0;
  const high  = parseFloat(parts[4])  || 0;
  const low   = parseFloat(parts[5])  || 0;
  const vol   = parseInt(parts[8])    || 0;
  const amt   = parseFloat(parts[9])  || 0;
  const chg   = close > 0 ? ((now - close) / close * 100) : 0;
  return {
    code, name: parts[0],
    now: now.toFixed(2), open: open.toFixed(2), close: close.toFixed(2),
    high: high.toFixed(2), low: low.toFixed(2), chg: chg.toFixed(2),
    volume: vol, amount: (amt / 1e8).toFixed(4),
    bid: [
      { price: parseFloat(parts[11]).toFixed(2), vol: parseInt(parts[10]) || 0 },
      { price: parseFloat(parts[13]).toFixed(2), vol: parseInt(parts[12]) || 0 },
      { price: parseFloat(parts[15]).toFixed(2), vol: parseInt(parts[14]) || 0 },
      { price: parseFloat(parts[17]).toFixed(2), vol: parseInt(parts[16]) || 0 },
      { price: parseFloat(parts[19]).toFixed(2), vol: parseInt(parts[18]) || 0 },
    ],
    ask: [
      { price: parseFloat(parts[21]).toFixed(2), vol: parseInt(parts[20]) || 0 },
      { price: parseFloat(parts[23]).toFixed(2), vol: parseInt(parts[22]) || 0 },
      { price: parseFloat(parts[25]).toFixed(2), vol: parseInt(parts[24]) || 0 },
      { price: parseFloat(parts[27]).toFixed(2), vol: parseInt(parts[26]) || 0 },
      { price: parseFloat(parts[29]).toFixed(2), vol: parseInt(parts[28]) || 0 },
    ],
    date: parts[30], time: parts[31],
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { codes } = req.query;
  if (!codes) { res.status(400).json({ error: 'Missing codes param' }); return; }
  const codeList = codes.split(',').slice(0, 20).join(',');
  try {
    const url = 'https://hq.sinajs.cn/list=' + codeList;
    const response = await fetch(url, {
      headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });
    if (!response.ok) throw new Error('Sina HTTP ' + response.status);
    const text = await response.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const stocks = lines.map(parseSinaLine).filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, ts: Date.now(), data: stocks });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};