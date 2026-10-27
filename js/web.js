/* Режим веб-версії (GitHub Pages): без локального сервера; реєстрація service worker. */
window.ORD_WEB = true;
window.ORD = window.ORD || {};
if ('serviceWorker' in navigator && location.protocol === 'https:') { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }
