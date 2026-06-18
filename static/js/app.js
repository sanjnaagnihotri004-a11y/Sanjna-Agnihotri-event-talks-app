// Application State
let releases = [];
let selectedIds = new Set();
let currentFilter = 'All';
let searchQuery = '';
let activeTweetText = '';
let activeHashtags = new Set();

// Constants
const CHAR_LIMIT = 280;
const PRESET_HASHTAGS = ['#BigQuery', '#GoogleCloud', '#GCP', '#DataEngineering', '#Serverless', '#DataAnalytics'];

// DOM Elements
const feedGrid = document.getElementById('feed-grid');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const filterContainer = document.getElementById('category-filters');
const floatingBar = document.getElementById('floating-bar');
const floatingInfo = document.getElementById('floating-info');
const clearSelectionBtn = document.getElementById('clear-selection');
const btnFloatingTweet = document.getElementById('btn-floating-tweet');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statLastUpdated = document.getElementById('stat-last-updated');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalClose = document.getElementById('modal-close');
const tweetTextArea = document.getElementById('tweet-textarea');
const btnCopy = document.getElementById('btn-copy');
const btnPostX = document.getElementById('btn-post-x');
const tagsList = document.getElementById('tags-list');

// Character Counter Ring Elements
const counterRing = document.getElementById('counter-ring');
const counterRingFill = document.getElementById('counter-ring-fill');
const counterText = document.getElementById('counter-text');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    setupEventListeners();
    renderTags();
});

// Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderFeed();
    });
    
    clearSelectionBtn.addEventListener('click', clearSelection);
    btnFloatingTweet.addEventListener('click', () => {
        const selected = releases.filter(r => selectedIds.has(r.id));
        if (selected.length > 0) {
            openTweetModal('digest', selected);
        }
    });
    
    // Modal Close
    modalClose.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Text Area Input
    tweetTextArea.addEventListener('input', (e) => {
        activeTweetText = e.target.value;
        updateCharCounter();
    });
    
    // Actions
    btnCopy.addEventListener('click', copyToClipboard);
    btnPostX.addEventListener('click', postToX);
}

// Fetch Releases from API
async function fetchReleases(force = false) {
    showLoading();
    try {
        const url = `/api/releases${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        releases = data.releases || [];
        
        updateStats(data);
        clearSelection();
        renderFeed();
        renderFilterPills();
    } catch (error) {
        console.error('Error fetching releases:', error);
        renderError(error.message);
    } finally {
        hideLoading();
    }
}

// Show Loading State
function showLoading() {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    feedGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-pulse"></div>
            <div class="state-title">Fetching Release Notes</div>
            <div class="state-desc">Connecting to Google Cloud BigQuery feed and parsing release details...</div>
        </div>
    `;
}

// Hide Loading State
function hideLoading() {
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
}

// Render Error State
function renderError(message) {
    feedGrid.innerHTML = `
        <div class="error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="state-title" style="color: #ef4444;">Failed to Load Feed</div>
            <div class="state-desc">${message || 'An error occurred while fetching the release notes. Please try again.'}</div>
            <button class="btn-refresh" style="margin-top: 1.5rem;" onclick="fetchReleases(true)">Retry Connection</button>
        </div>
    `;
}

// Update Stats
function updateStats(data) {
    statTotal.textContent = releases.length;
    
    const featuresCount = releases.filter(r => r.category.toLowerCase() === 'feature').length;
    statFeatures.textContent = featuresCount;
    
    if (data.last_fetched) {
        const date = new Date(data.last_fetched * 1000);
        statLastUpdated.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        statLastUpdated.textContent = '--:--';
    }
}

// Dynamic Filter Pills Generation
function renderFilterPills() {
    // Get unique categories from releases
    const categories = ['All', ...new Set(releases.map(r => r.category))];
    
    filterContainer.innerHTML = '';
    categories.forEach(cat => {
        const pill = document.createElement('button');
        pill.className = `filter-pill ${currentFilter === cat ? 'active' : ''}`;
        
        let icon = '';
        if (cat === 'All') icon = '📁';
        else if (cat.toLowerCase() === 'feature') icon = '🚀';
        else if (cat.toLowerCase() === 'announcement') icon = '📢';
        else if (cat.toLowerCase() === 'deprecation') icon = '⚠️';
        else if (cat.toLowerCase() === 'change') icon = '🔄';
        else icon = '📄';
        
        pill.innerHTML = `<span>${icon}</span> ${cat}`;
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = cat;
            renderFeed();
        });
        filterContainer.appendChild(pill);
    });
}

// Filter and Render Feed
function renderFeed() {
    // Apply filters
    const filtered = releases.filter(r => {
        const matchesCategory = currentFilter === 'All' || r.category === currentFilter;
        const matchesSearch = r.content_text.toLowerCase().includes(searchQuery) || 
                              r.category.toLowerCase().includes(searchQuery) ||
                              r.date.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
        feedGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <div class="state-title">No Release Notes Found</div>
                <div class="state-desc">Try resetting your category filters or typing a different term in the search box.</div>
            </div>
        `;
        return;
    }
    
    feedGrid.innerHTML = '';
    filtered.forEach(item => {
        const card = document.createElement('div');
        const isSelected = selectedIds.has(item.id);
        card.className = `release-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = item.id;
        
        // Category clean class name
        const catClass = item.category.toLowerCase().replace(/\s+/g, '-');
        
        card.innerHTML = `
            <div class="card-select-overlay">
                <div class="custom-checkbox" onclick="event.stopPropagation(); toggleCardSelection('${item.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
            <div class="card-header">
                <div class="card-metadata">
                    <span class="card-date">${item.date}</span>
                    <span class="card-badge ${catClass}">${item.category}</span>
                </div>
            </div>
            <div class="card-body">
                ${item.content_html}
            </div>
            <div class="card-actions">
                <a href="${item.link}" target="_blank" class="card-link" onclick="event.stopPropagation()">
                    Permalink 
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                </a>
                <button class="btn-card-tweet" onclick="event.stopPropagation(); initSingleTweet('${item.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
        `;
        
        // Card selection on card click (excluding links and buttons)
        card.addEventListener('click', () => {
            toggleCardSelection(item.id);
        });
        
        feedGrid.appendChild(card);
    });
}

// Card Selection Logic
function toggleCardSelection(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    
    // Find card and toggle class
    const card = document.querySelector(`.release-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
    
    updateFloatingBar();
}

function clearSelection() {
    selectedIds.clear();
    document.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
    updateFloatingBar();
}

function updateFloatingBar() {
    if (selectedIds.size > 0) {
        floatingInfo.textContent = `${selectedIds.size} update${selectedIds.size > 1 ? 's' : ''} selected`;
        floatingBar.classList.add('active');
    } else {
        floatingBar.classList.remove('active');
    }
}

// Single Tweet Composition Initiator
function initSingleTweet(id) {
    const item = releases.find(r => r.id === id);
    if (item) {
        openTweetModal('single', item);
    }
}

// Hashtags rendering inside Modal
function renderTags() {
    tagsList.innerHTML = '';
    PRESET_HASHTAGS.forEach(tag => {
        const tagBtn = document.createElement('button');
        tagBtn.className = `tag-btn ${activeHashtags.has(tag) ? 'active' : ''}`;
        tagBtn.textContent = tag;
        tagBtn.addEventListener('click', () => toggleHashtag(tag));
        tagsList.appendChild(tagBtn);
    });
}

function toggleHashtag(tag) {
    if (activeHashtags.has(tag)) {
        activeHashtags.delete(tag);
        // Remove from text
        activeTweetText = activeTweetText.replace(new RegExp(`\\s*${tag}`, 'g'), '').trim();
    } else {
        activeHashtags.add(tag);
        // Add to text
        activeTweetText = `${activeTweetText.trim()} ${tag}`;
    }
    
    tweetTextArea.value = activeTweetText;
    updateCharCounter();
    renderTags();
}

// Generate templates
function generateSingleTweetText(rel) {
    // Shorten content text to fit safely inside 280 limit with url (counts as 23 chars)
    const baseText = `🚀 BigQuery Release [${rel.category}] (${rel.date}):`;
    const url = rel.link;
    const placeholderUrlLen = 23;
    const reservedLen = baseText.length + placeholderUrlLen + 10; // extra spaces and padding
    
    let maxContentLen = CHAR_LIMIT - reservedLen;
    let snippet = rel.content_text;
    
    if (snippet.length > maxContentLen) {
        snippet = snippet.substring(0, maxContentLen - 3) + '...';
    }
    
    return `${baseText}\n\n"${snippet}"\n\nDetails: ${url}`;
}

function generateDigestTweetText(selectedReleases) {
    let text = `📦 BigQuery Update Digest (${new Date().toLocaleDateString()}):\n\n`;
    
    selectedReleases.forEach((rel) => {
        let snippet = rel.content_text;
        if (snippet.length > 55) {
            snippet = snippet.substring(0, 52) + '...';
        }
        text += `• [${rel.category}] ${snippet}\n`;
    });
    
    const latestLink = selectedReleases[0].link;
    text += `\nRead more: ${latestLink}`;
    return text;
}

// Open compose modal
function openTweetModal(type, data) {
    activeHashtags.clear();
    
    if (type === 'single') {
        activeTweetText = generateSingleTweetText(data);
    } else if (type === 'digest') {
        activeTweetText = generateDigestTweetText(data);
    }
    
    tweetTextArea.value = activeTweetText;
    tweetModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent scrolling behind modal
    
    // Auto focus and place cursor at end
    tweetTextArea.focus();
    tweetTextArea.selectionStart = tweetTextArea.selectionEnd = tweetTextArea.value.length;
    
    updateCharCounter();
    renderTags();
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Calculate Twitter-compliant Character Length
// URLs in Twitter/X intents count as exactly 23 characters because of t.co wrapping
function calculateTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let lengthWithoutUrls = text;
    urls.forEach(url => {
        lengthWithoutUrls = lengthWithoutUrls.replace(url, '');
    });
    
    // Add 23 characters for each URL found
    return lengthWithoutUrls.length + (urls.length * 23);
}

// Update Character UI (circular ring + number text)
function updateCharCounter() {
    const textLength = calculateTweetLength(activeTweetText);
    const charsRemaining = CHAR_LIMIT - textLength;
    
    counterText.textContent = charsRemaining;
    
    // Color states
    counterRing.className = 'counter-ring';
    counterText.className = 'counter-text';
    if (charsRemaining <= 20 && charsRemaining >= 0) {
        counterRing.classList.add('warn');
    } else if (charsRemaining < 0) {
        counterRing.classList.add('error');
        counterText.classList.add('error');
        btnPostX.disabled = true;
    } else {
        btnPostX.disabled = false;
    }
    
    if (textLength === 0) {
        btnPostX.disabled = true;
    }
    
    // Calculate circular ring fill dashoffset
    // Perimeter is 2 * PI * r = 2 * 3.14159 * 12 = 75.39
    const maxPerimeter = 75;
    const percentage = Math.min(textLength / CHAR_LIMIT, 1);
    const offset = maxPerimeter - (percentage * maxPerimeter);
    counterRingFill.style.strokeDashoffset = offset;
}

// Copy to Clipboard with Feedback
function copyToClipboard() {
    navigator.clipboard.writeText(activeTweetText).then(() => {
        const originalText = btnCopy.textContent;
        btnCopy.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.25rem;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        btnCopy.style.borderColor = 'var(--color-change)';
        btnCopy.style.color = 'var(--color-change)';
        
        setTimeout(() => {
            btnCopy.textContent = originalText;
            btnCopy.style.borderColor = '';
            btnCopy.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Share to X Web Intent API
function postToX() {
    const textLength = calculateTweetLength(activeTweetText);
    if (textLength > CHAR_LIMIT) {
        alert('Tweet exceeds the 280-character limit!');
        return;
    }
    
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(activeTweetText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}
