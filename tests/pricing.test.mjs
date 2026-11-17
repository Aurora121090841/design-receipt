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

assert.equal(quote([item('1', '', [extras.glitter])], { ...commercial, visibility: 'private' }).total, 7500);
assert.equal(quote([item()], { ...buyout, visibility: 'private' }).total, 19250);

for (const [pieces, discount] of [[5, 1], [6, 0.9], [8, 0.9], [9, 0.8]]) {
  const result = quote(Array.from({ length: pieces }, () => item()), commercial);
  assert.equal(result.discount, discount);
  assert.equal(result.total, Math.round(4400 * pieces * discount));
}
const grouped = quote([item('6', 'A'), item('1', ' A '), item('5')], commercial);
assert.equal(grouped.pieces, 2);
assert.equal(grouped.subtotal, 26400);
assert.equal(grouped.total, 52800);
assert.equal(quote([item('9')], order).discount, 1);
assert.equal(new Set(defaults.map(entry => entry.name)).size, defaults.length);
assert.equal(defaults.find(entry => entry.name === '吧唧背卡 · 单面').price, '10');
assert.equal(defaults.find(entry => entry.name === '月历 · 13 张正反').price, '80');

const mixed = quote([
  { ...item('10', '', [extras.glitter]), usage: 'personal' },
  { ...item('5', '', [extras.glitter]), usage: 'commercial' },
  { ...item('1', 'A', [extras.glitter]), usage: 'buyout' },
  { ...item('2', 'A'), usage: 'personal' }
], { ...order, visibility: 'private', rush: 'days', waiveCraft: true });
assert.equal(mixed.pieces, 2);
assert.deepEqual(mixed.lines.map(line => line.total), [68400, 59000, 15400, 13200]);
assert.deepEqual(mixed.lines.slice(0, 3).map(line => Boolean(line.extras[0].waived)), [false, false, true]);
assert.equal(mixed.total, 156000);

const gift = { ...item('9', 'gift-group', [glitter]), usage: 'gift' };
const giftOrder = { ...commercial, visibility: 'private', rush: 'day' };
assert.equal(quote([gift], giftOrder).total, 0);
assert.equal(quote([gift], giftOrder).subtotal, 0);
assert.equal(quote([gift], giftOrder).pieces, 0);
assert.equal(quote([gift, { ...item('5'), usage: 'commercial' }], giftOrder).discount, 1);
assert.equal(quote([{ ...gift, usage: 'commercial' }], commercial).total, 42800);

const repeated = quote([item('99')], commercial);
assert.equal(repeated.pieces, 1);
assert.equal(repeated.discount, 1);
assert.equal(repeated.total, 435600);
const sixDesigns = quote(Array.from({ length: 6 }, () => item('10')), commercial);
assert.equal(sixDesigns.pieces, 6);
assert.equal(sixDesigns.discount, 0.9);
assert.equal(sixDesigns.total, 237600);
