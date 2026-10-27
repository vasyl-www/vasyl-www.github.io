'use strict';
const assert = require('assert');
const S = require('../js/srs');
const D = S.DAY; let now = 1.7e12; const rng = function () { return 0.5; };
// нова картка: добре -> крок 2 -> випуск на 1 день
let c = S.newCard('a', now);
c = S.review(c, 3, now, rng); assert.strictEqual(c.st, 'learn'); assert.strictEqual(c.due, now + 10 * 6e4);
c = S.review(c, 3, now, rng); assert.strictEqual(c.st, 'review'); assert.strictEqual(c.ivl, 1);
// інтервал росте мультиплікативно, «легко» швидше, «важко» повільніше
let g = c, e = c, h = c;
for (let i = 0; i < 4; i++) { g = S.review(g, 3, now, rng); e = S.review(e, 4, now, rng); h = S.review(h, 2, now, rng); }
assert.ok(e.ivl > g.ivl && g.ivl > h.ivl, 'easy>good>hard: ' + [e.ivl, g.ivl, h.ivl]);
assert.ok(h.ease < 2.5 && e.ease > 2.5);
// збій: ease падає не нижче 1.3, інтервал скорочується, лічильник збоїв, піявка після 4
let l = g; const before = l.ivl;
for (let i = 0; i < 5; i++) { l = S.review(S.review(S.review(l, 3, now, rng), 3, now, rng), 1, now, rng); }
assert.ok(l.ease >= 1.3 && l.ease < 2.5); assert.ok(l.leech && l.lapses >= 4); assert.strictEqual(l.st, 'learn');
assert.ok(S.review(g, 1, now, rng).ivl < before * 100);
// оригінал не мутує
const orig = JSON.stringify(c); S.review(c, 4, now, rng); assert.strictEqual(JSON.stringify(c), orig);
// оцінка за відповіддю
assert.strictEqual(S.gradeFrom(false, 1000), 1); assert.strictEqual(S.gradeFrom(true, 20000), 2);
assert.strictEqual(S.gradeFrom(true, 2000, { typed: true }), 4); assert.strictEqual(S.gradeFrom(true, 2000), 3); assert.strictEqual(S.gradeFrom(true, 2000, { hint: true }), 2);
// статистика
const cards = { a: c, n: S.newCard('n', now), m: Object.assign(S.newCard('m', now), { st: 'review', ivl: 30, due: now - 1 }) };
const cnt = S.counts(cards, now); assert.deepStrictEqual([cnt.new, cnt.young, cnt.mature, cnt.due], [1, 1, 1, 1]);
const log = [];
for (let i = 0; i < 10; i++) log.push({ t: now - i * 3600e3, id: 'm', g: i < 8 ? 3 : 1, st: 'review', ivl: 30, ms: 2000 });
const r = S.retention(log, now, 30, true); assert.strictEqual(r.n, 10); assert.ok(Math.abs(r.rate - 0.8) < 1e-9);
assert.strictEqual(S.retention([{ t: now, g: 1, st: 'learn' }], now, 30).n, 0, 'навчання не рахується в утриманні');
assert.ok(S.streak([{ t: now }, { t: now - D }, { t: now - 2 * D }], now) >= 3);
const f = S.forecast({ x: Object.assign(S.newCard('x', now), { st: 'review', ivl: 3, due: now + 3 * D + 100 }) }, now, 7); assert.strictEqual(f[3], 1);
const tomorrow = S.forecast({ y: Object.assign(S.newCard('y', now), { st: 'review', ivl: 1, due: now + D - 5000 }) }, now, 7); assert.ok(tomorrow[1] === 1 || tomorrow[0] === 1, 'картка на завтра не губиться');
const q = S.queue(cards, now, 5); assert.strictEqual(q.due.length, 1); assert.strictEqual(q.fresh.length, 1);
console.log('srs.test: OK');
