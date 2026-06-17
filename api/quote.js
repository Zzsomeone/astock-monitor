// api/quote.js — 新浪行情代理（修复GBK编码）
const fetch = require('node-fetch');

// 名称硬映射（GBK解码失败时的后备）
const NAME_MAP = {
  'sh600519':'贵州茅台','sh601318':'中国平安','sz000858':'五粮液','sz300750':'宁德时代',
  'sz002594':'比亚迪','sh600036':'招商银行','sh600276':'恒瑞医药','sz000333':'美的集团',
  'sh601899':'紫金矿业','sh601166':'兴业银行','sh600000':'浦发银行','sh601088':'中国神华',
  'sh600016':'民生银行','sz000002':'万科A','sh600031':'三一重工','sh601006':'大秦铁路',
  'sz000651':'格力电器','sh600887':'伊利股份','sh601888':'中国中免','sz300059':'东方财富'
};

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

  // 尝试修复名称（GBK → UTF-8），失败则用映射表
  let name = NAME_MAP[code] || parts[0];
  // 检测乱码（含 replacement char 或非打印字符）
  if (/[\ufffd\x00-\x08\x0e-\x1f]/.test(parts[0]) || parts[0].includes('\u')) {
    name = NAME_MAP[code] || '未知';
  }

  return {
    code,
    name,
    now:    now.toFixed(2),
    open:   open.toFixed(2),
    close:  close.toFixed(2),
    high:   high.toFixed(2),
    low:    low.toFixed(2),
    chg:    chg.toFixed(2),
    volume: vol,
    amount: (amt / 1e8).toFixed(4),
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
    date: parts[30],
    time: parts[31],
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
    // 以 buffer 形式获取，然后尝试 GBK 解码
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Charset': 'GBK,utf-8;q=0.7,*;q=0.3',
      },
      timeout: 5000,
    });

    if (!response.ok) throw new Error('Sina HTTP ' + response.status);

    // 尝试 GBK 解码
    const buffer = await response.buffer();
    let text;
    try {
      // Node.js 原生支持 GBK 通过 TextDecoder
      const decoder = new TextDecoder('gbk');
      text = decoder.decode(buffer);
    } catch (e) {
      text = buffer.toString('utf-8');
    }

    const lines = text.trim().split('\n').filter(Boolean);
    const stocks = lines.map(parseSinaLine).filter(Boolean);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, ts: Date.now(), data: stocks });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};