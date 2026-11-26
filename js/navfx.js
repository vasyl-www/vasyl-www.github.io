/* Нижнє меню (мобільне): скляна «пігулка» з рідкою випуклістю, що виростає над новою вкладкою (форма — clip-path, рахується покадрово). */
(function () {
  var O = window.ORD, nav, gl, sh, rg, last = null, anim = 0, cur = { t: 0, cx: 0 };
  var BH = 64, RISE = 44, HR = 19, NECK = 8.5, BASE = 30, LIFT = -52, DUR = 620, SQ = 0.06;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia ? matchMedia('(max-width: 760px)') : { matches: true };
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outBack(x) { var c = 1.35; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function d(n) { return Math.round(n * 10) / 10; }
  function shape(W, H, t, cx) {
    var pw = W * (1 - SQ * t), x0 = (W - pw) / 2, x1 = x0 + pw, R = Math.min(36, H / 2), y0 = BH, y1 = BH + H;
    var p = 'M' + d(x0 + R) + ' ' + y0 + 'L' + d(x1 - R) + ' ' + y0 + 'A' + R + ' ' + R + ' 0 0 1 ' + d(x1) + ' ' + d(y0 + R) + 'L' + d(x1) + ' ' + d(y1 - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + d(x1 - R) + ' ' + y1 + 'L' + d(x0 + R) + ' ' + y1 + 'A' + R + ' ' + R + ' 0 0 1 ' + d(x0) + ' ' + d(y1 - R) + 'L' + d(x0) + ' ' + d(y0 + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + d(x0 + R) + ' ' + y0 + 'Z';
    if (t > 0.01) {
      var c = Math.max(x0 + R + BASE * .4, Math.min(x1 - R - BASE * .4, cx)), rise = RISE * t, hr = HR * Math.min(1, t * 1.7), cy = y0 - rise + hr, nw = NECK + (1 - Math.min(1, t * 1.4)) * 12, bw = BASE;
      p += 'M' + d(c - bw) + ' ' + (y0 + 4) + 'L' + d(c - bw) + ' ' + y0 + 'C' + d(c - bw * .35) + ' ' + y0 + ' ' + d(c - nw) + ' ' + d(y0 - rise * .35) + ' ' + d(c - nw) + ' ' + d(y0 - rise * .65) + 'L' + d(c - nw) + ' ' + d(cy) + 'L' + d(c + nw) + ' ' + d(cy) + 'L' + d(c + nw) + ' ' + d(y0 - rise * .65) + 'C' + d(c + nw) + ' ' + d(y0 - rise * .35) + ' ' + d(c + bw * .35) + ' ' + y0 + ' ' + d(c + bw) + ' ' + y0 + 'L' + d(c + bw) + ' ' + (y0 + 4) + 'Z';
      p += 'M' + d(c - hr) + ' ' + d(cy) + 'A' + d(hr) + ' ' + d(hr) + ' 0 1 1 ' + d(c + hr) + ' ' + d(cy) + 'A' + d(hr) + ' ' + d(hr) + ' 0 1 1 ' + d(c - hr) + ' ' + d(cy) + 'Z';
    }
    return p;
  }
  function draw(t, cx, btn) {
    if (!nav) return; var W = nav.offsetWidth, H = nav.offsetHeight; if (!W) return;
    gl.style.clipPath = 'path(nonzero, "' + shape(W, H, t, cx) + '")';
    var s = 'scaleX(' + (1 - SQ * t) + ')'; sh.style.transform = rg.style.transform = s;
    nav.style.setProperty('--mx', d(cx) + 'px'); nav.style.setProperty('--mb', d(BASE * Math.min(1, t * 2.2)) + 'px');
    if (btn) { var ic = btn.firstElementChild; if (ic) { if (t > 0) { ic.style.transition = 'none'; ic.style.transform = 'translateY(' + d(LIFT * t - 4) + 'px) scale(1.08)'; } else { ic.style.transition = ''; ic.style.transform = ''; } } }
    cur = { t: t, cx: cx };
  }
  function center(b) { return b.offsetLeft + b.offsetWidth / 2; }
  function run(from, to) {
    cancelAnimationFrame(anim); var t0 = performance.now(), fx = from ? center(from) : center(to), tx = center(to);
    (function step(now) {
      var k = Math.min(1, (now - t0) / DUR), t = k < .38 ? outBack(k / .38) : k < .56 ? 1 : 1 - ease((k - .56) / .44);
      t = Math.max(0, Math.min(1.08, t)); draw(Math.min(1, t), tx, to);
      if (k < 1) anim = requestAnimationFrame(step); else { draw(0, tx, to); }
    })(t0);
  }
  function sync() {
    if (!nav) return; var on = nav.querySelector('button.on'), btns = Array.prototype.slice.call(nav.querySelectorAll('button')); nav.setAttribute('data-t', on ? btns.indexOf(on) % 8 : 0);
    if (!mobile.matches) { last = on; return; }
    if (!on) { last = null; return; }
    if (on !== last) { var from = last && last.isConnected ? last : null; last = on; if (from && !reduce) run(from, on); else draw(0, center(on), on); }
  }
  function build() {
    nav = document.getElementById('nav'); if (!nav) return;
    if (!nav.querySelector('.nav-gl')) {
      ['nav-sh', 'nav-gl', 'nav-rg'].forEach(function (c, i) { var e = document.createElement('i'); e.className = c; e.setAttribute('aria-hidden', 'true'); nav.insertBefore(e, nav.children[i] || null); });
    }
    sh = nav.querySelector('.nav-sh'); gl = nav.querySelector('.nav-gl'); rg = nav.querySelector('.nav-rg');
  }
  function init() {
    nav = document.getElementById('nav'); if (!nav) return; build(); sync();
    new MutationObserver(function (m) { if (!nav.querySelector('.nav-gl')) { last = null; build(); } sync(); }).observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    var re = function () { cancelAnimationFrame(anim); var on = nav.querySelector('button.on'); if (on) draw(0, center(on), on); }; window.addEventListener('resize', re); window.addEventListener('orientationchange', re);
    if (window.ResizeObserver) new ResizeObserver(re).observe(nav); if (document.fonts && document.fonts.ready) document.fonts.ready.then(re);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  O.navfx = { shape: shape, run: run };
})();
