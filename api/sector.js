const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const url = 'https://push2.eastmoney.com/api/qt/clist/get?cb=callback&fid=f62&po=1&pz=20&pn=1&np=1&fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&fs=m%3A90+t%3A2&fields=f12,f14,f2,f3,f62,f66,f72,f78';
    const response = await fetch(url, {
      headers: { 'Referer': 'https://data.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' },
      timeout: 6000,
    });
    let text = await response.text();
    text = text.replace(/^callback\(/, '').replace(/\);?$/, '');
    const json = JSON.parse(text);
    const items = (json.data && json.data.diff) || [];
    const sectors = items.slice(0, 18).map(item => ({
      code: item.f12, name: item.f14,
      chg:   (item.f3  / 100).toFixed(2),
      now:   (item.f2  / 100).toFixed(2),
      netIn: (item.f62 / 1e8).toFixed(2),
      bigIn: (item.f66 / 1e8).toFixed(2),
      midIn: (item.f72 / 1e8).toFixed(2),
      smlIn: (item.f78 / 1e8).toFixed(2),
    }));
    res.status(200).json({ ok: true, ts: Date.now(), data: sectors });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};