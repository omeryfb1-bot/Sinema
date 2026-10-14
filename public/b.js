// Film arama veya direkt link açma fonksiyonu
async function filmAraVeyaAc() {
  const input = document.getElementById('searchInput').value.trim();
  if (!input) return;

  // Eğer yapıştırılan şey bir site linkiyse (https://...)
  if (input.startsWith('http://') || input.startsWith('https://')) {
    sitedeFilmAc(input);
    // Karşı tarafa da aynı linki açması için WebSocket mesajı at
    if (window.ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'open-url', url: input }));
    }
  } else {
    // Kelime yazıldıysa Google araması yap
    const res = await fetch(`/api/google-search?q=${encodeURIComponent(input)}`);
    const data = await res.json();
    
    if (data.status === 'success') {
      listeAramaSonuclari(data.data);
    }
  }
}

// Arama sonuçlarını ekrana dökme
function listeAramaSonuclari(sonuclar) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';

  sonuclar.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `<strong>${item.title}</strong><br><small>${item.snippet}</small>`;
    div.onclick = () => {
      sitedeFilmAc(item.link);
      if (window.ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ t: 'open-url', url: item.link }));
      }
    };
    container.appendChild(div);
  });
}

// Seçilen linki ekran kutusuna (iframe) yükleme
function sitedeFilmAc(url) {
  const iframe = document.getElementById('playerFrame');
  // Proxy üzerinden yüklüyoruz ki site engeline takılmasın
  iframe.src = `/api/proxy?url=${encodeURIComponent(url)}`;
}

// WebSocket dinleyicisi (Karşı taraf bir link açtığında sende de açılması için)
// Var olan WebSocket kodunun mesaj dinleme kısmına ekle:
if (window.ws) {
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.t === 'open-url') {
      sitedeFilmAc(msg.url);
    }
  });
}
