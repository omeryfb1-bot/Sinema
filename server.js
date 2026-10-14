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

// Orijinal WebSocket & Oda Yönetimi
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
