const searchInput = document.getElementById('searchInput');
const sourceSelect = document.getElementById('sourceSelect');
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const newsList = document.getElementById('newsList');
const emptyState = document.getElementById('emptyState');
const newsCardTemplate = document.getElementById('newsCardTemplate');

let debounceTimer;

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
    renderNews(payload.items);
    updateSources(payload.sources);

    const updated = new Date(payload.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    statusText.textContent = `${payload.total} haber bulundu · Son güncelleme ${updated}`;
  } catch (error) {
    console.error(error);
    statusText.textContent = 'Haberler alınırken sorun oluştu. Lütfen tekrar deneyin.';
    newsList.innerHTML = '';
    emptyState.hidden = false;
  }
}

function renderNews(items) {
  newsList.innerHTML = '';
  if (!items.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  const fragment = document.createDocumentFragment();

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
    fragment.appendChild(node);
  });

  newsList.appendChild(fragment);
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

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchNews(), 450);
});

sourceSelect.addEventListener('change', () => fetchNews());
refreshBtn.addEventListener('click', () => fetchNews());

fetchNews();
