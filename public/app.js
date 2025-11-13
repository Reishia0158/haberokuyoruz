const searchInput = document.getElementById('searchInput');
const sourceSelect = document.getElementById('sourceSelect');
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

  try {
    const response = await fetch(`/api/news?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Sunucu hatası');
    }

    const payload = await response.json();
    allItems = payload.items;
    currentPage = 1;
    updateSources(payload.sources);
    renderPage();

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
    const sources = Array.isArray(item.sources) && item.sources.length > 0 ? item.sources : [item.source];
    const sourceLabel =
      sources.length > 1 ? `${sources[0]} +${sources.length - 1}` : sources.filter(Boolean).join('');
    const sourceEl = node.querySelector('.source');
    sourceEl.textContent = sourceLabel || 'Kaynak bilinmiyor';
    sourceEl.title = sources.join(', ');

    node.querySelector('.time').textContent = formatRelativeTime(item.publishedAt);
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
        // Favorilerden kaldırıldıysa ve favoriler görünüyorsa, listeyi güncelle
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
