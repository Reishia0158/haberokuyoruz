const searchInput = document.getElementById('searchInput');
const sourceSelect = document.getElementById('sourceSelect');
const categorySelect = document.getElementById('categorySelect');
const dateSelect = document.getElementById('dateSelect');
const sortSelect = document.getElementById('sortSelect');
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const newsList = document.getElementById('newsList');
const emptyState = document.getElementById('emptyState');
const newsCardTemplate = document.getElementById('newsCardTemplate');
const loadingSkeleton = document.getElementById('loadingSkeleton');
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-toggle__icon');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const trendingTopics = document.getElementById('trendingTopics');
const trendingTags = document.getElementById('trendingTags');
const newsModal = document.getElementById('newsModal');
const modalContent = document.getElementById('modalContent');
const modalClose = newsModal ? newsModal.querySelector('.modal__close') : null;

// Modal'ın başlangıçta kapalı olduğundan emin ol
if (newsModal) {
  newsModal.hidden = true;
}

let debounceTimer;
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let allItems = [];
let showingFavorites = false;
const FAVORITES_KEY = 'haberokuyoruz-favorites';

// Tema yönetimi
const THEME_KEY = 'haberokuyoruz-theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let currentTheme = localStorage.getItem(THEME_KEY) || (prefersDark.matches ? 'dark' : 'light');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  currentTheme = theme;
}

function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

// Sayfa yüklendiğinde temayı uygula
applyTheme(currentTheme);
themeToggle.addEventListener('click', toggleTheme);

// Sayfa yüklendiğinde body overflow'u normal yap (modal açık kalmışsa)
function ensureModalClosed() {
  document.body.style.overflow = '';
  if (newsModal) {
    newsModal.hidden = true;
    newsModal.style.display = 'none';
    newsModal.style.visibility = 'hidden';
    newsModal.style.pointerEvents = 'none';
    newsModal.style.zIndex = '-1';
  }
}

document.addEventListener('DOMContentLoaded', ensureModalClosed);
window.addEventListener('load', ensureModalClosed);

// Sayfa görünür olduğunda da kontrol et
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    ensureModalClosed();
  }
});

// Service Worker kaydı (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker kaydedildi:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker kaydı başarısız:', error);
      });
  });
}

const formatRelativeTime = (isoString) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} gün önce`;
};

async function fetchNews({ silent = false } = {}) {
  if (!silent) {
    statusText.textContent = 'Haberler yükleniyor...';
    showLoading();
  }

  const params = new URLSearchParams();
  if (searchInput.value.trim()) {
    params.set('q', searchInput.value.trim());
  }
  if (sourceSelect.value) {
    params.set('source', sourceSelect.value);
  }
  if (categorySelect.value) {
    params.set('category', categorySelect.value);
  }
  if (dateSelect.value) {
    params.set('date', dateSelect.value);
  }
  if (sortSelect.value) {
    params.set('sort', sortSelect.value);
  }

  try {
    const response = await fetch(`/api/news?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Sunucu hatası');
    }

    const payload = await response.json();
    allItems = payload.items;
    currentPage = 1;
    updateSources(payload.sources);
    updateCategories(payload.categories || []);
    renderPage();
    updateTrendingTopics(payload.items);

    const updated = new Date(payload.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    statusText.textContent = `${payload.total} haber bulundu · Son güncelleme ${updated}`;
  } catch (error) {
    console.error(error);
    statusText.textContent = 'Haberler alınırken sorun oluştu. Lütfen tekrar deneyin.';
    hideLoading();
    newsList.innerHTML = '';
    emptyState.hidden = false;
    pagination.hidden = true;
  }
}

function showLoading() {
  loadingSkeleton.hidden = false;
  newsList.innerHTML = '';
  pagination.hidden = true;
  emptyState.hidden = true;
}

function hideLoading() {
  loadingSkeleton.hidden = true;
}

function renderPage() {
  hideLoading();
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageItems = allItems.slice(startIndex, endIndex);
  
  renderNews(pageItems);
  updatePagination();
}

function updatePagination() {
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  
  if (totalPages <= 1) {
    pagination.hidden = true;
    return;
  }
  
  pagination.hidden = false;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
}

function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function toggleFavorite(itemId) {
  const favorites = getFavorites();
  const index = favorites.indexOf(itemId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(itemId);
  }
  saveFavorites(favorites);
  return index === -1;
}

function isFavorite(itemId) {
  return getFavorites().includes(itemId);
}

function renderNews(items) {
  newsList.innerHTML = '';
  if (!items.length) {
    emptyState.hidden = false;
    pagination.hidden = true;
    return;
  }

  emptyState.hidden = true;
  const fragment = document.createDocumentFragment();
  const favorites = getFavorites();

  items.forEach((item) => {
    const node = newsCardTemplate.content.cloneNode(true);
    
    // Görsel
    const imageContainer = node.querySelector('.news-card__image-container');
    const imageEl = node.querySelector('.news-card__image');
    if (item.image) {
      imageContainer.hidden = false;
      imageEl.src = item.image;
      imageEl.alt = item.title;
      imageEl.onerror = () => {
        imageContainer.hidden = true;
      };
    } else {
      imageContainer.hidden = true;
    }

    // Kategori badge
    const categoryBadge = node.querySelector('.category-badge');
    if (item.category) {
      categoryBadge.textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);
      categoryBadge.style.backgroundColor = categoryColors[item.category] || categoryColors['gündem'];
      categoryBadge.style.display = 'inline-block';
    } else {
      categoryBadge.style.display = 'none';
    }

    const sources = Array.isArray(item.sources) && item.sources.length > 0 ? item.sources : [item.source];
    const sourceLabel =
      sources.length > 1 ? `${sources[0]} +${sources.length - 1}` : sources.filter(Boolean).join('');
    const sourceEl = node.querySelector('.source');
    sourceEl.textContent = sourceLabel || 'Kaynak bilinmiyor';
    sourceEl.title = sources.join(', ');

    // Zaman ve okuma süresi
    node.querySelector('.time').textContent = formatRelativeTime(item.publishedAt);
    const readingTimeEl = node.querySelector('.reading-time');
    if (item.readingTime) {
      readingTimeEl.textContent = `📖 ${item.readingTime} dk`;
      readingTimeEl.style.display = 'inline';
    } else {
      readingTimeEl.style.display = 'none';
    }
    
    node.querySelector('.title').textContent = item.title;
    const aiSummaryText = (item.aiSummary || '').trim();
    const aiSummaryEl = node.querySelector('.ai-summary');
    const aiSummaryBodyEl = node.querySelector('.ai-summary__text');

    if (aiSummaryText) {
      aiSummaryEl.hidden = false;
      aiSummaryBodyEl.textContent = aiSummaryText;
    } else {
      aiSummaryEl.hidden = true;
      aiSummaryBodyEl.textContent = '';
    }

    const summaryText = (item.preview || item.summary || item.description?.slice(0, 200) || 'Özet bulunamadı.').trim();
    const detailText = (item.description || item.summary || '').trim();

    node.querySelector('.summary').textContent = summaryText;

    const detailsEl = node.querySelector('.details');
    const descriptionEl = node.querySelector('.description');
    if (!detailText || detailText === summaryText) {
      detailsEl.hidden = true;
    } else {
      detailsEl.hidden = false;
      descriptionEl.textContent = detailText;
    }

    const link = node.querySelector('.cta');
    link.href = item.link;

    // Favori butonu
    const favoriteBtn = node.querySelector('.favorite-btn');
    const favoriteIcon = node.querySelector('.favorite-icon');
    const itemId = item.id || item.link;
    const isFav = isFavorite(itemId);
    favoriteIcon.textContent = isFav ? '♥' : '♡';
    favoriteBtn.classList.toggle('active', isFav);
    
    favoriteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = toggleFavorite(itemId);
      favoriteIcon.textContent = added ? '♥' : '♡';
      favoriteBtn.classList.toggle('active', added);
      
      if (showingFavorites && !added) {
        showFavorites();
      }
    });

    // Paylaşım butonları
    const shareButtons = node.querySelectorAll('.share-btn');
    shareButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareNews(item, btn.dataset.platform);
      });
    });

    // Başlığa tıklayınca modal aç
    const titleEl = node.querySelector('.title');
    titleEl.style.cursor = 'pointer';
    titleEl.addEventListener('click', () => {
      openNewsModal(item);
    });

    fragment.appendChild(node);
  });

  newsList.appendChild(fragment);
}

function showFavorites() {
  const favorites = getFavorites();
  if (favorites.length === 0) {
    allItems = [];
    currentPage = 1;
    renderPage();
    statusText.textContent = 'Henüz favori haber yok. Haberlerin yanındaki ♡ ikonuna tıklayarak ekleyebilirsiniz.';
    showingFavorites = true;
    showFavoritesBtn.textContent = '← Tüm Haberler';
    return;
  }

  // Tüm haberlerden favori olanları filtrele
  fetchNews({ silent: true }).then(() => {
    const favoriteItems = allItems.filter(item => {
      const itemId = item.id || item.link;
      return favorites.includes(itemId);
    });
    
    allItems = favoriteItems;
    currentPage = 1;
    renderPage();
    statusText.textContent = `${favoriteItems.length} favori haber bulundu`;
    showingFavorites = true;
    showFavoritesBtn.textContent = '← Tüm Haberler';
  });
}

function showAllNews() {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
}

function updateSources(sources = []) {
  if (!sources.length) return;

  const existing = new Set(Array.from(sourceSelect.options).map((opt) => opt.value));
  sources.forEach((source) => {
    if (existing.has(source)) return;
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    sourceSelect.appendChild(option);
  });
}

function updateCategories(categories = []) {
  if (!categories.length) return;

  const existing = new Set(Array.from(categorySelect.options).map((opt) => opt.value));
  categories.forEach((category) => {
    if (existing.has(category) || !category) return;
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
  });
}

function updateTrendingTopics(items) {
  if (!items.length) {
    trendingTopics.hidden = true;
    return;
  }

  // En çok geçen kelimeleri bul
  const wordCount = {};
  items.slice(0, 50).forEach(item => {
    const words = `${item.title} ${item.summary || ''}`.toLowerCase()
      .match(/[a-zğüşıöçİĞÜŞÖÇ]{4,}/g) || [];
    words.forEach(word => {
      if (word.length >= 4 && !['haber', 'haberi', 'haberler', 'haberlerin'].includes(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  const topWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  if (topWords.length === 0) {
    trendingTopics.hidden = true;
    return;
  }

  trendingTags.innerHTML = '';
  topWords.forEach(word => {
    const tag = document.createElement('button');
    tag.className = 'trending-tag';
    tag.textContent = word;
    tag.addEventListener('click', () => {
      searchInput.value = word;
      fetchNews();
    });
    trendingTags.appendChild(tag);
  });
  trendingTopics.hidden = false;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

nextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchNews(), 450);
});

function shareNews(item, platform) {
  const url = encodeURIComponent(item.link);
  const text = encodeURIComponent(`${item.title} - ${item.source}`);
  
  let shareUrl = '';
  switch(platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${text}%20${url}`;
      break;
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
}

const categoryColors = {
  'gündem': '#e63946',
  'spor': '#2a9d8f',
  'ekonomi': '#f77f00',
  'teknoloji': '#3a86ff',
  'sağlık': '#e76f51',
  'siyaset': '#7209b7',
  'kültür': '#9b59b6',
  'dünya': '#06a77d'
};

function openNewsModal(item) {
  if (!newsModal || !modalContent) return;
  
  const category = item.category || 'gündem';
  const categoryColor = categoryColors[category] || categoryColors['gündem'];
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  
  modalContent.innerHTML = `
    <div class="modal-news">
      ${item.image ? `<img src="${item.image}" alt="${item.title}" class="modal-news__image" />` : ''}
      <div class="modal-news__header">
        <span class="category-badge" style="background-color: ${categoryColor}">${categoryName}</span>
        <span class="source">${item.source}</span>
        <span class="time">${formatRelativeTime(item.publishedAt)}</span>
        ${item.readingTime ? `<span class="reading-time">📖 ${item.readingTime} dk</span>` : ''}
      </div>
      <h1 class="modal-news__title">${item.title}</h1>
      ${item.aiSummary ? `<div class="ai-summary"><span class="ai-summary__label">🤖 AI Özeti</span><p>${item.aiSummary}</p></div>` : ''}
      <div class="modal-news__content">
        <p>${item.description || item.summary || item.preview || ''}</p>
      </div>
      <div class="modal-news__actions">
        <a href="${item.link}" target="_blank" class="cta">Haberi kaynağında aç →</a>
        <div class="share-buttons">
          <button class="share-btn" data-platform="twitter">🐦 Twitter</button>
          <button class="share-btn" data-platform="facebook">📘 Facebook</button>
          <button class="share-btn" data-platform="whatsapp">💬 WhatsApp</button>
        </div>
      </div>
    </div>
  `;
  
  // Paylaşım butonlarına event listener ekle
  modalContent.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      shareNews(item, btn.dataset.platform);
    });
  });
  
  newsModal.hidden = false;
  newsModal.style.display = 'flex';
  newsModal.style.visibility = 'visible';
  document.body.style.overflow = 'hidden';
}

function closeNewsModal() {
  if (!newsModal) return;
  newsModal.hidden = true;
  newsModal.style.display = 'none';
  newsModal.style.visibility = 'hidden';
  document.body.style.overflow = '';
}

// ESC tuşu ile modal'ı kapat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && newsModal && !newsModal.hidden) {
    closeNewsModal();
  }
});

if (modalClose) {
  modalClose.addEventListener('click', closeNewsModal);
}
if (newsModal) {
  const overlay = newsModal.querySelector('.modal__overlay');
  if (overlay) {
    overlay.addEventListener('click', closeNewsModal);
  }
}
window.shareNews = shareNews;

categorySelect.addEventListener('change', () => {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
});
dateSelect.addEventListener('change', () => {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
});
sortSelect.addEventListener('change', () => {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
});
sourceSelect.addEventListener('change', () => {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
});
refreshBtn.addEventListener('click', () => {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  fetchNews();
});
showFavoritesBtn.addEventListener('click', () => {
  if (showingFavorites) {
    showAllNews();
  } else {
    showFavorites();
  }
});

fetchNews();
