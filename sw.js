/* Ord 2: service worker. Кешує лише файли цього сайту (мережа першою, кеш для офлайну).
   Запити до API провайдерів ШІ, Firebase та погоди не перехоплюються й не кешуються. */
const CACHE = 'ord2-v3';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {})); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ns) => Promise.all(ns.filter((n) => n !== CACHE && n !== 'ord-meta').map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then((m) => m || caches.match('./index.html'))));
});

/* Нагадування. Сторінка лишає в Cache Storage ('ord-meta') підсумок: час нагадування й кількість карток до повторення.
   Chrome (встановлений застосунок) іноді будить воркер за periodicsync; тоді показуємо сповіщення, якщо час настав і сьогодні ще не показували. */
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'ord-remind') return;
  e.waitUntil((async () => {
    const c = await caches.open('ord-meta'), r = await c.match('meta'); if (!r) return; const m = await r.json(); if (!m.on) return;
    const n = new Date(), day = new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (m.last === day || !(n.getHours() > m.h || (n.getHours() === m.h && n.getMinutes() >= m.m))) return;
    m.last = day; await c.put('meta', new Response(JSON.stringify(m)));
    await self.registration.showNotification('Ord 2', { body: m.no ? (m.due > 0 ? 'Til repetisjon: ' + m.due + ' kort. Et par minutter norsk?' : 'Tid for en kort norskøkt.') : (m.due > 0 ? 'До повторення: ' + m.due + ' карток. Пара хвилин на норвезьку?' : 'Час для короткої сесії норвезької.'), icon: 'icon-192.png', badge: 'icon-192.png', tag: 'ord-remind' });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
