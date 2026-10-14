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
// googleSearch.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GET /api/google-search?q=kullanici_aramasi
 * Render ortamındaki Process Environment variable'larını kullanır.
 */
router.get('/google-search', async (req, res) => {
  try {
    const searchQuery = req.query.q;

    if (!searchQuery) {
      return res.status(400).json({
        status: "error",
        message: "Arama parametresi (q) eksik."
      });
    }

    const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const CX_KEY = process.env.GOOGLE_SEARCH_CX; // Custom Search Engine ID

    if (!API_KEY || !CX_KEY) {
      return res.status(500).json({
        status: "error",
        message: "Sunucu tarafında Google API anahtarları tanımlanmamış."
      });
    }

    // Google Custom Search API Çağrısı
    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_KEY}&q=${encodeURIComponent(searchQuery)}`;
    const response = await axios.get(googleUrl);

    // Google'dan gelen veriyi temizleyip sade bir JSON yapısına dönüştürme
    const searchResults = (response.data.items || []).map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      displayLink: item.displayLink
    }));

    // Frontend veya render ortamına iletilecek standart JSON yanıtı
    return res.status(200).json({
      status: "success",
      query: searchQuery,
      totalResults: response.data.searchInformation?.totalResults || "0",
      data: searchResults
    });

  } catch (error) {
    console.error("Google Search API Hatası:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: "Google araması gerçekleştirilirken bir hata oluştu.",
      error_detail: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
