/* Нижнє меню (мобільне): склянa «пігулка», ковзний індикатор і випуклість під активною вкладкою. */
(function () {
  var O = window.ORD, nav, ind, raf = 0;
  function place() {
    raf = 0; if (!nav) return; var on = nav.querySelector('button.on'); if (!ind) return;
    if (!on) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1; nav.style.setProperty('--ix', on.offsetLeft + 'px'); nav.style.setProperty('--iw', on.offsetWidth + 'px');
  }
  function sched() { if (!raf) raf = requestAnimationFrame(place); }
  function setup() {
    nav = document.getElementById('nav'); if (!nav) return;
    if (!nav.querySelector('.nav-ind')) { ind = document.createElement('i'); ind.className = 'nav-ind'; ind.setAttribute('aria-hidden', 'true'); nav.insertBefore(ind, nav.firstChild); } else ind = nav.querySelector('.nav-ind');
    sched();
  }
  function init() {
    nav = document.getElementById('nav'); if (!nav) return;
    new MutationObserver(function (m) { if (!nav.querySelector('.nav-ind') || m.some(function (x) { return x.type === 'childList'; })) setup(); else sched(); }).observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', sched); window.addEventListener('orientationchange', sched);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sched); setup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  O.navfx = { place: place };
})();
