/* Перехід між екранами як продовження краплі в меню: від натиснутого пункту розходиться хвиля, що відкриває новий екран,
   блоки з'являються по черзі й із боку напрямку руху (вправо/вліво по вкладках). Без анімацій у системі — миттєво. */
(function () {
  var O = window.ORD, busy = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function btnOf(v) { return document.querySelector('#nav > button[data-v="' + v + '"]'); }
  O.transit = function (prev, next, parentOf) {
    if (reduce || !prev || !next || !document.body.animate) return;
    var pp = parentOf(prev), np = parentOf(next); if (pp === np) return;
    var main = document.querySelector('main'), on = document.querySelector('#nav > button.on'); if (!main || !on) return;
    var bs = Array.prototype.slice.call(document.querySelectorAll('#nav > button[data-v]')), a = bs.indexOf(btnOf(pp)), b = bs.indexOf(on), dir = a < 0 || b < 0 ? 0 : (b > a ? 1 : b < a ? -1 : 0);
    var mr = main.getBoundingClientRect(), br = on.getBoundingClientRect(), x = br.left + br.width / 2 - mr.left, y = Math.min(br.top + br.height / 2 - mr.top, mr.height), W = mr.width, H = mr.height, R = Math.ceil(Math.hypot(Math.max(Math.abs(x), Math.abs(W - x)), Math.max(Math.abs(y), Math.abs(H - y)))) + 30;
    var t = ++busy; main.style.setProperty('--dx', (dir * 26) + 'px'); Array.prototype.forEach.call(main.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 8)); }); main.classList.add('entering');
    var dur = 760, ease = 'cubic-bezier(.2,.62,.3,1)';
    var an = main.animate([{ clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' }, { clipPath: 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)' }], { duration: dur, easing: ease }); an.onfinish = an.oncancel = function () { try { main.style.clipPath = ''; } catch (e) {} };
    var ring = document.createElement('div'); ring.className = 'tr-wave'; ring.style.cssText = 'left:' + (mr.left + x) + 'px;top:' + (mr.top + y) + 'px;width:' + (R * 2) + 'px;height:' + (R * 2) + 'px'; document.body.appendChild(ring);
    var ra = ring.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: dur + 80, easing: ease }); ra.onfinish = ra.oncancel = function () { ring.remove(); };
  };
})();
