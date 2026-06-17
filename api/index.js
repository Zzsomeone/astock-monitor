const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const indices = 's_sh000001,s_sz399001,s_sz399006,s_sh000688,s_sh000300';
  try {
    const url = 'https://hq.sinajs.cn/list=' + indices;
    const response = await fetch(url, {
      headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });
    const text = await response.text();
    const names = { s_sh000001:'上证指数', s_sz399001:'深证成指', s_sz399006:'创业板指', s_sh000688:'科创50', s_sh000300:'沪深300' };
    const results = [];
    for (const line of text.trim().split('\n')) {
      const m = line.match(/var hq_str_(\w+)="(.*)"/);
      if (!m) continue;
      const p = m[2].split(',');
      results.push({ code: m[1], name: names[m[1]] || p[0], now: parseFloat(p[1]).toFixed(2), chg: parseFloat(p[3]).toFixed(2), amt: p[2] });
    }
    res.status(200).json({ ok: true, ts: Date.now(), data: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};