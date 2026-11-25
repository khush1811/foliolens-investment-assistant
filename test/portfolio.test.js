'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const F = require('../dist/portfolio');
const { sendClassification } = require('../model');

test('marked value, prior-close change, cost basis and exposures reconcile', () => {
  const fixture = fs.readFileSync(require.resolve('../dist/sample-holdings.csv'), 'utf8');
  assert.deepEqual(F.parseCSV(fixture), F.sample);
  const summary = F.portfolio(F.sample);
  assert.equal(summary.value, 250000);
  assert.equal(summary.cost, 227060);
  assert.equal(summary.pnl, 22940);
  assert.equal(summary.day, 1960);
  assert.equal(summary.top.weight, 38.4);
  assert.equal(summary.allocation[0].weight, 54.72);
  assert.equal(summary.concentration, true);
  assert.ok(Math.abs(summary.allocation.reduce((sum, item) => sum + item.weight, 0) - 100) < 1e-9);
  assert.deepEqual(F.stress(summary, 'Technology', -10), { exposure: 54.72, percent: -5.472, value: -13680 });
  const illustrated = F.history(summary, '3M');
  assert.ok(Math.abs(illustrated.points.at(-1).portfolio - (100 + illustrated.gain)) < 1e-9);
});

test('import accepts reordered quoted fields and aggregates duplicate cost lots', () => {
  const data = '\uFEFFavg_cost,ticker,shares\r\n"700","vanta","5"\r\n850,VANTA,10\r\n\r\n';
  assert.deepEqual(F.parseCSV(data), [{ ticker: 'VANTA', shares: 15, avgCost: 800 }]);
  for (const row of ['VANTA,0,50', 'VANTA,1,', 'VANTA,1,1e7', 'NOPE,4,10', '"VANTA,3,5']) {
    assert.throws(() => F.parseCSV('ticker,shares,avg_cost\n' + row));
  }
});

test('assistant uses the active positions and handles absent news, oversized shocks and advice', () => {
  const one = F.portfolio(F.parseCSV('ticker,shares,avg_cost\nASTRA,10,90'));
  assert.match(F.answer('How concentrated am I?', 'risk', one, {}, '3M').body, /Astra Health.+100\.0%/);
  assert.match(F.answer('Latest news?', 'news', one, {}, '3M').title, /No relevant/);
  assert.match(F.answer('What if Technology drops 10%?', 'scenario', one, {}, '3M').body, /₹0/);
  assert.match(F.answer('What if Technology drops 1000%?', 'scenario', one, {}, '3M').title, /smaller/);
  assert.equal(F.infer('Should I buy VANTA?'), 'advice');
});

test('model receives question and intent schema only and refuses invalid output', async () => {
  const fake = intent => async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body);
    assert.equal(payload.input, 'Where am I most exposed?');
    assert.equal(payload.store, false);
    assert.deepEqual(payload.text.format.schema.properties.intent.enum, F.intents);
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [
      { type: 'output_text', text: JSON.stringify({ intent }) }
    ] }] }) };
  };
  const env = { OPENAI_API_KEY: 'test-only', OPENAI_MODEL: 'test' };
  assert.equal(await sendClassification('Where am I most exposed?', env, fake('risk')), 'risk');
  await assert.rejects(sendClassification('Where am I most exposed?', env, fake('invented')));
  assert.equal(await sendClassification('Should I sell?', env, () => assert.fail('should bypass provider')), 'advice');
});
