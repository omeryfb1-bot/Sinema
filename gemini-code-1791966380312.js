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