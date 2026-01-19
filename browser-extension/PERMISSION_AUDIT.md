# Chrome Extension Permission Audit: Tooltrace

This report outlines the recommended permissions for the Tooltrace Chrome Extension (Manifest V3) to ensure compliance with Chrome Web Store policies and minimize review scrutiny.

## 1. Feature-to-Permission Mapping

| Feature | Implemented? | Core Requirement? | Strictly Required Permission(s) |
| :--- | :---: | :---: | :--- |
| **SaaS Detection (Background)** | Yes | High | `tabs`, `host_permissions: ["<all_urls>"]` |
| **SaaS Detection (Manual)** | Yes | High | `tabs` |
| **Script Injection (Autofill)** | Yes | Med | `scripting`, `activeTab` |
| **Password Saving** | Yes | Med | *None* (sent via background API calls) |
| **Cookie/Auth Sync** | Yes | High | `cookies`, `host_permissions: ["*://*.tooltrace.io/*"]` |
| **Backend Communication** | Yes | High | `host_permissions: ["*://*.tooltrace.io/*"]` |
| **Context Menus** | No | No | *None* (Remove `contextMenus`) |
| **Local State (Caching)** | Yes | Med | `storage` |
| **Tab Tracking** | Yes | High | `tabs` |

## 2. Redundancy & Risk Reduction

### 🚩 Critical Findings
1.  **Empty Content Script**: Currently, `content.js` is injected into `<all_urls>` but does nothing. This is a major red flag for reviewers. **Recommendation: Remove it entirely.**
2.  **Unused Permissions**: `contextMenus` and `webNavigation` are in the manifest but never called in the code. **Recommendation: Remove.**
3.  **Broad Host Permissions**: `<all_urls>` is currently used for content scripts. **Recommendation: Limit `<all_urls>` to `host_permissions` only (background tracking) and use `activeTab` for on-page interactions.**

## 3. Cookie & Password Storage Audit

*   **Cookies**: The extension only reads the `token` cookie from `tooltrace.io` to sync authentication. This is first-party access and justified. 
*   **Passwords**: Passwords are never stored in the extension. They are transmitted securely to the backend. The `storage` permission is only used for caching the session token, which is safe.

## 4. Recommended Manifest (v3)

```json
{
  "manifest_version": 3,
  "name": "Tooltrace – SaaS Account & Subscription Tracker",
  "version": "1.0.2",
  "description": "Automatically track your SaaS usage, manage credentials, and discover tools you're paying for.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "cookies",
    "tabs"
  ],
  "host_permissions": [
    "https://*.tooltrace.io/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon128.png"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## 5. Justification for Unavoidable Permissions

*   **`tabs` + `<all_urls>`**: Strictly necessary for the **Smart Tracker** feature, which must detect the domain of visited sites to identify subscriptions.
*   **`cookies`**: Necessary to provide a seamless "one-click" login experience by syncing with the Tooltrace web application session.
*   **`scripting` + `activeTab`**: Required to perform autofill on user-selected pages. `activeTab` is preferred over broad content scripts as it only grants access when the user interacts with the extension.
*   **`storage`**: Used to cache the authentication token for performance and background tracking stability.

## 🚩 Proposed Removals
*   **Remove `contextMenus`**: Not used in current features.
*   **Remove `webNavigation`**: The extension uses `tabs.onUpdated` which is sufficient for simple tracking.
*   **Remove `content_scripts` block**: Injecting code into every page globally is high-risk. Using `scripting.executeScript` via `activeTab` is the modern, compliant way to handle autofill.
