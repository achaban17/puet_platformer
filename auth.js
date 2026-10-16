// Реєстрація, вхід і рейтинг Топ-5. Працює з Google Apps Script (див. apps-script/Code.gs).
// Налаштування: window.PUET_CONFIG = { game:'platformer', api:'https://script.google.com/macros/s/.../exec', formula:'…' }
(function () {
  var C = window.PUET_CONFIG || {};
  var KEY = 'puet_token_' + C.game, token = null, user = null;
  var MEDAL = ['🥇', '🥈', '🥉', '4.', '5.'];

  var css = '.puet-ui{font-family:system-ui,sans-serif;color:#fff;touch-action:auto;user-select:auto;-webkit-user-select:auto}' +
    '.puet-ui *{box-sizing:border-box;font-family:inherit}' +
    '.puet-bg{position:fixed;inset:0;z-index:2147483647;background:rgba(8,12,20,.94);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.puet-c{width:100%;max-width:360px;max-height:100%;overflow:auto;background:#1b2530;border:1px solid #33465c;border-radius:16px;padding:22px}' +
    '.puet-c h2{margin:0 0 14px;font-size:20px;text-align:center}' +
    '.puet-t{display:flex;gap:6px;margin-bottom:14px}' +
    '.puet-t button{flex:1;padding:10px;border:0;border-radius:10px;background:#2a3846;color:#cfd8e3;font-size:15px}' +
    '.puet-t button.on{background:#1f5fbf;color:#fff}' +
    '.puet-c label{display:block;font-size:13px;color:#9aa8b6;margin:10px 0 4px}' +
    '.puet-c input{width:100%;padding:12px;font-size:16px;border-radius:10px;border:1px solid #40536a;background:#0f161e;color:#fff}' +
    '.puet-go{width:100%;margin-top:16px;padding:13px;border:0;border-radius:10px;background:#f39200;color:#111;font-size:16px;font-weight:700}' +
    '.puet-go:disabled{opacity:.6}' +
    '.puet-e{color:#ff7b7b;font-size:14px;min-height:18px;margin-top:10px;text-align:center}' +
    '.puet-bar{position:fixed;top:calc(4px + env(safe-area-inset-top,0px));right:6px;z-index:2147483646;font-size:12px;background:#000b;padding:4px 8px;border-radius:8px;display:flex;gap:10px;align-items:center}' +
    '.puet-bar a{color:#8fd0ff;cursor:pointer}' +
    '.puet-c ol{list-style:none;margin:8px 0;padding:0}' +
    '.puet-c li{display:flex;justify-content:space-between;padding:7px 10px;border-radius:8px;font-size:16px}' +
    '.puet-c li.me{background:#f3920033;color:#ffc46b;font-weight:700}' +
    '.puet-sub{color:#9aa8b6;font-size:13px;text-align:center;margin:6px 0}' +
    '.puet-ok{color:#8fe28f;text-align:center;font-size:15px;margin:6px 0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // поки відкрите вікно — гра не перехоплює клавіші (пробіл, стрілки)
  ['keydown', 'keyup', 'keypress'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      var n = e.target; while (n && n.nodeType === 1) { if (n.classList.contains('puet-ui')) { e.stopPropagation(); return; } n = n.parentNode; }
    }, true);
  });

  // ---------- запити ----------
  function call(data) {
    if (!C.api || C.api.indexOf('https://') !== 0) return Promise.reject(new Error('Не вказано адресу API у налаштуваннях гри'));
    return fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.error) throw new Error(j.error); return j; })
      .catch(function (e) { throw new Error(/fetch|Failed|network/i.test(e.message) ? "Немає зв'язку із сервером" : e.message); });
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // ---------- публічне API ----------
  var API = window.PUET = {
    get user() { return user; },
    top: function () { return call({ action: 'top', token: token }); },
    submit: function (res) { var d = { action: 'submit', token: token }; for (var k in res) d[k] = res[k]; return call(d); },
    showBoard: showBoard
  };

  // ---------- рейтинг ----------
  function renderBoard(box, j) {
    box.textContent = '';
    if (j.rating != null) {
      box.appendChild(el('div', 'puet-sub', 'Твій рейтинг за цей забіг: ' + j.rating));
      box.appendChild(el('div', 'puet-ok', j.improved ? '🎉 Новий особистий рекорд!' : 'Твій найкращий: ' + j.best));
    }
    var ol = el('ol');
    if (!j.top.length) ol.appendChild(el('li', '', 'Поки що порожньо — стань першим!'));
    var inTop = false;
    j.top.forEach(function (r, i) {
      var li = el('li', r.me ? 'me' : ''); if (r.me) inTop = true;
      li.appendChild(el('span', '', MEDAL[i] + ' ' + r.name)); li.appendChild(el('b', '', String(r.rating)));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    if (j.rank && !inTop) box.appendChild(el('div', 'puet-sub', 'Твоє місце: ' + j.rank + ' · рейтинг ' + j.best));
  }
  function showBoard(result, summary) {
    var old = document.getElementById('puet-board'); if (old) old.remove();
    var bg = el('div', 'puet-ui puet-bg'); bg.id = 'puet-board';
    var c = el('div', 'puet-c'); bg.appendChild(c);
    c.appendChild(el('h2', '', '🏆 Топ-5 гравців'));
    if (summary) c.appendChild(el('div', 'puet-sub', summary));
    var box = el('div'); c.appendChild(box);
    if (C.formula) c.appendChild(el('div', 'puet-sub', C.formula));
    var close = el('button', 'puet-go', 'Закрити'); close.onclick = function () { bg.remove(); }; c.appendChild(close);
    document.body.appendChild(bg);
    box.appendChild(el('div', 'puet-sub', result ? 'Зберігаю результат…' : 'Завантаження…'));
    var p = result ? API.submit(result) : API.top();
    p.then(function (j) { renderBoard(box, j); })
     .catch(function (e) {
        box.textContent = '';
        box.appendChild(el('div', 'puet-e', 'Не вдалося: ' + e.message));
        var retry = el('button', 'puet-go', 'Спробувати ще раз'); retry.onclick = function () { showBoard(result, summary); };
        box.appendChild(retry);
      });
  }

  // ---------- вхід ----------
  function loggedIn(tk, name) {
    token = tk; user = { name: name };
    try { localStorage.setItem(KEY, tk); } catch (e) {}
    var o = document.getElementById('puet-auth'); if (o) o.remove();
    var bar = document.getElementById('puet-bar'); if (bar) bar.remove();
    bar = el('div', 'puet-ui puet-bar'); bar.id = 'puet-bar';
    var top = el('a', '', '🏆 Топ-5'); top.onclick = function () { showBoard(); };
    var out = el('a', '', 'вийти'); out.onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
    bar.appendChild(el('span', '', '👤 ' + name)); bar.appendChild(top); bar.appendChild(out);
    document.body.appendChild(bar);
    window.dispatchEvent(new CustomEvent('puet-login', { detail: { name: name } }));
  }
  function showAuth() {
    var mode = 'login';
    var bg = el('div', 'puet-ui puet-bg'); bg.id = 'puet-auth';
    bg.innerHTML = '<div class="puet-c"><h2></h2><div class="puet-t"><button data-m="login">Вхід</button><button data-m="reg">Реєстрація</button></div>' +
      '<div id="pa-reg" style="display:none"><label>Ім\'я та прізвище</label><input id="pa-n" autocomplete="name" placeholder="Іван Петренко">' +
      '<label>Рік народження</label><input id="pa-y" type="number" inputmode="numeric" placeholder="2005"></div>' +
      '<label>Номер телефону</label><input id="pa-p" type="tel" autocomplete="tel" placeholder="+380 50 123 45 67">' +
      '<label>Пароль</label><input id="pa-w" type="password" placeholder="Мінімум 4 символи">' +
      '<div class="puet-e" id="pa-e"></div><button class="puet-go" id="pa-g"></button></div>';
    bg.querySelector('h2').textContent = C.title || 'ПУЕТ · Ігри';
    document.body.appendChild(bg);
    var $ = function (id) { return bg.querySelector('#' + id); };
    function setMode(m) {
      mode = m; $('pa-reg').style.display = m === 'reg' ? 'block' : 'none';
      $('pa-g').textContent = m === 'reg' ? 'Зареєструватись' : 'Увійти'; $('pa-e').textContent = '';
      $('pa-w').autocomplete = m === 'reg' ? 'new-password' : 'current-password';
      bg.querySelectorAll('.puet-t button').forEach(function (b) { b.className = b.dataset.m === m ? 'on' : ''; });
    }
    bg.querySelectorAll('.puet-t button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.m); }; });
    function submit() {
      var btn = $('pa-g'); btn.disabled = true; $('pa-e').textContent = '';
      var d = { action: mode === 'reg' ? 'register' : 'login', phone: $('pa-p').value, password: $('pa-w').value };
      if (mode === 'reg') { d.name = $('pa-n').value; d.year = $('pa-y').value; }
      call(d).then(function (r) { loggedIn(r.token, r.name); })
        .catch(function (e) { $('pa-e').textContent = e.message; btn.disabled = false; });
    }
    $('pa-g').onclick = submit;
    bg.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    setMode('login');
  }
  function init() {
    var tk = null; try { tk = localStorage.getItem(KEY); } catch (e) {}
    if (!tk) return showAuth();
    call({ action: 'me', token: tk }).then(function (r) { loggedIn(tk, r.name); }).catch(showAuth);
  }
  if (document.body) init(); else addEventListener('DOMContentLoaded', init);
})();
