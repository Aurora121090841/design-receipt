import assert from 'node:assert/strict';
import { quote } from '../pricing.mjs';

const first = { price: '50.01', quantity: '1', group: 'A', extras: [{ price: '8.99' }] };
const second = { price: '60.01', quantity: '3', group: ' A ', extras: [{ price: '10' }] };
const unrelated = { price: '0.29', quantity: '3', group: '', extras: [] };
const result = quote([first, second, unrelated], '2');
assert.deepEqual(result.lines.map(line => [line.half, line.amount]), [[false, 5900], [true, 10002], [false, 87]]);
assert.equal(result.subtotal, 15989);
assert.equal(result.total, 31978);
assert.equal(quote([second], '1').total, 19003);
