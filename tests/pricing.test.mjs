import assert from 'node:assert/strict';
import { quote } from '../pricing.mjs';
import { defaults, extras } from '../catalog.mjs';

const order = { usage: 'personal', rush: 'normal', visibility: 'public' };
const item = (quantity = '1', group = '', extras = []) => ({ price: '22', quantity, group, extras });
const commercial = { ...order, usage: 'commercial' };
const buyout = { ...order, usage: 'buyout', rush: 'day', waiveCraft: true };
const glitter = { ...extras.glitter, quantity: '2' };

assert.equal(quote([item('1', '', [extras.glitter])], commercial).total, 6000);
assert.equal(quote([item('1', '', [glitter])], commercial).total, 7600);
assert.equal(quote([item('1', '', [glitter, extras.waist])], buyout).total, 20250);
assert.equal(quote([item()], { ...order, visibility: 'private', rush: 'days' }).total, 6600);

for (const [pieces, discount] of [[5, 1], [6, 0.9], [8, 0.9], [9, 0.8]]) {
  const result = quote([item(String(pieces))], commercial);
  assert.equal(result.discount, discount);
  assert.equal(result.total, Math.round(4400 * pieces * discount));
}
const grouped = quote([item('6', 'A'), item('1', ' A '), item('5')], commercial);
assert.equal(grouped.pieces, 6);
assert.equal(grouped.subtotal, 26400);
assert.equal(grouped.total, 47520);
assert.equal(quote([item('9')], order).discount, 1);
assert.equal(new Set(defaults.map(entry => entry.name)).size, defaults.length);
assert.equal(defaults.find(entry => entry.name === '吧唧背卡 · 单面').price, '10');
assert.equal(defaults.find(entry => entry.name === '月历 · 13 张正反').price, '80');
