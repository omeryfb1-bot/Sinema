const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static('public'));
app.get('/health', (_, res) => res.send('ok'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map(); // oda kodu -> Set(ws)

function relay(ws, msg) {
  const r = rooms.get(ws.room);
  if (!r) return;
  const data = JSON.stringify(msg);
  for (const c of r) if (c !== ws && c.readyState === 1 && c.role === ws.role) c.send(data);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') return;
    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return;
      ws.role = m.role === 'page' ? 'page' : 'app';
      ws.room = code;
      ws.name = String(m.name || 'Misafir').slice(0, 20);
      if (!rooms.has(code)) rooms.set(code, new Set());
      const r = rooms.get(code);
      const same = [...r].filter((c) => c.role === ws.role).length;
      if (same >= 2) { ws.send(JSON.stringify({ t: 'full' })); ws.room = null; return; }
      r.add(ws);
      ws.send(JSON.stringify({ t: 'joined', room: code, peers: same }));
      relay(ws, { t: 'peer-join', name: ws.name });
      return;
    }
    if (!ws.room) return;
    m.from = ws.name;
    relay(ws, m);
  });
  ws.on('close', () => {
    if (!ws.room) return;
    const r = rooms.get(ws.room);
    if (!r) return;
    r.delete(ws);
    relay(ws, { t: 'peer-leave', name: ws.name });
    if (r.size === 0) rooms.delete(ws.room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Sinema odası çalışıyor: ' + PORT));
