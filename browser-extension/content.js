// Time tracking variables
let activeTabId = null;
let activeTabStartTime = null;
let activeTabUrl = null;

// Helper to check if url is relevant (not chrome://, not empty)
function isValidUrl(url) {
    return url && !url.startsWith('chrome://') && !url.startsWith('about:');
}

// Function to stop tracking previous tab and save data
function stopTracking() {
    if (activeTabId && activeTabStartTime && activeTabUrl) {
        const duration = (Date.now() - activeTabStartTime) / 1000; // seconds
        if (duration > 5) { // Only log if > 5 seconds
            console.log(`Tracked ${duration}s on ${activeTabUrl}`);
            // Send to background script to sync with server
            chrome.runtime.sendMessage({
                action: 'logUsage',
                url: activeTabUrl,
                duration: duration
            });
        }
    }
    activeTabId = null;
    activeTabStartTime = null;
    activeTabUrl = null;
}

// Listen for tab activation (switching tabs)
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

// Listen for url updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.url) {
        stopTracking(); // URL changed in active tab

        if (isValidUrl(changeInfo.url)) {
            activeTabId = tabId;
            activeTabUrl = changeInfo.url;
            activeTabStartTime = Date.now();
        }
    }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(windowId => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        stopTracking(); // lost focus
    } else {
        chrome.tabs.query({active: true, windowId: windowId}, tabs => {
            if (tabs.length > 0 && isValidUrl(tabs[0].url)) {
                stopTracking(); // just in case
                activeTabId = tabs[0].id;
                activeTabUrl = tabs[0].url;
                activeTabStartTime = Date.now();
            }
        });
    }
});
