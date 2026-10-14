// Film sitesi modu: video senkronu + küçük chat kutusu
(function () {
  if (window.__sinemaOn) return;
  var src = document.currentScript && document.currentScript.src;
  if (!src) return;
  var u = new URL(src), room = u.searchParams.get('room');
  var vs = [].slice.call(document.querySelectorAll('video'));
  vs.sort(function (a, b) { return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight; });
  var v = vs[0];
  if (!v) { alert('Bu sayfada eşlenebilir video bulunamadı. Önce filmi başlat, sonra yer imine dokun. Video başka siteden gömülüyse bu yöntem çalışmaz.'); return; }
  window.__sinemaOn = true;
  var name = (prompt('Adın ne? (eşin bu adı görecek)') || 'Eşin').slice(0, 20);

  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; }
  var box = el('div', 'position:fixed;right:8px;top:8px;width:240px;z-index:2147483647;background:#2a0a10;color:#f4ead6;border:1px solid #d9b36c;border-radius:10px;font:13px/1.35 sans-serif;box-shadow:0 4px 20px #000a');
  var head = el('div', 'display:flex;justify-content:space-between;padding:7px 10px;background:#5c1520;border-radius:9px;cursor:pointer');
  var status = el('span', '', 'Bağlanıyor…'), tog = el('span', '', '–');
  head.appendChild(status); head.appendChild(tog);
  var body = el('div');
  var log = el('div', 'max-height:150px;overflow-y:auto;padding:6px 8px;display:flex;flex-direction:column;gap:4px');
  var row = el('div', 'display:flex;gap:4px;padding:6px');
  var inp = el('input', 'flex:1;min-width:0;background:#1d0a0e;color:#f4ead6;border:1px solid #4a2a30;border-radius:6px;padding:6px;font-size:16px');
  inp.placeholder = 'Mesaj yaz';
  var snd = el('button', 'background:#d9b36c;color:#150507;border:0;border-radius:6px;padding:6px 10px;font-weight:700', 'Gönder');
  var cdb = el('button', 'margin:0 6px 6px;width:calc(100% - 12px);background:transparent;color:#d9b36c;border:1px solid #d9b36c;border-radius:6px;padding:6px', '3-2-1 başlat');
  row.appendChild(inp); row.appendChild(snd);
  body.appendChild(log); body.appendChild(row); body.appendChild(cdb);
  box.appendChild(head); box.appendChild(body);
  document.body.appendChild(box);
  head.onclick = function () { var h = body.style.display === 'none'; body.style.display = h ? '' : 'none'; tog.textContent = h ? '–' : '+'; };
  ['keydown', 'keyup', 'keypress'].forEach(function (k) { inp.addEventListener(k, function (e) { e.stopPropagation(); }); });

  function add(txt, mine, sys) {
    var d = el('div', sys ? 'text-align:center;color:#b9a98a;font-size:12px' : 'padding:5px 8px;border-radius:10px;max-width:90%;word-wrap:break-word;' + (mine ? 'align-self:flex-end;background:#d9b36c;color:#150507' : 'background:#3a141c'), txt);
    log.appendChild(d); log.scrollTop = 1e9;
  }
  function countdown() {
    var n = 3, big = el('div', 'position:fixed;inset:0;display:grid;place-items:center;background:#000a;color:#d9b36c;font:700 40vmin/1 sans-serif;z-index:2147483646;pointer-events:none');
    document.body.appendChild(big);
    (function tick() {
      if (n === 0) { big.textContent = 'Başla'; big.style.fontSize = '18vmin'; setTimeout(function () { big.remove(); }, 900); return; }
      big.textContent = n; n--; setTimeout(tick, 1000);
    })();
  }

  var ws = new WebSocket((u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host);
  var lock = 0;
  function send(o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
  ws.onopen = function () { send({ t: 'join', room: room, role: 'page', name: name }); };
  ws.onmessage = function (e) {
    var m = JSON.parse(e.data);
    if (m.t === 'joined') { status.textContent = 'Oda ' + room + (m.peers ? ' · eşin burada' : ' · eşin bekleniyor'); add('Bağlandın.', false, true); }
    else if (m.t === 'full') { status.textContent = 'Oda dolu'; }
    else if (m.t === 'peer-join') { status.textContent = 'Oda ' + room + ' · eşin burada'; add(m.name + ' bağlandı.', false, true); }
    else if (m.t === 'peer-leave') { status.textContent = 'Oda ' + room + ' · eşin bekleniyor'; add(m.name + ' ayrıldı.', false, true); }
    else if (m.t === 'chat') { add(m.from + ': ' + m.txt, false); }
    else if (m.t === 'count') { countdown(); }
    else if (m.t === 'vid') {
      lock = Date.now() + 900;
      if (Math.abs(v.currentTime - m.time) > 1.5) v.currentTime = m.time;
      if (m.a === 'play') v.play(); else if (m.a === 'pause') v.pause();
    }
  };
  ws.onclose = function () { status.textContent = 'Koptu, sayfayı yenile'; };
  function sendChat() { var t = inp.value.trim(); if (!t) return; send({ t: 'chat', txt: t }); add(t, true); inp.value = ''; }
  snd.onclick = sendChat;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChat(); });
  cdb.onclick = function () { send({ t: 'count' }); countdown(); };

  function emit(a) { if (Date.now() < lock) return; send({ t: 'vid', a: a, time: v.currentTime }); }
  v.addEventListener('play', function () { emit('play'); });
  v.addEventListener('pause', function () { emit('pause'); });
  v.addEventListener('seeked', function () { emit(v.paused ? 'pause' : 'play'); });
  setInterval(function () { send({ t: 'ping' }); }, 25000);
})();
