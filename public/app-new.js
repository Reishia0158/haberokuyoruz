// State
const MODE_CURATED = 'curated';
const MODE_AI = 'ai';

let currentMode = MODE_CURATED;
let currentArticles = [];
let currentTopic = '';

// DOM refs
let searchInput,
  searchBtn,
  topNewsBtn,
  topicChips,
  statusText,
  statusActions,
  refreshBtn,
  clearBtn,
  loadingState,
  newsGrid,
  emptyState,
  newsCardTemplate,
  themeToggle,
  articleModal,
  modalClose,
  modalTitle,
  modalMeta,
  modalBody;

const FAVORITES_KEY = 'ai-haber-favorites';
const THEME_KEY = 'ai-haber-theme';

// Theme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let currentTheme = localStorage.getItem(THEME_KEY) || (prefersDark.matches ? 'dark' : 'light');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  currentTheme = theme;
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  if (!initDOMElements()) return;
  applyTheme(currentTheme);
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  setupEventListeners();
  loadCuratedNews();
}

function initDOMElements() {
  searchInput = document.getElementById('searchInput');
  searchBtn = document.getElementById('searchBtn');
  topNewsBtn = document.getElementById('topNewsBtn');
  topicChips = document.querySelectorAll('.topic-chip');
  statusText = document.getElementById('statusText');
  statusActions = document.getElementById('statusActions');
  refreshBtn = document.getElementById('refreshBtn');
  clearBtn = document.getElementById('clearBtn');
  loadingState = document.getElementById('loadingState');
  newsGrid = document.getElementById('newsGrid');
  emptyState = document.getElementById('emptyState');
  newsCardTemplate = document.getElementById('newsCardTemplate');
  themeToggle = document.getElementById('themeToggle');
  articleModal = document.getElementById('articleModal');
  modalClose = document.getElementById('modalClose');
  modalTitle = document.getElementById('modalTitle');
  modalMeta = document.getElementById('modalMeta');
  modalBody = document.getElementById('modalBody');

  if (!searchInput || !searchBtn || !newsGrid || !newsCardTemplate) {
    console.error('Kritik DOM elementleri bulunamadÄ±.');
    return false;
  }
  return true;
}

function setupEventListeners() {
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = (searchInput?.value || '').trim();
      if (query) searchNews(query);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) searchNews(query);
      }
    });
  }

  if (topicChips && topicChips.length) {
    topicChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const topic = chip.dataset.topic;
        if (searchInput) searchInput.value = topic;
        searchNews(topic);
      });
    });
  }

  if (topNewsBtn) {
    topNewsBtn.addEventListener('click', () => loadCuratedNews());
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (currentMode === MODE_AI && currentTopic) {
        searchNews(currentTopic);
      } else {
        loadCuratedNews();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentTopic = '';
      currentArticles = [];
      currentMode = MODE_CURATED;
      if (searchInput) searchInput.value = '';
      if (newsGrid) newsGrid.innerHTML = '';
      setStatus('Ã–nemli haber akÄ±ÅŸÄ±nÄ± veya AI aramayÄ± kullanÄ±n');
      if (statusActions) statusActions.hidden = false;
      loadCuratedNews();
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeArticleModal);
  }

  if (articleModal) {
    const overlay = articleModal.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeArticleModal);
  }
}

// Curated important news (importance-first)
async function loadCuratedNews() {
  currentMode = MODE_CURATED;
  currentTopic = '';
  showLoading('Ã–nemli haberler getiriliyor...');
  hideEmptyState();
  if (newsGrid) newsGrid.innerHTML = '';

  try {
    // importanceMin=0: ai Ã¶nem puanÄ± gelmese bile haberleri gÃ¶ster
    const res = await fetch('/api/news?sort=importance&importanceMin=0&limit=60');
    if (!res.ok) {
      throw new Error(`Sunucu hatasÄ±: ${res.status}`);
    }
    const data = await res.json();
    currentArticles = data.items || [];

    if (!currentArticles.length) {
      showEmptyState('Ã–nemli haber bulunamadÄ±.');
      setStatus('Ã–nemli haber bulunamadÄ±');
    } else {
      renderArticles(currentArticles);
      setStatus(`AI Ã¶nem puanÄ±na gÃ¶re ${currentArticles.length} haber listeleniyor`);
      if (statusActions) statusActions.hidden = false;
    }
  } catch (error) {
    console.error('Ã–nemli haberler getirilemedi:', error);
    setStatus(error.message || 'Ã–nemli haberler getirilemedi');
    showEmptyState(error.message || 'Bir hata oluÅŸtu. Yeniden deneyin.');
  } finally {
    hideLoading();
  }
}

// AI search/news generation
async function searchNews(topic) {
  if (!topic || topic.trim().length < 3) {
    alert('LÃ¼tfen en az 3 karakter girin');
    return;
  }

  if (!newsGrid || !statusText) {
    console.error('DOM elementleri hazÄ±r deÄŸil!');
    return;
  }

  currentMode = MODE_AI;
  currentTopic = topic.trim();
  showLoading('AI araÅŸtÄ±rma yapÄ±yor...');
  hideEmptyState();
  newsGrid.innerHTML = '';

  try {
    const response = await fetch('/api/ai-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentTopic })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Sunucu hatasÄ±: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    currentArticles = data.articles || [];

    if (!currentArticles.length) {
      showEmptyState('Bu konu iÃ§in haber bulunamadÄ±. FarklÄ± bir konu deneyin.');
      setStatus('Bu konu iÃ§in sonuÃ§ bulunamadÄ±');
    } else {
      renderArticles(currentArticles);
      setStatus(`"${currentTopic}" iÃ§in ${currentArticles.length} haber bulundu`);
      if (statusActions) statusActions.hidden = false;
    }
  } catch (error) {
    console.error('Arama hatasÄ±:', error);
    setStatus(`Hata: ${error.message || 'Arama yapÄ±lamadÄ±'}`);
    showEmptyState(error.message || 'Bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.');
  } finally {
    hideLoading();
  }
}

// Render
function renderArticles(articles) {
  if (!newsGrid || !newsCardTemplate) {
    console.error('Render iÃ§in gerekli elementler bulunamadÄ±!');
    return;
  }

  newsGrid.innerHTML = '';

  articles.forEach((article) => {
    const card = newsCardTemplate.content.cloneNode(true);

    // Category
    const categoryBadge = card.querySelector('.category-badge');
    if (article.category) {
      const categoryText = article.category.charAt(0).toLocaleUpperCase('tr-TR') + article.category.slice(1);
      categoryBadge.textContent = categoryText;
      categoryBadge.setAttribute('data-category', article.category);
    } else {
      categoryBadge.style.display = 'none';
    }

    // Source & time
    const sourceEl = card.querySelector('.news-source');
    sourceEl.textContent = article.source || 'AI AraÅŸtÄ±rma';

    const timeEl = card.querySelector('.news-time');
    timeEl.textContent = article.publishedAt ? formatRelativeTime(article.publishedAt) : '';

    // Importance
    const importanceEl = card.querySelector('.importance-score');
    const importanceValue = article.importance ?? article.aiAnalysis?.importance;
    importanceEl.textContent = typeof importanceValue === 'number' ? importanceValue : 'â€“';

    // Title
    const titleEl = card.querySelector('.news-title');
    titleEl.textContent = article.title || 'BaÅŸlÄ±ksÄ±z Haber';

    // Summary
    const summaryEl = card.querySelector('.news-summary');
    const summaryText = article.aiSummary || article.summary || article.preview || article.description || '';
    summaryEl.textContent = summaryText;

    // Content (uzun icerik varsa modal icin)
    const contentEl = card.querySelector('.news-content');
    const hasLongContent = Boolean(article.content && article.content.trim().length > 80);
    const fullContent = article.content || article.description || article.summary || summaryText || 'Icerik bulunamadi.';
    contentEl.textContent = fullContent;

    // Tags
    const tagsEl = card.querySelector('.news-tags');
    if (article.tags && article.tags.length > 0) {
      article.tags.forEach((tag) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagsEl.appendChild(tagEl);
      });
    } else {
      tagsEl.style.display = 'none';
    }

    // Read more / Kaynaga git
    const readMoreBtn = card.querySelector('.btn-read-more');
    if (hasLongContent) {
      readMoreBtn.textContent = 'Devamini Oku';
      readMoreBtn.addEventListener('click', () => showArticleModal(article));
    } else {
      readMoreBtn.textContent = 'Kaynaga Git';
      readMoreBtn.addEventListener('click', () => {
        if (article.link) {
          window.open(article.link, '_blank', 'noopener');
        } else {
          showArticleModal(article);
        }
      });
    }

    // Favorites
    const articleId = article.id || article.link || article.title || Math.random().toString(36).slice(2);
    const favoriteBtn = card.querySelector('.btn-favorite');
    const isFavorite = isArticleFavorite(articleId);
    if (isFavorite) favoriteBtn.classList.add('active');
    favoriteBtn.addEventListener('click', () => toggleFavorite(articleId, favoriteBtn));

    newsGrid.appendChild(card);
  });
}

function showArticleModal(article) {
  if (!modalTitle || !modalMeta || !modalBody || !articleModal) return;

  modalTitle.textContent = article.title || 'Haber';

  modalMeta.innerHTML = '';
  const metaItems = [
    article.category ? `Kategori: ${article.category}` : '',
    article.source ? `Kaynak: ${article.source}` : '',
    article.publishedAt ? formatRelativeTime(article.publishedAt) : '',
    typeof article.importance === 'number' ? `Ã–nem: ${article.importance}/10` : ''
  ].filter(Boolean);

  metaItems.forEach((item) => {
    const span = document.createElement('span');
    span.textContent = item;
    modalMeta.appendChild(span);
  });

  modalBody.textContent = article.content || article.description || article.summary || "Icerik bulunamadi.";

  articleModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeArticleModal() {
  if (!articleModal) return;
  articleModal.hidden = true;
  document.body.style.overflow = '';
}

// Favorites
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function isArticleFavorite(articleId) {
  const favorites = getFavorites();
  return favorites.includes(articleId);
}

function toggleFavorite(articleId, button) {
  const favorites = getFavorites();
  const index = favorites.indexOf(articleId);
  if (index > -1) {
    favorites.splice(index, 1);
    button.classList.remove('active');
  } else {
    favorites.push(articleId);
    button.classList.add('active');
  }
  saveFavorites(favorites);
}

// Utils
function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'az Ã¶nce';
  if (diffMinutes < 60) return `${diffMinutes} dk Ã¶nce`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat Ã¶nce`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gÃ¼n Ã¶nce`;

  return new Date(isoString).toLocaleDateString('tr-TR');
}

function showLoading(message = 'YÃ¼kleniyor...') {
  if (loadingState) loadingState.hidden = false;
  setStatus(message);
}

function hideLoading() {
  if (loadingState) loadingState.hidden = true;
}

function showEmptyState(message = 'Bir konu araÅŸtÄ±rÄ±n veya hÄ±zlÄ± konulardan birini seÃ§in') {
  if (!emptyState) return;
  emptyState.hidden = false;
  const p = emptyState.querySelector('p');
  if (p && message) p.textContent = message;
}

function hideEmptyState() {
  if (emptyState) emptyState.hidden = true;
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker kayÄ±tlÄ±:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker kaydÄ± baÅŸarÄ±sÄ±z:', error);
      });
  });
}






