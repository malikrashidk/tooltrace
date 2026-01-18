# Tooltrace – SaaS Account & Subscription Tracker

Auto-detect SaaS tools, synchronize authentication, and instantly fill credentials across the web.

## Features

- ⚡️ **Direct Add**: Select and add multiple tools with one click. No redirects or platform switching required.
- ⚡️ **Credential Autofill**: Detects if you have a saved tool matching the current site and offers a "Fill Login" button to instantly populate credentials.
- 🔑 **Auth Synchronization**: Stays seamlessly in sync with your Tooltrace account. Log in once on the web app, and the extension is ready to go.
- 🔍 **Auto-Detection**: Scans open tabs for known SaaS tools like Figma, GitHub, ChatGPT, and Notion.
- 🛡️ **Privacy & Security**: Securely reveals credentials only when requested and never stores passwords locally in plain text.

## Installation

### Chrome / Edge / Brave / Other Chromium Browsers

1.  **Download/Clone**: Get the repository files.
2.  **Open Extensions**: Go to `chrome://extensions` in your browser.
3.  **Developer Mode**: Toggle the **"Developer mode"** switch (top-right).
4.  **Load Unpacked**: Click **"Load unpacked"** and select the `browser-extension` folder.
5.  **Pin it**: For quick access, pin the Tool Trace extension to your toolbar!

## How to Use

### 1. Synchronize (One-Time)
Simply log in to your Tooltrace dashboard at `http://localhost:5000`. The extension will automatically detect your session and show "Connected".

### 2. Auto-Detect / Add Tools
- Browse as usual. When you visit a supported SaaS site, open the extension.
- Select the detected tools you wish to track.
- Click **"Add Selected Tools"**. They are instantly added to your dashboard in the background.

### 3. Credential Autofill
- Visit a login page (e.g., `github.com/login`).
- If you have saved credentials for that site in Tooltrace, a **"✅ Tool Found"** banner will appear in the popup.
- Click **"⚡️ Fill Login"** to instantly inject your username and password.

---

## Supported Tools

### Design & Marketing
- Figma, Canva, Stripe, Mailchimp, HubSpot

### Development & DevOps
- GitHub, Jira, Vercel, AWS, Netlify

### Productivity & AI
- Notion, Slack, Zoom, ChatGPT, Trello, Asana

## Customization

To add support for more tools, add your tool to the `KNOWN_SAAS_TOOLS` object in `popup.js`:

```javascript
KNOWN_SAAS_TOOLS = {
  'your-domain.com': { 
    name: 'Tool Name', 
    category: 'Category', 
    icon: '⚡️' 
  },
}
```

## Troubleshooting

### "Not Logged In" or "Checking..."
- Ensure you have a tab open with your Tool Trace app running at `http://localhost:5000`.
- Refresh the dashboard to ensure the session cookie is active.

### Autofill button not appearing?
- Verify that the `Website URL` in your Tool Trace dashboard exactly matches the domain of the site you are visiting.

## License
MIT License - Tooltrace Team

## Release Process
To create a new release package:
1. Update version in `manifest.json`.
2. Tag a new version: `git tag v1.0.x`.
3. Push tags: `git push origin --tags`.
The GitHub Action will automatically create a ZIP file in the Releases section.

## Support
For issues or feature requests, please visit the main [Tooltrace Hub](https://app.tooltrace.io).
