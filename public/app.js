const searchInput = document.getElementById('searchInput');
const sourceSelect = document.getElementById('sourceSelect');
const categorySelect = document.getElementById('categorySelect');
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
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const karamanBtn = document.getElementById('karamanBtn'); // Opsiyonel - HTML'de yoksa null olabilir

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
  themeToggle.textContent = theme === 'dark' ? '☀' : '☾';
  currentTheme = theme;
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

applyTheme(currentTheme);
themeToggle.addEventListener('click', toggleTheme);

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
    statusText.textContent = 'Yükleniyor...';
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

  try {
    const response = await fetch(`/api/news?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Sunucu hatası: ${response.status}`);
    }

    const payload = await response.json();
    
    // API'den error dönerse
    if (payload.error) {
      throw new Error(payload.error);
    }
    
    allItems = payload.items || [];
    currentPage = 1;
    updateSources(payload.sources || []);
    updateCategories(payload.categories || []);
    renderPage();

    if (payload.updatedAt) {
      const updated = new Date(payload.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      statusText.textContent = `${payload.total || 0} haber · ${updated}`;
    } else {
      statusText.textContent = `${payload.total || 0} haber`;
    }
  } catch (error) {
    console.error('Haber yükleme hatası:', error);
    statusText.textContent = `Hata: ${error.message || 'Bağlantı hatası. Lütfen tekrar deneyin.'}`;
    hideLoading();
    newsList.innerHTML = '';
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = error.message || 'Haberlere ulaşılamadı. Lütfen daha sonra tekrar deneyin.';
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

  const categoryColors = {
    'gündem': '#e63946',
    'spor': '#2a9d8f',
    'ekonomi': '#f77f00',
    'teknoloji': '#3a86ff',
    'sağlık': '#e76f51',
    'siyaset': '#7209b7',
    'kültür': '#9b59b6',
    'dünya': '#06a77d',
    'karaman': '#8b4513'
  };

  items.forEach((item) => {
    const node = newsCardTemplate.content.cloneNode(true);
    
    // Kategori badge
    const categoryBadge = node.querySelector('.category-badge');
    if (item.category) {
      // Türkçe karakterleri düzgün işlemek için toLocaleUpperCase kullan
      const categoryText = item.category.charAt(0).toLocaleUpperCase('tr-TR') + item.category.slice(1);
      categoryBadge.textContent = categoryText;
      categoryBadge.style.backgroundColor = categoryColors[item.category] || categoryColors['gündem'];
    } else {
      categoryBadge.style.display = 'none';
    }

    const sourceEl = node.querySelector('.source');
    sourceEl.textContent = item.source || 'Kaynak bilinmiyor';

    node.querySelector('.time').textContent = formatRelativeTime(item.publishedAt);
    node.querySelector('.title').textContent = item.title;
    
    const aiSummaryText = (item.aiSummary || '').trim();
    const aiSummaryEl = node.querySelector('.ai-summary');
    if (aiSummaryText) {
      aiSummaryEl.hidden = false;
      aiSummaryEl.querySelector('.ai-summary__text').textContent = aiSummaryText;
    } else {
      aiSummaryEl.hidden = true;
    }

    const summaryText = (item.preview || item.summary || item.description?.slice(0, 150) || '').trim();
    node.querySelector('.summary').textContent = summaryText;

    const link = node.querySelector('.cta');
    link.href = item.link;

    // Favori butonu
    const favoriteBtn = node.querySelector('.favorite-btn');
    const itemId = item.id || item.link;
    const isFav = isFavorite(itemId);
    favoriteBtn.textContent = isFav ? '♥' : '♡';
    favoriteBtn.classList.toggle('active', isFav);
    
    favoriteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = toggleFavorite(itemId);
      favoriteBtn.textContent = added ? '♥' : '♡';
      favoriteBtn.classList.toggle('active', added);
      if (showingFavorites && !added) {
        showFavorites();
      }
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
    statusText.textContent = 'Favori haber yok';
    showingFavorites = true;
    showFavoritesBtn.textContent = '← Tüm Haberler';
    showFavoritesBtn.innerHTML = '← Tüm Haberler';
    return;
  }

  fetchNews({ silent: true }).then(() => {
    const favoriteItems = allItems.filter(item => {
      const itemId = item.id || item.link;
      return favorites.includes(itemId);
    });
    
    allItems = favoriteItems;
    currentPage = 1;
    renderPage();
    statusText.textContent = `${favoriteItems.length} favori`;
    showingFavorites = true;
    showFavoritesBtn.textContent = '← Tüm Haberler';
    showFavoritesBtn.innerHTML = '← Tüm Haberler';
  });
}

function showAllNews() {
  showingFavorites = false;
  showFavoritesBtn.textContent = '⭐ Favoriler';
  showFavoritesBtn.innerHTML = '⭐ Favoriler';
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


prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo(0, 0);
  }
});

nextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
    window.scrollTo(0, 0);
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchNews(), 300);
});

categorySelect.addEventListener('change', () => {
  showingFavorites = false;
  showingKaraman = categorySelect.value === 'karaman';
  showFavoritesBtn.textContent = '⭐ Favoriler';
  if (karamanBtn) {
    karamanBtn.textContent = showingKaraman ? '← Tüm Haberler' : '🏛️ Karaman Haber';
  }
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

let showingKaraman = false;
if (karamanBtn) {
  karamanBtn.addEventListener('click', () => {
    if (showingKaraman) {
      showingKaraman = false;
      karamanBtn.textContent = '🏛️ Karaman Haber';
      categorySelect.value = '';
      fetchNews();
    } else {
      showingKaraman = true;
      karamanBtn.textContent = '← Tüm Haberler';
      categorySelect.value = 'karaman';
      showingFavorites = false;
      showFavoritesBtn.textContent = '⭐ Favoriler';
      fetchNews();
    }
  });
}

fetchNews();
