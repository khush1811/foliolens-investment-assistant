(function (root, build) {
  const api = build();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Folio = api;
})(globalThis, function () {
  'use strict';

  const snapshot = '20 Nov 2026';
  const securities = {
    VANTA: { name: 'Vanta Systems', sector: 'Technology', price: 960, prior: 946, growth: 14.2, pe: 29.4, roe: 21.2, change: 12.8 },
    MERID: { name: 'Meridian Bank', sector: 'Financials', price: 420, prior: 423, growth: 9.1, pe: 15.6, roe: 14.8, change: 3.6 },
    ORBIT: { name: 'Orbit Digital', sector: 'Technology', price: 680, prior: 667, growth: 18.5, pe: 35.2, roe: 18.4, change: 10.2 },
    FORGE: { name: 'Forge Industrials', sector: 'Industrials', price: 360, prior: 361, growth: 6.4, pe: 20.1, roe: 12.1, change: 4.7 },
    BLOOM: { name: 'Bloom Consumer', sector: 'Consumer', price: 400, prior: 398, growth: 8.7, pe: 24.6, roe: 16.3, change: 6.8 },
    ASTRA: { name: 'Astra Health', sector: 'Healthcare', price: 100, prior: 99, growth: 11.3, pe: 22.2, roe: 13.9, change: 2.1 }
  };
  const sample = [
    { ticker: 'VANTA', shares: 100, avgCost: 870 }, { ticker: 'MERID', shares: 120, avgCost: 380 },
    { ticker: 'ORBIT', shares: 60, avgCost: 620 }, { ticker: 'FORGE', shares: 80, avgCost: 332 },
    { ticker: 'BLOOM', shares: 60, avgCost: 355 }, { ticker: 'ASTRA', shares: 100, avgCost: 94 }
  ];
  const news = [
    { id: 'N1', ticker: 'VANTA', date: '20 Nov 2026', source: 'Demo company filing', type: 'Earnings', title: 'Vanta Systems reports 14.2% revenue growth', detail: 'The fictional quarterly filing reported year-over-year revenue growth of 14.2%. The next review point is whether operating margins keep pace as the company invests in delivery capacity.' },
    { id: 'N2', ticker: 'MERID', date: '19 Nov 2026', source: 'Demo market desk', type: 'Sector', title: 'Banking update puts deposit costs in focus', detail: 'The fictional sector briefing highlights deposit pricing and the potential effect on lending margins. Meridian’s next filing would be needed to quantify any company-specific impact.' },
    { id: 'N3', ticker: 'ORBIT', date: '18 Nov 2026', source: 'Demo company filing', type: 'Company', title: 'Orbit Digital announces a multiyear services contract', detail: 'The fictional announcement gives a contract term but omits pricing and margin details. Its contribution to revenue or earnings cannot be calculated from this disclosure.' },
    { id: 'N4', ticker: 'FORGE', date: '17 Nov 2026', source: 'Demo company filing', type: 'Company', title: 'Forge Industrials shares an update on capital spending', detail: 'The fictional business plans to expand capacity in phases. Financing terms and the timing of new production remain unspecified.' },
    { id: 'N5', ticker: 'BLOOM', date: '16 Nov 2026', source: 'Demo market desk', type: 'Sector', title: 'Consumer briefing tracks raw material costs', detail: 'The fictional briefing points to changes in input costs. Bloom’s next gross margin disclosure can help establish the company-specific impact.' }
  ];
  const periods = {
    '1M': { scale: .36, benchmark: 2.1, labels: ['23 Oct', '30 Oct', '6 Nov', '13 Nov', '20 Nov'] },
    '3M': { scale: 1, benchmark: 5.1, labels: ['21 Aug', '11 Sep', '2 Oct', '23 Oct', '20 Nov'] },
    '6M': { scale: 1.55, benchmark: 8.4, labels: ['22 May', '3 Jul', '14 Aug', '25 Sep', '20 Nov'] },
    '1Y': { scale: 2.35, benchmark: 13.7, labels: ['21 Nov ’25', '20 Feb', '22 May', '21 Aug', '20 Nov'] }
  };
  const moneyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const money = value => moneyFormat.format(value);
  const pct = value => `${value.toFixed(1)}%`;
  const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${pct(Math.abs(value))}`;
  const cash = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value))}`;
  const cap = 10000000;
  const validHolding = ({ticker, shares, avgCost}) => Object.hasOwn(securities, ticker) &&
    Number.isFinite(shares) && shares >= .0001 && shares <= cap &&
    Number.isFinite(avgCost) && avgCost >= .01 && avgCost <= cap;

  function portfolio(holdings) {
    const rows = holdings.map(row => {
      const info = securities[row.ticker];
      const value = row.shares * info.price;
      const cost = row.shares * row.avgCost;
      return { ...row, ...info, value, cost, pnl: value - cost, day: row.shares * (info.price - info.prior) };
    }).sort((a, b) => b.value - a.value);
    const value = rows.reduce((sum, row) => sum + row.value, 0);
    const cost = rows.reduce((sum, row) => sum + row.cost, 0);
    const day = rows.reduce((sum, row) => sum + row.day, 0);
    const sectors = new Map();
    for (const row of rows) {
      row.weight = row.value / value * 100;
      sectors.set(row.sector, (sectors.get(row.sector) ?? 0) + row.weight);
    }
    const allocation = [...sectors].map(([sector, weight]) => ({ sector, weight })).sort((a, b) => b.weight - a.weight);
    return { rows, value, cost, day, pnl: value - cost, returnPct: cost ? (value - cost) / cost * 100 : 0,
      dayPct: value ? day / (value - day) * 100 : 0, allocation, top: rows[0],
      concentration: rows[0]?.weight >= 25 || allocation[0]?.weight >= 40 };
  }

  function parseCSV(raw) {
    const matrix = [];
    let record = [], cell = '', quoted = false, closed = false;
    const csv = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    for (let index = 0; index < csv.length; index++) {
      const char = csv[index];
      if (quoted) {
        if (char === '"' && csv[index + 1] === '"') { cell += '"'; index++; }
        else if (char === '"') { quoted = false; closed = true; }
        else cell += char;
        continue;
      }
      if (char === ',' || char === '\n') {
        record.push(cell.trim()); cell = ''; closed = false;
        if (char === '\n') { matrix.push(record); record = []; }
      } else if (char === '"' && !cell && !closed) quoted = true;
      else if (closed || char === '"') throw Error('Check the CSV quotation marks. Use the sample file as a template.');
      else cell += char;
    }
    if (quoted) throw Error('The CSV has an unclosed quoted field.');
    if (record.length || cell || closed) matrix.push([...record, cell.trim()]);
    const nonempty = matrix.map((cells, index) => ({ cells, line: index + 1 })).filter(row => row.cells.some(Boolean));
    const header = ['ticker', 'shares', 'avg_cost'];
    const first = nonempty.shift()?.cells.map(key => key.toLowerCase()) ?? [];
    if (first.length !== header.length || header.some(column => !first.includes(column))) throw Error('Use exactly these columns: ticker, shares, avg_cost.');
    if (!nonempty.length || nonempty.length > 100) throw Error('Include between 1 and 100 holding rows.');
    const holdings = new Map();
    for (const { cells, line } of nonempty) {
      if (cells.length !== 3) throw Error(`Row ${line}: expected three fields.`);
      const [ticker, sharesText, costText] = header.map(key => cells[first.indexOf(key)]);
      const symbol = ticker.toUpperCase();
      if (!Object.hasOwn(securities, symbol)) throw Error(`Row ${line}: use a supported demo ticker (${Object.keys(securities).join(', ')}).`);
      const decimal = /^\d+(\.\d{1,4})?$/;
      const shares = Number(sharesText), avgCost = Number(costText);
      if (!decimal.test(sharesText) || !decimal.test(costText) || !validHolding({ticker: symbol, shares, avgCost})) {
        throw Error(`Row ${line}: enter positive shares and an average cost of at least ₹0.01. Use up to four decimal places and values no greater than 10,000,000.`);
      }
      const prior = holdings.get(symbol);
      if (prior) {
        const total = prior.shares + shares;
        if (total > cap) throw Error(`Row ${line}: combined shares exceed 10,000,000.`);
        prior.avgCost = (prior.shares * prior.avgCost + shares * avgCost) / total;
        prior.shares = total;
      } else holdings.set(symbol, { ticker: symbol, shares, avgCost });
    }
    return [...holdings.values()];
  }

  function history(summary, period) {
    const preset = periods[period];
    const start = summary.rows.reduce((sum, row) => sum + row.value / (1 + row.change * preset.scale / 100), 0);
    const noise = [0, .38, .18, .64, -.05, -.44, .98, .35, 1.18, .54, .05, .68, -.7, -.42, .25, -.26, .62, 1.24, .53, 1.06, .04, .73, .55, 1.28, 0];
    const gain = (summary.value / start - 1) * 100;
    const points = noise.map((wobble, index) => {
      const fraction = index / (noise.length - 1);
      return {
        portfolio: 100 + gain * fraction + wobble * preset.scale,
        benchmark: 100 + preset.benchmark * fraction + wobble * preset.scale * .48
      };
    });
    return { points, gain, ...preset };
  }

  function stress(summary, sector, shock) {
    const exposure = sector === 'All holdings' ? 100 : summary.allocation.find(row => row.sector === sector)?.weight ?? 0;
    const percent = exposure * shock / 100;
    return { exposure, percent, value: summary.value * percent / 100 };
  }

  const intents = ['risk', 'performance', 'news', 'fundamentals', 'scenario', 'help', 'advice'];
  function infer(question) {
    const q = question.toLowerCase();
    if (/\b(buy|sell|short|trade|recommend|target price|price target|best stock|should i invest|what should i invest|guarantee|predic\w*|forecast)\b/.test(q)) return 'advice';
    if (/what if|shock|scenario|stress|\bdrops?\b/.test(q)) return 'scenario';
    if (/\b(news|headline|filing|event|latest|happened)\w*/.test(q)) return 'news';
    if (/\b(earnings|revenue|valuation|fundamental|p\/e|roe)\w*/.test(q)) return 'fundamentals';
    if (/\b(risk|concentrat|expos|sector|diversi|overweight|weight|allocat|largest|biggest|vulnerab)\w*/.test(q)) return 'risk';
    if (/\b(performance|return|profit|gain|loss|pnl|p\/l|benchmark|doing|value|cost|move)\w*/.test(q)) return 'performance';
    if (Object.keys(securities).some(ticker => q.split(/\W+/).includes(ticker.toLowerCase()))) return 'fundamentals';
    return 'help';
  }

  function answer(question, topic, summary, profile, period) {
    const q = question.toUpperCase();
    const explicit = Object.keys(securities).find(ticker => new RegExp(`\\b${ticker}\\b`).test(q) ||
      q.includes(securities[ticker].name.toUpperCase()));
    const focus = explicit ?? summary.top.ticker;
    const holding = summary.rows.find(row => row.ticker === focus);
    const relevant = news.filter(story => explicit ? story.ticker === explicit : summary.rows.some(row => row.ticker === story.ticker));
    const sector = summary.allocation[0];
    const profileNote = profile.sensitivity === 'Lower swings' ? ' You selected lower swings, so this is a useful exposure to review.' : '';
    switch (topic) {
      case 'advice': return { title: 'Review the evidence first', body: 'I can explain exposure, recent filings, fundamentals and hypothetical scenarios. I don’t give buy or sell instructions, price targets, or forecasts.', action: 'risk', label: 'Open portfolio risk' };
      case 'risk': return { title: summary.concentration ? 'Concentration deserves a closer look' : 'Your largest exposures', body: `${summary.top.name} is your largest position at ${pct(summary.top.weight)}. ${sector.sector} accounts for ${pct(sector.weight)} of the portfolio. The demo flags any stock at 25% or sector at 40%.${profileNote}`, source: 'Holdings and demo close', action: 'risk', label: 'Review exposure' };
      case 'performance': {
        const series = history(summary, period);
        return { title: 'Two ways to read performance', body: `Open positions have ${cash(summary.pnl)} in unrealized P&L (${signed(summary.returnPct)} of entered cost). The ${period} fixed-holdings illustration shows ${signed(series.gain)} versus ${signed(series.benchmark)} for the synthetic benchmark. This series assumes today’s quantities throughout the period and excludes dividends, fees and cash flows.`, source: 'Holdings, entered average cost and synthetic prices', action: 'overview', label: 'See performance chart' };
      }
      case 'fundamentals': {
        const security = securities[focus];
        const context = holding ? ` The stock accounts for ${pct(holding.weight)} of your portfolio.` : '';
        return { title: `${security.name} fundamentals`, body: `Demo figures show ${pct(security.growth)} year-over-year quarterly revenue growth, ${security.pe.toFixed(1)}× trailing P/E and ${pct(security.roe)} trailing return on equity.${context} Revenue growth, valuation and profitability answer different questions. Compare them with the company’s history and peers.`, source: 'Synthetic quarterly and trailing twelve-month dataset', action: `stock:${focus}`, label: 'Open fundamentals' };
      }
      case 'news': {
        const story = relevant[0];
        if (!story) return { title: 'No relevant events in this snapshot', body: 'The demo feed has no tagged stories for this selection. Add another supported holding or explore the broader demo feed.', action: 'news', label: 'Open news feed' };
        const match = summary.rows.find(row => row.ticker === story.ticker);
        return { title: story.title, body: story.detail + (match ? ` Your portfolio exposure is ${pct(match.weight)}.` : ''), source: `${story.source} · ${story.date}`, action: `story:${story.id}`, label: 'Read event details' };
      }
      case 'scenario': {
        const mentioned = Object.values(securities).find(row => new RegExp('\\b' + row.sector.toUpperCase() + '\\b').test(q));
        const shock = question.match(/([+\-−]?\d+(?:\.\d+)?)\s*%/);
        let move = shock ? Number(shock[1].replace('−','-')) : -10;
        if (move > 0 && !shock?.[1].startsWith('+') && /drop|fall|down|declin/i.test(question)) move = -move;
        if (move < -100 || move > 100) return { title: 'Choose a smaller shock', body: 'Enter a hypothetical move between −100% and +100%.', action: 'risk', label: 'Open scenario lab' };
        const target = /all holdings|whole portfolio|every stock/i.test(question) ? 'All holdings' : (mentioned ?? sector).sector;
        const result = stress(summary, target, move);
        return { title: `${target} · ${signed(move)} scenario`, body: `This hypothetical move changes portfolio value by ${cash(result.value)} (${signed(result.percent)}), assuming every affected holding moves together and all other prices stay fixed. The scenario is a sensitivity check.`, source: 'Holdings and a user-defined price shock', action: 'risk', label: 'Try a scenario' };
      }
      default: return { title: 'What would you like to review?', body: 'Try asking about your biggest exposure, open-position gains, recent portfolio news, a company’s fundamentals, or a sector price shock.', action: 'overview', label: 'Open overview' };
    }
  }

  return { snapshot, securities, sample, news, periods, money, pct, signed, cash, validHolding, portfolio, parseCSV, history, stress, intents, infer, answer };
});
