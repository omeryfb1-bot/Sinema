const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const axios = require('axios');

const app = express();

app.use(express.static('public'));
app.use(express.json());

app.get('/health', (_, res) => res.send('ok'));

// Google Search API Endpoint
app.get('/api/google-search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).json({ status: "error", message: "Arama terimi girilmedi." });
    }

    const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const CX_KEY = process.env.GOOGLE_SEARCH_CX;

    if (!API_KEY || !CX_KEY) {
      return res.status(500).json({ status: "error", message: "API anahtarları Render üzerinde tanımlı değil." });
    }

    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_KEY}&q=${encodeURIComponent(searchQuery)}`;
    const response = await axios.get(googleUrl);

    const searchResults = (response.data.items || []).map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      displayLink: item.displayLink
    }));

    return res.json({ status: "success", query: searchQuery, data: searchResults });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Arama yapılırken hata oluştu.",
      error_detail: error.response?.data?.error?.message || error.message
    });
  }
});

// Iframe Engellerini Aşmak İçin Proxy
app.get('/api/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL eksik.');

    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Sayfa yüklenemedi.');
  }
});

// WebSocket & Sunucu Kurulumu
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map();

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
