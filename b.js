// Film sitesi modu: sayfadaki video oynatıcıyı eşler.
(function () {
  var src = document.currentScript && document.currentScript.src;
  if (!src) return;
  var u = new URL(src), room = u.searchParams.get('room');
  var vs = [].slice.call(document.querySelectorAll('video'));
  vs.sort(function (a, b) { return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight; });
  var v = vs[0];
  if (!v) { alert('Bu sayfada eşlenebilir video bulunamadı. Video başka bir siteden gömülüyse bu yöntem çalışmaz. Yarı otomatik modu kullanın.'); return; }
  var ws = new WebSocket((u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host);
  var lock = 0;
  var tag = document.createElement('div');
  tag.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;background:#7a1f2b;color:#f3d9a0;padding:6px 10px;border-radius:8px;font:13px sans-serif';
  tag.textContent = 'Bağlanıyor…';
  document.body.appendChild(tag);
  function send(o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
  ws.onopen = function () { send({ t: 'join', room: room, role: 'page', name: 'film' }); };
  ws.onmessage = function (e) {
    var m = JSON.parse(e.data);
    if (m.t === 'joined') tag.textContent = 'Senkron açık · oda ' + room;
    if (m.t === 'full') tag.textContent = 'Oda dolu';
    if (m.t === 'peer-join') tag.textContent = 'Eşin bağlandı · oda ' + room;
    if (m.t === 'vid') {
      lock = Date.now() + 900;
      if (Math.abs(v.currentTime - m.time) > 1.5) v.currentTime = m.time;
      if (m.a === 'play') v.play(); else if (m.a === 'pause') v.pause();
    }
  };
  ws.onclose = function () { tag.textContent = 'Bağlantı koptu, sayfayı yenileyip tekrar dene'; };
  function emit(a) { if (Date.now() < lock) return; send({ t: 'vid', a: a, time: v.currentTime }); }
  v.addEventListener('play', function () { emit('play'); });
  v.addEventListener('pause', function () { emit('pause'); });
  v.addEventListener('seeked', function () { emit(v.paused ? 'pause' : 'play'); });
  setInterval(function () { send({ t: 'ping' }); }, 25000);
})();
