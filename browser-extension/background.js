/**
 * Background Service Worker for SaaS Hub Browser Extension
 * Handles communication between extension and main app
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addTools') {
    // Store tools temporarily
    chrome.storage.local.set({
      pendingTools: request.tools,
      timestamp: new Date().toISOString(),
    }, () => {
      // Open SaaS Hub app to import tools
      chrome.tabs.create({
        url: 'https://saazhub.localhost:5000/?import-tools=true', // Or your deployed URL
        active: true
      });

      sendResponse({ success: true });
    });

    return true; // Keep the message channel open
  }
});

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://saazhub.localhost:5000/browser-extension-setup',
      active: true
    });
  }
});
