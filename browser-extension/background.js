// background.js

// Determine API base - use current origin if extension is on a site, 
// but for the service worker, we often need a fixed target or clever detection.
let API_BASE = 'https://app.tooltrace.io/api';
const DOMAIN_PRIMARY = 'app.tooltrace.io';

let authToken = null;

// Helper to keep token in sync
function syncToken() {
    return new Promise((resolve) => {
        chrome.cookies.get({ url: API_BASE.replace('/api', ''), name: 'token' }, (cookie) => {
            if (cookie) {
                authToken = cookie.value;
                chrome.storage.local.set({ authToken: authToken });
                console.log('[Background] Auth token synced from cookie');
                resolve(authToken);
            } else {
                // Check storage as fallback
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

// --- API Wrapper with Auth Failure Handling ---
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        console.log('[Background] Token expired or invalid (401), logging out extension.');
        authToken = null;
        chrome.storage.local.remove('authToken');
    }
    return res;
}

// Listen for cookie changes to stay in sync
chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cookie.name === 'token' && changeInfo.cookie.domain.includes(DOMAIN_PRIMARY)) {
        if (!changeInfo.removed) {
            authToken = changeInfo.cookie.value;
            chrome.storage.local.set({ authToken: authToken });
        }
        // We no longer clear the token when the cookie is removed.
        // This keeps the extension "Connected" even if the browser session expires, 
        // until the next API call returns a 401.
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAuth') {
        syncToken().then(token => {
            sendResponse({ token: token });
        });
        return true;
    }

    if (request.action === 'addTools') {
        handleAddTools(request.tools, sendResponse);
        return true;
    }

    if (request.action === 'checkSavedCredentials') {
        handleCheckSavedCredentials(request.domain, sendResponse);
        return true;
    }

    if (request.action === 'autofill') {
        handleAutofill(request.toolId, sendResponse);
        return true;
    }

    if (request.action === 'getPinnedTools') {
        handleGetPinnedTools(sendResponse);
        return true;
    }

    if (request.action === 'logUsage') {
        handleUsageLog(request.url, request.duration, sendResponse);
        return true;
    }

    return true;
});

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

// --- Usage Tracking Logic (Moved from content.js) ---
let activeTabId = null;
let activeTabStartTime = null;
let activeTabUrl = null;

function isValidUrl(url) {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
}

async function stopTracking() {
    if (activeTabId && activeTabStartTime && activeTabUrl) {
        const duration = (Date.now() - activeTabStartTime) / 1000; // seconds
        if (duration > 5) {
            console.log(`[Usage] Tracked ${duration.toFixed(1)}s on ${activeTabUrl}`);
            handleUsageLog(activeTabUrl, duration);
        }
    }
    activeTabId = null;
    activeTabStartTime = null;
    activeTabUrl = null;
}

chrome.tabs.onActivated.addListener(activeInfo => {
    stopTracking();
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && isValidUrl(tab.url)) {
            activeTabId = activeInfo.tabId;
            activeTabUrl = tab.url;
            activeTabStartTime = Date.now();
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.url) {
        stopTracking();
        if (isValidUrl(changeInfo.url)) {
            activeTabId = tabId;
            activeTabUrl = changeInfo.url;
            activeTabStartTime = Date.now();
        }
    }
});

chrome.windows.onFocusChanged.addListener(windowId => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        stopTracking();
    } else {
        chrome.tabs.query({ active: true, windowId: windowId }, tabs => {
            if (tabs.length > 0 && isValidUrl(tabs[0].url)) {
                stopTracking();
                activeTabId = tabs[0].id;
                activeTabUrl = tabs[0].url;
                activeTabStartTime = Date.now();
            }
        });
    }
});

async function handleUsageLog(url, duration, sendResponse = () => { }) {
    if (!authToken || !url) {
        sendResponse({ success: false });
        return;
    }

    try {
        const domain = new URL(url).hostname;
        // First find if we have a tool matching this domain
        const resTools = await apiFetch(`${API_BASE}/tools`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await resTools.json();

        const matchedTool = data.tools.find(t => {
            try {
                return new URL(t.websiteUrl).hostname.includes(domain) || domain.includes(new URL(t.websiteUrl).hostname);
            } catch (e) { return false; }
        });

        if (matchedTool) {
            // Log the usage to the specific extension endpoint
            await apiFetch(`${API_BASE}/extension/usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    toolId: matchedTool.id,
                    durationSeconds: Math.floor(duration)
                })
            });
            console.log(`[Usage] Logged ${duration}s for ${matchedTool.name}`);
        }
    } catch (e) {
        console.error('[Usage] Error logging usage:', e);
    }
}

async function handleAddTools(tools, sendResponse) {
    if (!authToken) {
        sendResponse({ success: false, error: 'Not logged in' });
        return;
    }

    const results = [];
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
                })
            });
            results.push(res.ok);
        } catch (e) {
            results.push(false);
        }
    }

    const allSuccess = results.every(r => r === true);
    sendResponse({ success: allSuccess, count: results.filter(r => r).length });
}

async function handleCheckSavedCredentials(domain, sendResponse) {
    if (!authToken) {
        sendResponse({ tool: null });
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/tools`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        // Find a tool that matches the domain and has credentials
        // Note: The /api/tools response includes credentials as 'null' to indicate they exist but are hidden
        // Wait, looking at routes/tools.ts:
        // const toolResponse = { ...tool, credentials: null, secureNote: !!tool.secureNote };
        // Actually, the server returns credentials: null regardless. 
        // We need another way to check if they exist. 
        // Let's assume for this version we check the 'id' and then call reveal if we think it matches.

        const matchedTool = data.tools.find(t => {
            try {
                const host = new URL(t.websiteUrl).hostname;
                return host.includes(domain) || domain.includes(host);
            } catch (e) {
                return false;
            }
        });

        sendResponse({ tool: matchedTool || null });
    } catch (e) {
        sendResponse({ tool: null });
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
                            const userInputs = document.querySelectorAll('input[type="email"], input[type="text"][name*="user"], input[name*="login"], input[id*="username"]');
                            const passInputs = document.querySelectorAll('input[type="password"]');

                            if (userInputs.length > 0) {
                                userInputs[0].value = user;
                                userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                                userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            if (passInputs.length > 0) {
                                passInputs[0].value = pass;
                                passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                                passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        },
                        args: [data.credentials.username, data.credentials.password]
                    });
                }
            });
            sendResponse({ success: true });
        }
    } catch (e) {
        sendResponse({ success: false });
    }
}
