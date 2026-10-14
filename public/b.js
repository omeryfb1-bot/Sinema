// Arama yapma veya Link Açma
async function filmAraVeyaAc() {
  const input = document.getElementById('searchInput').value.trim();
  if (!input) return;

  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<p>Aranıyor...</p>';

  // Eğer doğrudan bir link girilmişse
  if (input.startsWith('http://') || input.startsWith('https://')) {
    sitedeFilmAc(input);
    resultsDiv.innerHTML = '';
  } else {
    // Kelime girildiyse Google Search API çağır
    try {
      const res = await fetch(`/api/google-search?q=${encodeURIComponent(input)}`);
      const data = await res.json();

      if (data.status === 'success' && data.data.length > 0) {
        listeAramaSonuclari(data.data);
      } else {
        resultsDiv.innerHTML = '<p>Sonuç bulunamadı veya bir hata oluştu.</p>';
      }
    } catch (err) {
      resultsDiv.innerHTML = '<p>Arama sırasında bir bağlantı hatası oluştu.</p>';
    }
  }
}

// Google Sonuçlarını Listeleme
function listeAramaSonuclari(sonuclar) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';

  sonuclar.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `<strong>${item.title}</strong><br><small>${item.snippet}</small><br><i style="color:#aaa;">${item.displayLink}</i>`;
    div.onclick = () => {
      sitedeFilmAc(item.link);
    };
    container.appendChild(div);
  });
}

// Iframe veya Player'a Yükleme
function sitedeFilmAc(url) {
  const iframe = document.getElementById('playerFrame');
  
  // YouTube linki ise doğrudan embed olarak yükle
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    }
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else {
    // Normal web sitesi ise engelleri aşmak için proxy ile yükle
    iframe.src = `/api/proxy?url=${encodeURIComponent(url)}`;
  }
}
