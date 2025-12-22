// background.js

const API_BASE = 'http://localhost:5000/api'; // Change to production URL in build

// Store auth token
let authToken = null;

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAuth') {
      // In a real app, you'd sync this better, possibly via cookies or explicit login
      // For now we simulate it or check local storage
      chrome.storage.local.get(['authToken'], (res) => {
          authToken = res.authToken;
          sendResponse({ token: authToken });
      });
      return true;
  }

  if (request.action === 'addTools') {
      // Store tools temporarily and open import page
      chrome.storage.local.set({
        pendingTools: request.tools,
        timestamp: new Date().toISOString(),
      }, () => {
        chrome.tabs.create({
          url: 'http://localhost:5000/?import-tools=true',
          active: true
        });
        sendResponse({ success: true });
      });
      return true;
  }

  if (request.action === 'addToolWithCreds') {
      addTool(request.data, sendResponse);
      return true;
  }

  if (request.action === 'getPinnedTools') {
      fetchPinnedTools(sendResponse);
      return true;
  }

  if (request.action === 'triggerAutofill') {
      handleAutofill(request.toolId, request.url, sendResponse);
      return true;
  }

  if (request.action === 'logUsage') {
      handleUsageLog(request.url, request.duration);
  }
});

// Helper to get auth token (simple version, relies on manual login via popup or shared cookie in future)
// For this demo, let's assume the user has to login via the extension popup manually or we grab it from the main site cookies if possible (cross-origin issues apply).
// To keep it simple: We will try to fetch from localhost cookie if permission allows, or expect it in storage.
chrome.cookies.get({ url: 'http://localhost:5000', name: 'token' }, (cookie) => {
    if (cookie) {
        authToken = cookie.value;
        chrome.storage.local.set({ authToken: authToken });
    }
});


async function addTool(data, sendResponse) {
    if (!authToken) {
        sendResponse({ success: false, error: 'Not logged in' });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/tools`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) sendResponse({ success: true });
        else sendResponse({ success: false });
    } catch (e) {
        sendResponse({ success: false, error: e.message });
    }
}

async function fetchPinnedTools(sendResponse) {
    if (!authToken) {
        sendResponse({ tools: [] });
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/tools`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const pinned = data.tools.filter(t => t.isPinned);
        sendResponse({ tools: pinned });
    } catch (e) {
        sendResponse({ tools: [] });
    }
}

async function handleAutofill(toolId, url, sendResponse) {
     if (!authToken) {
        sendResponse({ success: false });
        return;
    }

    try {
        // Fetch decrypted credentials
        const res = await fetch(`${API_BASE}/tools/${toolId}/reveal`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.credentials) {
            // Find tab to fill
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                const tab = tabs[0];
                if (tab) {
                     chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (user, pass) => {
                            const userInputs = document.querySelectorAll('input[type="email"], input[name*="user"], input[name*="login"]');
                            const passInputs = document.querySelectorAll('input[type="password"]');

                            if (userInputs.length > 0) userInputs[0].value = user;
                            if (passInputs.length > 0) passInputs[0].value = pass;

                            // Try to dispatch input events to trigger React/Angular handlers
                            const event = new Event('input', { bubbles: true });
                            if (userInputs.length > 0) userInputs[0].dispatchEvent(event);
                            if (passInputs.length > 0) passInputs[0].dispatchEvent(event);
                        },
                        args: [data.credentials.username, data.credentials.password]
                    });
                }
            });
            sendResponse({ success: true });
        } else {
             sendResponse({ success: false });
        }
    } catch (e) {
        sendResponse({ success: false });
    }
}

async function handleUsageLog(url, duration) {
    if (!authToken) return;

    // First, identify which tool matches this URL
    try {
        const res = await fetch(`${API_BASE}/tools`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const tool = data.tools.find(t => url.includes(new URL(t.websiteUrl).hostname));

        if (tool) {
            // Send usage update
            // We use the apiKey middleware route but we can also use a standard authenticated route
            // Let's use the one we added: POST /api/tools/usage
            // But that one is behind apiKeyAuthMiddleware which expects an API Key, not a Bearer Token.
            // Wait, I put it under `apiKeyAuthMiddleware` in the previous step.
            // I should have put it under `authMiddleware` or both.
            // Let's assume for now we use the authMiddleware one or I'll update the route to accept Bearer token too.
            // actually the route was added under the block of apiKeyAuthMiddleware in server/routes.ts
            // I should update server/routes.ts to allow authMiddleware for this usage route as well, OR use an API key for the extension.
            // For simplicity, let's fix server/routes.ts to allow `authMiddleware` for usage too.

            // Correction: I will update server/routes.ts in next step to move usage endpoint or add authMiddleware support.

            // For now, let's assume we fix it.
             await fetch(`${API_BASE}/tools/usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    toolId: tool.id,
                    durationSeconds: duration
                })
            });
        }
    } catch (e) {
        console.error(e);
    }
}
