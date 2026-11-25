'use strict';

const F = window.Folio;
const $ = selector => document.querySelector(selector);
const storeKey = 'foliolens.workspace.v1';
const views = { overview: 'Overview', holdings: 'Holdings', risk: 'Risk Lab', news: 'Market News' };
const colors = ['#7449ed', '#9a77f3', '#b79df8', '#6b77de', '#dbcbff', '#aeb5eb'];
const defaults = { horizon: '3–5 years', sensitivity: 'Balanced', ai: false };
const state = { holdings: F.sample, mode: 'sample', profile: { ...defaults }, period: '3M',
  shock: -10, sector: '', newsFilter: 'Held stocks', busy: false, modelReady: false, revision: 0 };
state.summary = F.portfolio(state.holdings);
let chartObserver, toastTimer;

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (!saved || !Array.isArray(saved.holdings) || !saved.holdings.length || saved.holdings.length > 6) return;
    if (!saved.holdings.every(row => row && F.validHolding(row))) return;
    if (new Set(saved.holdings.map(row => row.ticker)).size !== saved.holdings.length) return;
    state.holdings = saved.holdings;
    state.mode = saved.mode === 'imported' ? 'imported' : 'sample';
    state.profile = { ...defaults, ...saved.profile };
    state.summary = F.portfolio(state.holdings);
  } catch { /* Storage may be disabled or cleared. The sample still works. */ }
}

function persist() {
  try {
    localStorage.setItem(storeKey, JSON.stringify({ holdings: state.holdings, mode: state.mode, profile: state.profile }));
    return true;
  } catch { return false; }
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function page(title, text) {
  return `<div class="page-intro"><h1>${title}</h1><p>${text}</p>
    <button class="text-button quick-assist" type="button" data-focus-assistant>Ask the assistant</button></div>`;
}

function section(title, sub = '', action = '') {
  return `<div class="section-title"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${action}</div>`;
}

function tone(value) { return value > 0 ? 'positive' : value < 0 ? 'negative' : ''; }

function metric(icon, title, value, sub, style = '') {
  return `<div class="metric panel"><div class="metric-label"><span class="metric-icon" aria-hidden="true">${icon}</span>${title}</div>
    <strong class="${style}">${value}</strong><small>${sub}</small></div>`;
}

function allocation(summary, limit = summary.allocation.length) {
  return `<ul class="allocation-list">${summary.allocation.slice(0, limit).map((row, index) => `<li>
    <span>${row.sector}</span><strong>${F.pct(row.weight)}</strong>
    <div class="track" aria-hidden="true"><i style="width:${row.weight}%;background:${colors[index]}"></i></div></li>`).join('')}</ul>`;
}

function riskNote(summary) {
  const sector = summary.allocation[0];
  return `<div class="alert-box ${summary.concentration ? '' : 'calm'}"><strong>${summary.concentration ? 'Concentration flagged' : 'Within demo thresholds'}</strong>
    <p>${sector.sector} makes up ${F.pct(sector.weight)} of your portfolio. ${summary.top.ticker} is the largest holding at ${F.pct(summary.top.weight)}.</p></div>`;
}

function selection(labels, active, attribute, label) {
  return `<div class="segments" role="group" aria-label="${label}">${labels.map(value => `<button type="button" data-${attribute}="${value}" aria-pressed="${value === active}">${value}</button>`).join('')}</div>`;
}

function overview(summary) {
  const history = F.history(summary, state.period);
  return page('Portfolio overview', state.mode === 'sample' ? 'Review performance, exposure, and news for your sample portfolio.' : 'Review performance, exposure, and news for your imported demo portfolio.') +
    `<div class="metrics">
      ${metric('◫', 'Portfolio value', F.money(summary.value), `${summary.rows.length} holdings · INR`)}
      ${metric('↗', 'Day change', F.cash(summary.day), `${F.signed(summary.dayPct)} vs prior demo close`, tone(summary.day))}
      ${metric('◈', 'Unrealized P&amp;L', F.cash(summary.pnl), `${F.signed(summary.returnPct)} vs entered cost`, tone(summary.pnl))}
    </div>
    <section class="panel chart-card" aria-labelledby="performance-title">
      <div class="chart-header"><div><h2 id="performance-title">Portfolio performance</h2><p>Price-only illustration · Indexed to 100</p></div>
      ${selection(Object.keys(F.periods), state.period, 'period', 'Chart period')}</div>
      <div class="legend"><span><i></i> Portfolio <b>${F.signed(history.gain)}</b></span><span><i class="benchmark"></i> Demo benchmark <b>${F.signed(history.benchmark)}</b></span></div>
      <div class="chart-wrap"><canvas id="portfolio-chart" role="img" aria-label="${state.period} illustration. Portfolio ${F.signed(history.gain)}. Demo benchmark ${F.signed(history.benchmark)}."></canvas></div>
      <p class="chart-note">Uses current quantities across synthetic history. Excludes dividends, fees and cash flows.</p>
    </section>
    <div class="bottom-grid">
      <section class="panel">${section('Risk snapshot')}${riskNote(summary)}<button class="text-button" data-go="risk">Explore Risk Lab</button></section>
      <section class="panel">${section('Sector exposure', '', '<button class="text-button" data-go="risk">View all</button>')}${allocation(summary, 3)}</section>
    </div>`;
}

function holdings(summary) {
  return page('Holdings', 'Open a company to review its demo fundamentals and portfolio weight.') +
    `<section class="panel content-card">${section('Open positions', `${summary.rows.length} holdings · ${F.money(summary.value)} total market value`)}
      <div class="table-scroll" tabindex="0" role="region" aria-label="Holdings table"><table><thead><tr><th scope="col">Company</th><th scope="col">Shares</th><th scope="col">Value</th><th scope="col">Weight</th><th scope="col">Unrealized P&amp;L</th></tr></thead>
      <tbody>${summary.rows.map(row => `<tr><td><button class="text-button" data-go="stock:${row.ticker}">${row.ticker}</button><small>${row.name}</small></td>
      <td>${row.shares.toLocaleString('en-IN',{ maximumFractionDigits: 4 })}</td><td>${F.money(row.value)}</td>
      <td>${F.pct(row.weight)}</td><td class="${tone(row.pnl)}">${F.cash(row.pnl)}</td></tr>`).join('')}</tbody></table></div>
    </section>`;
}

function risk(summary) {
  const options = [...summary.allocation.map(row => row.sector), 'All holdings'];
  if (!options.includes(state.sector)) state.sector = options[0];
  return page('Risk Lab', 'See where exposure is concentrated and test a hypothetical price move.') +
    `<section class="panel content-card">${section('Concentration', 'Demo thresholds are 25% per holding and 40% per sector.')}${riskNote(summary)}${allocation(summary)}</section>
    <section class="panel content-card">${section('Scenario lab', 'Move one sector or all holdings while other prices stay fixed.')}
      <label class="field">Exposure<select id="scenario-sector">${options.map(option => `<option${state.sector === option ? ' selected' : ''}>${option}</option>`).join('')}</select></label>
      <label class="field">Hypothetical price move <output id="scenario-shock" for="shock">${F.signed(state.shock)}</output>
        <input id="shock" aria-label="Hypothetical price move from minus 50 to plus 50 percent" type="range" min="-50" max="50" step="1" value="${state.shock}"></label>
      <div id="scenario-result" class="scenario-result" role="status"></div>
    </section>`;
}

function updateScenario() {
  const outcome = F.stress(state.summary, state.sector, state.shock);
  $('#scenario-shock').textContent = F.signed(state.shock);
  $('#scenario-result').innerHTML = `<strong class="${tone(outcome.value)}">${F.cash(outcome.value)} <span>(${F.signed(outcome.percent)})</span></strong>
    <p>Estimated change in portfolio value. ${F.pct(outcome.exposure)} of your portfolio is affected.</p>`;
}

function marketNews(summary) {
  const held = new Map(summary.rows.map(row => [row.ticker, row.weight]));
  const stories = F.news.filter(story => state.newsFilter === 'All demo news' || held.has(story.ticker));
  return page('Market news', 'Read fictional filings and market briefs linked to company exposure.') +
    `<section class="panel content-card">${section('Event feed', '', selection(['Held stocks','All demo news'], state.newsFilter, 'filter', 'Filter news'))}
      ${stories.map(story => `<article class="story"><span class="tag">${story.type}</span><small>${story.source} · ${story.date}</small>
      <h3>${story.title}</h3><p>${story.ticker}${held.has(story.ticker) ? ` · ${F.pct(held.get(story.ticker))} of portfolio` : ''}</p>
      <button class="text-button" data-go="story:${story.id}">Read event</button></article>`).join('') || '<p class="helper">No events match these holdings. Select All demo news to browse the sample feed.</p>'}
    </section>`;
}

function drawChart() {
  const canvas = $('#portfolio-chart');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const series = F.history(state.summary, state.period);
  const left = 35, right = rect.width - 13, top = 9, bottom = rect.height - 25;
  const max = Math.ceil(Math.max(...series.points.map(point => Math.max(point.portfolio, point.benchmark))));
  const step = Math.max(1, Math.ceil((max - 99) / 4));
  const low = 100 - (series.points.some(point => point.portfolio < 100 || point.benchmark < 100) ? step : 0);
  const high = low + step * Math.ceil((max - low) / step);
  const x = index => left + (right - left) * index / (series.points.length - 1);
  const y = value => bottom - (value - low) / (high - low) * (bottom - top);
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#615d76';
  for (let value = low; value <= high; value += step) {
    ctx.strokeStyle = '#eae8f2';
    ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(right, y(value)); ctx.stroke();
    ctx.fillText(value, 5, y(value));
  }
  series.labels.forEach((label, index) => {
    ctx.textAlign = index === 0 ? 'left' : index === 4 ? 'right' : 'center';
    ctx.fillText(label, left + (right - left) * index / 4, rect.height - 7);
  });
  const trace = key => series.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(x(index), y(point[key])); else ctx.lineTo(x(index), y(point[key]));
  });
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, '#7751f34d');
  gradient.addColorStop(1, '#7751f304');
  ctx.beginPath(); trace('portfolio'); ctx.lineTo(right, bottom); ctx.lineTo(left, bottom); ctx.closePath();
  ctx.fillStyle = gradient; ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#918aa9';
  ctx.setLineDash([5,4]);
  ctx.beginPath(); trace('benchmark'); ctx.stroke();
  ctx.strokeStyle = '#6f45ed';
  ctx.lineWidth = 2.8;
  ctx.setLineDash([]);
  ctx.beginPath(); trace('portfolio'); ctx.stroke();
}

const renderers = { overview, holdings, risk, news: marketNews };
function render(refocus) {
  chartObserver?.disconnect();
  const hash = location.hash.slice(1);
  const active = Object.hasOwn(views, hash) ? hash : 'overview';
  $('#crumb').textContent = views[active];
  document.querySelectorAll('#navigation a').forEach(link => {
    if (link.dataset.view === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  $('#work').innerHTML = renderers[active](state.summary);
  const canvas = $('#portfolio-chart');
  if (canvas) {
    drawChart();
    chartObserver = new ResizeObserver(drawChart);
    chartObserver.observe(canvas.parentElement);
  }
  if (active === 'risk') updateScenario();
  if (refocus) $(refocus)?.focus();
}

function displayDialog(title, body) {
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body;
  if (!$('#dialog').open) $('#dialog').showModal();
}

function openImport() {
  displayDialog('Import a demo portfolio', `<p>Upload a CSV using the six fictional tickers in the template. Holdings are processed in this browser.</p>
    <a class="text-button" href="sample-holdings.csv" download>Download sample CSV</a>
    <form id="import-form">
      <label class="field">Portfolio CSV<input type="file" id="csv-file" accept=".csv,text/csv"></label>
      <div id="import-error" class="error" role="alert"></div><div id="import-review"></div>
      <div class="dialog-actions"><button class="button primary" id="apply-import" disabled>Use imported holdings</button>
      <button type="button" class="button secondary" id="use-sample">Load sample portfolio</button></div>
    </form>`);
  let pending, generation = 0;
  const fileInput = $('#csv-file'), error = $('#import-error'), review = $('#import-review'), apply = $('#apply-import');
  fileInput.addEventListener('change', async () => {
    const revision = ++generation;
    pending = undefined;
    apply.disabled = true;
    review.textContent = '';
    error.textContent = '';
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (file.size > 65536) throw Error('Choose a CSV file smaller than 64 KB.');
      const rows = F.parseCSV(await file.text());
      if (revision !== generation) return;
      const summary = F.portfolio(rows);
      pending = rows;
      review.innerHTML = `<p class="helper">${rows.length} valid ${rows.length === 1 ? 'position' : 'positions'} · ${F.money(summary.value)} at demo close<br>${rows.map(row => row.ticker).join(', ')}</p>`;
      apply.disabled = false;
    } catch (issue) {
      if (revision === generation) error.textContent = issue.message || 'The CSV could not be read.';
    }
  });
  $('#import-form').addEventListener('submit', event => {
    event.preventDefault();
    if (pending) replaceHoldings(pending, 'imported');
  });
  $('#use-sample').addEventListener('click', () => replaceHoldings(F.sample, 'sample'));
}

function replaceHoldings(rows, mode) {
  state.holdings = rows;
  state.mode = mode;
  state.summary = F.portfolio(rows);
  state.sector = '';
  state.revision++;
  $('#messages').replaceChildren();
  const saved = persist();
  $('#dialog').close();
  go('overview');
  notify(saved ? 'Portfolio updated.' : 'Portfolio updated for this session.');
}

function openSettings() {
  const opts = (values, current) => values.map(value => `<option${value === current ? ' selected' : ''}>${value}</option>`).join('');
  displayDialog('Goals and settings', `<p>Choose how you think about this portfolio. Lower swings adds a note to risk explanations. The time horizon is stored as context for future features.</p>
    <form id="settings-form">
      <label class="field">Time horizon<select id="horizon">${opts(['Under 3 years','3–5 years','Over 5 years'], state.profile.horizon)}</select></label>
      <label class="field">Sensitivity to swings<select id="sensitivity">${opts(['Lower swings','Balanced','Comfortable with swings'], state.profile.sensitivity)}</select></label>
      <label class="check"><input type="checkbox" id="enable-model" ${state.modelReady ? '' : 'disabled'} ${state.profile.ai && state.modelReady ? 'checked' : ''}> <span>Use optional AI question routing <small class="helper">${state.modelReady ? 'Your question text is sent to the configured model. Holdings stay in this browser.' : 'Available when the local server has an API key and model.'}</small></span></label>
      <div class="dialog-actions"><button class="button primary">Save settings</button></div>
    </form>`);
  $('#settings-form').addEventListener('submit', event => {
    event.preventDefault();
    state.profile = { horizon: $('#horizon').value, sensitivity: $('#sensitivity').value, ai: $('#enable-model').checked };
    const saved = persist();
    updateMode();
    $('#dialog').close();
    notify(saved ? 'Settings saved.' : 'Settings saved for this session.');
  });
}

function stock(ticker) {
  const security = F.securities[ticker];
  if (!security) return;
  const row = state.summary.rows.find(position => position.ticker === ticker);
  const filing = F.news.find(story => story.ticker === ticker);
  displayDialog(security.name, `<p>${ticker} · ${security.sector} · Demo close ${F.money(security.price)}${row ? ` · ${F.pct(row.weight)} portfolio weight` : ''}</p>
    <div class="detail-grid"><div>Quarterly YoY revenue<strong>${F.pct(security.growth)}</strong></div>
    <div>Trailing P/E<strong>${security.pe.toFixed(1)}×</strong></div>
    <div>Trailing ROE<strong>${F.pct(security.roe)}</strong></div></div>
    <p>Source · Synthetic quarterly and trailing twelve-month data available at the ${F.snapshot} snapshot.</p>
    <div class="dialog-actions"><button class="button secondary" data-prompt="Explain ${ticker} fundamentals">Ask about ${ticker}</button>
    ${filing ? `<button class="button secondary" data-go="story:${filing.id}">Read related event</button>` : ''}</div>`);
}

function showStory(id) {
  const story = F.news.find(item => item.id === id);
  if (!story) return;
  const row = state.summary.rows.find(position => position.ticker === story.ticker);
  displayDialog(story.title, `<p>${story.source} · ${story.date}</p><p>${story.detail}</p>
    <p>Portfolio connection · ${row ? `${story.ticker} represents ${F.pct(row.weight)} of portfolio value.` : `${story.ticker} is outside this portfolio.`}</p>
    <div class="dialog-actions"><button class="button secondary" data-go="stock:${story.ticker}">View fundamentals</button></div>`);
}

function go(target) {
  if (target.startsWith('stock:')) return stock(target.slice(6));
  if (target.startsWith('story:')) return showStory(target.slice(6));
  if (!Object.hasOwn(views, target)) return;
  if (location.hash === '#' + target) render();
  else location.hash = target;
}

function updateMode() {
  $('#engine-mode').textContent = state.modelReady && state.profile.ai ? 'AI routing enabled' : 'Portfolio Q&A · Rules mode';
}

const localServer = /^https?:$/.test(location.protocol) && ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
async function ask(question) {
  if (state.busy || !question.trim()) return;
  const block = document.createElement('div');
  const revision = state.revision, summary = state.summary, profile = state.profile, period = state.period;
  const user = document.createElement('p');
  user.textContent = question;
  user.className = 'user-message';
  block.append(user);
  const result = document.createElement('div');
  result.className = 'waiting';
  result.textContent = 'Reviewing your question…';
  block.append(result);
  $('#messages').append(block);
  state.busy = true;
  $('#send').disabled = true;
  const conversation = $('#conversation');
  conversation.scrollTop = conversation.scrollHeight;
  let topic = F.infer(question), routing = 'Rules';
  if (topic !== 'advice' && localServer && state.modelReady && profile.ai) {
    try {
      const response = await fetch('/api/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }), signal: AbortSignal.timeout(8500) });
      if (!response.ok) throw Error('Model unavailable');
      const data = await response.json();
      if (F.intents.includes(data.intent)) {
        topic = data.intent === 'help' && topic !== 'help' ? topic : data.intent;
        routing = 'AI-assisted routing';
      }
    } catch { /* Local rules handle timeouts and provider errors. */ }
  }
  state.busy = false;
  $('#send').disabled = false;
  if (state.revision !== revision) return;
  const response = F.answer(question, topic, summary, profile, period);
  result.className = 'answer';
  result.innerHTML = `<h3>${escapeHtml(response.title)}</h3><p>${escapeHtml(response.body)}</p>
    <small>${routing}${response.source ? ' · ' + escapeHtml(response.source) : ''}</small>
    <button class="text-button" data-go="${escapeHtml(response.action)}">${response.label}</button>`;
  const y = result.offsetTop - conversation.offsetTop;
  conversation.scrollTop = Math.min(y, conversation.scrollHeight - conversation.clientHeight);
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { go: target, prompt, period, filter } = button.dataset;
  if (target) go(target);
  if (button.hasAttribute('data-focus-assistant')) {
    $('#assistant').scrollIntoView({ block: 'start' });
    $('#question').focus({ preventScroll: true });
  }
  if (prompt) {
    if ($('#dialog').open) $('#dialog').close();
    if (matchMedia('(max-width:850px)').matches) $('#assistant').scrollIntoView({ block: 'start' });
    ask(prompt);
  }
  if (period) { state.period = period; render(`[data-period="${period}"]`); }
  if (filter) { state.newsFilter = filter; render(`[data-filter="${filter}"]`); }
});
$('#work').addEventListener('input', event => {
  if (event.target.id === 'shock') { state.shock = Number(event.target.value); updateScenario(); }
  if (event.target.id === 'scenario-sector') { state.sector = event.target.value; updateScenario(); }
});
$('#ask-form').addEventListener('submit', event => {
  event.preventDefault();
  if (state.busy) return;
  const field = $('#question');
  const question = field.value.trim();
  if (!question) return;
  field.value = '';
  ask(question);
});
$('#open-import').addEventListener('click', openImport);
$('#profile').addEventListener('click', openSettings);
$('#assistant-info').addEventListener('click', () => displayDialog('How the assistant works',
  '<p>It uses your holdings and fictional market data to explain portfolio questions. Portfolio math runs in the browser. Replies identify the data they used.</p><p>The optional model classifies your question. The app builds the answer from its own calculations and source records. Use the demo for education and practice.</p>'));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
restore();
updateMode();
render();
if (localServer) {
  fetch('/api/status').then(response => response.ok ? response.json() : {}).then(data => {
    state.modelReady = data.modelReady === true;
    updateMode();
  }).catch(() => {});
}
