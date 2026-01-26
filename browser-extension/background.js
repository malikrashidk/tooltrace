// background.js

let API_BASE = 'https://app.tooltrace.io/api';
const DOMAIN_PRIMARY = 'tooltrace.io'; // Primary domain for cookies
const BATCH_INTERVAL = 60000;
const BATCH_LIMIT = 20;

let authToken = null;

// --- Activity Tracking Logic ---
class ActivityTracker {
    constructor() {
        this.eventBuffer = [];
        this.activeTab = null; // { id, url, startTime, domain }
        this.flushTimer = null;
        this.init();
    }

    init() {
        // Tab Activation (Switching tabs)
        chrome.tabs.onActivated.addListener(activeInfo => this.handleTabSwitch(activeInfo));

        // Tab Updates (Navigation within tab)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.handleTabUpdate(tabId, changeInfo, tab));

        // Window Focus (Switching windows)
        chrome.windows.onFocusChanged.addListener(windowId => this.handleWindowFocus(windowId));

        // Periodic Flush
        this.flushTimer = setInterval(() => this.flushEvents(), BATCH_INTERVAL);
    }

    // Capture the end of the previous session
    stopTracking() {
        if (this.activeTab && this.activeTab.startTime) {
            const duration = (Date.now() - this.activeTab.startTime) / 1000;
            if (duration > 5) { // Only log meaningful visits > 5s
                const event = {
                    domain: this.activeTab.url, // We'll send full URL, server normalizes to domain
                    duration: Math.round(duration),
                    timestamp: Date.now()
                };

                // Include payment signals if detected
                if (this.activeTab.paymentSignals && this.activeTab.paymentSignals.visitedBillingPage) {
                    event.paymentSignals = this.activeTab.paymentSignals;
                }

                this.addEvent(event);
            }
        }
        this.activeTab = null;
    }

    async startTracking(tabId, url) {
        if (!url || !url.startsWith('http')) return;

        // Ignore own domain to prevent feedback loop
        if (url.includes(DOMAIN_PRIMARY)) return;

        // Detect payment signals
        const paymentSignals = this.detectPaymentSignals(url);

        this.activeTab = {
            id: tabId,
            url: url,
            startTime: Date.now(),
            paymentSignals: paymentSignals
        };
    }

    detectPaymentSignals(url) {
        const signals = {
            visitedBillingPage: false,
            billingPageUrl: null
        };

        // Check if URL contains billing/payment related keywords
        const billingKeywords = [
            '/billing', '/subscription', '/payment', '/upgrade',
            '/pricing', '/plans', '/checkout', '/settings/billing',
            '/account/billing', '/manage-subscription'
        ];

        const urlLower = url.toLowerCase();
        const isBillingPage = billingKeywords.some(keyword => urlLower.includes(keyword));

        if (isBillingPage) {
            signals.visitedBillingPage = true;
            signals.billingPageUrl = url;
        }

        return signals;
    }

    handleTabSwitch(activeInfo) {
        this.stopTracking();
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (chrome.runtime.lastError) return; // Tab might be closed
            if (tab && tab.url) {
                this.startTracking(tab.id, tab.url);
            }
        });
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (this.activeTab && this.activeTab.id === tabId && changeInfo.url) {
            this.stopTracking();
            this.startTracking(tabId, changeInfo.url);
        }
    }

    handleWindowFocus(windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            this.stopTracking();
        } else {
            chrome.tabs.query({ active: true, windowId: windowId }, tabs => {
                if (tabs.length > 0) {
                    this.stopTracking();
                    this.startTracking(tabs[0].id, tabs[0].url);
                }
            });
        }
    }

    addEvent(event) {
        // Dedupe or merge logic could go here, but simple append is fine for now
        this.eventBuffer.push(event);
        if (this.eventBuffer.length >= BATCH_LIMIT) {
            this.flushEvents();
        }
    }

    async flushEvents() {
        if (this.eventBuffer.length === 0) return;
        if (!authToken) {
            // Can't send, clear buffer or keep? Keep for a bit maybe?
            // For now, clear to avoid overflow if user never logs in
            if (this.eventBuffer.length > 100) this.eventBuffer = [];
            return;
        }

        const eventsToSend = [...this.eventBuffer];
        this.eventBuffer = [];

        try {
            await apiFetch(`${API_BASE}/activity/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ events: eventsToSend })
            });
            // console.log(`[Activity] Flushed ${eventsToSend.length} events`);
        } catch (e) {
            console.error('[Activity] Failed to flush events', e);
            // Put them back? Na, drop to prevent issues.
        }
    }
}

// Helper to keep token in sync
function syncToken() {
    return new Promise((resolve) => {
        chrome.cookies.get({ url: API_BASE.replace('/api', ''), name: 'token' }, (cookie) => {
            if (cookie) {
                authToken = cookie.value;
                chrome.storage.local.set({ authToken: authToken });
                resolve(authToken);
            } else {
                chrome.storage.local.get(['authToken'], (res) => {
                    authToken = res.authToken || null;
                    resolve(authToken);
                });
            }
        });
    });
}

// Initial sync
syncToken();

// Update API_BASE based on detected environment (local vs production)
chrome.tabs.query({ url: "*://localhost*" }, (tabs) => {
    if (tabs.length > 0) {
        API_BASE = 'http://localhost:5000/api';
        console.log('[Background] Using Local API:', API_BASE);
    }
});

const tracker = new ActivityTracker();

// --- API Wrapper with Auth Failure Handling ---
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        // console.log('[Background] Token expired or invalid (401), logging out extension.');
        authToken = null;
        chrome.storage.local.remove('authToken');
    }
    return res;
}

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cookie.name === 'token' && changeInfo.cookie.domain.includes(DOMAIN_PRIMARY)) {
        if (!changeInfo.removed) {
            authToken = changeInfo.cookie.value;
            chrome.storage.local.set({ authToken: authToken });
        }
    }
});

// Communication with Popup/Content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAuth') {
        syncToken().then(token => sendResponse({ token: token }));
        return true;
    }

    if (request.action === 'addTools') {
        handleAddTools(request.tools, sendResponse);
        return true;
    }

    if (request.action === 'getPinnedTools') {
        handleGetPinnedTools(sendResponse);
        return true;
    }

    // Legacy credentials check - kept for password manager features
    if (request.action === 'checkSavedCredentials') {
        handleCheckSavedCredentials(request.domain, sendResponse);
        return true;
    }

    // Forward credential saving/autofill requests...
    if (request.action === 'autofill') {
        handleAutofill(request.toolId, sendResponse);
        return true;
    }
    if (request.action === 'updateToolCredentials') {
        handleUpdateToolCredentials(request.toolId, request.username, request.password, sendResponse);
        return true;
    }

    return true;
});

// --- Legacy Handlers (Simplified) ---

async function handleGetPinnedTools(sendResponse) {
    if (!authToken) {
        sendResponse({ success: false, error: 'Not logged in' });
        return;
    }
    try {
        const res = await apiFetch(`${API_BASE}/tools`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const pinned = (data.tools || []).filter(t => t.isPinned);
        sendResponse({ success: true, tools: pinned });
    } catch (e) {
        sendResponse({ success: false, error: e.message });
    }
}

async function handleAddTools(tools, sendResponse) {
    if (!authToken) {
        sendResponse({ success: false, error: 'Not logged in' });
        return;
    }
    let successCount = 0;
    for (const tool of tools) {
        try {
            const res = await apiFetch(`${API_BASE}/tools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: tool.name,
                    websiteUrl: tool.url,
                    logoUrl: tool.logoUrl || null,
                    isPaid: false,
                    categories: [tool.category],
                    usageFrequency: 'daily',
                    tags: [],
                    notes: 'Added via Extension'
                })
            });
            if (res.ok) successCount++;
        } catch (e) { }
    }
    sendResponse({ success: successCount > 0 });
}

async function handleCheckSavedCredentials(domain, sendResponse) {
    // If user has saved credentials, this counts as a "Confirmed" signal for Smart Scan
    // We can piggyback on this check to send an immediate "Confirmed" event?
    // Or just let the regular tracker handle the visit, and we add a flag if we found credentials.

    if (!authToken) {
        sendResponse({ tool: null });
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/tools/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ url: domain })
        });
        const data = await res.json();

        // If we found a tool with credentials, we could log a high-confidence event
        if (data.match && data.match.credentials) {
            tracker.addEvent({
                domain: domain,
                hasSavedCredentials: true,
                timestamp: Date.now()
            });
        }

        sendResponse({ tool: data.match || null });
    } catch (e) {
        sendResponse({ tool: null });
    }
}

async function handleUpdateToolCredentials(toolId, username, password, sendResponse) {
    if (!authToken) {
        sendResponse({ success: false });
        return;
    }
    try {
        await apiFetch(`${API_BASE}/tools/${toolId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ username, password })
        });
        sendResponse({ success: true });
    } catch (e) {
        sendResponse({ success: false });
    }
}

async function handleAutofill(toolId, sendResponse) {
    if (!authToken) return;
    try {
        const res = await apiFetch(`${API_BASE}/tools/${toolId}/reveal`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.credentials) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const tab = tabs[0];
                if (tab) {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (user, pass) => {
                            const userSelectors = [
                                'input[type="email"]',
                                'input[type="text"][name*="user" i]',
                                'input[type="text"][name*="login" i]',
                                'input[type="text"][name*="email" i]',
                                'input[id*="username" i]',
                                'input[id*="login" i]',
                                'input[id*="email" i]',
                                'input[autocomplete="username"]',
                                'input[autocomplete="email"]'
                            ];
                            const passSelectors = [
                                'input[type="password"]',
                                'input[name*="pass" i]',
                                'input[id*="password" i]',
                                'input[autocomplete="current-password"]'
                            ];

                            const findElement = (selectors) => {
                                for (const selector of selectors) {
                                    const el = document.querySelector(selector);
                                    if (el) return el;
                                }
                                return null;
                            };

                            const userInput = findElement(userSelectors);
                            const passInput = findElement(passSelectors);

                            if (userInput) {
                                userInput.value = user;
                                userInput.dispatchEvent(new Event('input', { bubbles: true }));
                                userInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            if (passInput) {
                                passInput.value = pass;
                                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                                passInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        },
                        args: [data.credentials.username || data.credentials.email, data.credentials.password]
                    });
                }
            });
            sendResponse({ success: true });
        }
    } catch (e) {
        sendResponse({ success: false });
    }
}
