# SaaS Hub Browser Extension Setup Guide

## What is the SaaS Hub Browser Extension?

The SaaS Hub Browser Extension helps you automatically detect and add SaaS tools to your account as you browse. No manual searching needed!

## Installation Steps

### For Chrome, Edge, Brave, or other Chromium browsers:

1. **Open Extensions Page**
   - Go to `chrome://extensions` in your address bar
   - Or use the menu: ☰ → More tools → Extensions

2. **Enable Developer Mode**
   - Look for the toggle in the **top-right corner**
   - Click it to enable Developer mode
   - New buttons will appear

3. **Load the Extension**
   - Click the **"Load unpacked"** button
   - Navigate to the `browser-extension` folder in this project
   - Select it and click "Open"

4. **Verify Installation**
   - The extension should appear in your extensions list
   - You'll see the SaaS Hub icon in your toolbar
   - Pin it for easy access (click the pin icon)

## Using the Extension

### Basic Workflow

1. **Browse Your SaaS Tools**: Visit any of your favorite SaaS applications (Figma, GitHub, Notion, etc.)

2. **Open the Extension**: Click the SaaS Hub icon in your browser toolbar

3. **Review Detected Tools**: The extension shows all detected SaaS tools from your open tabs

4. **Select Tools**: Check the boxes next to tools you want to add

5. **Add to SaaS Hub**: Click the "Add Selected" button

6. **Sync Complete**: Selected tools are instantly added to your SaaS Hub!

## Supported SaaS Tools

The extension can detect these popular tools:

- **Design**: Figma, Canva
- **Development**: GitHub, Jira, Vercel, Netlify
- **Cloud**: AWS
- **AI**: ChatGPT Plus
- **Productivity**: Notion, Slack, Zoom, Monday.com, Asana, Trello
- **Marketing**: Mailchimp, HubSpot
- **Finance**: Stripe

More tools are being added regularly!

## Features

✅ **Automatic Detection**: Scans all open tabs for known SaaS tools
✅ **One-Click Addition**: Add multiple tools at once
✅ **Privacy-Focused**: No data collection or tracking
✅ **Offline-First**: Works without internet connection
✅ **No Logins Needed**: Doesn't require tool credentials

## Troubleshooting

### The extension won't load
- Ensure you're in Developer mode (see step 2 above)
- Make sure you selected the correct `browser-extension` folder
- Try clicking "Refresh" on the extension card

### No tools are being detected
- Open multiple tabs of different SaaS tools
- Click "Refresh" in the extension popup
- Check that the domains are in the supported list
- Make sure you're on the actual tool site (not a blog or help page)

### "Failed to add tools" message
- Ensure SaaS Hub app is running locally
- Check your browser console for error messages
- Try refreshing both the extension and the app

### Want to add a new tool?
Edit the `browser-extension/popup.js` file and add the tool to the `KNOWN_SAAS_TOOLS` object!

## Advanced Usage

### Customizing Supported Tools

Open `browser-extension/popup.js` and find the `KNOWN_SAAS_TOOLS` object. Add your tool:

```javascript
'your-tool-domain.com': { 
  name: 'Your Tool Name', 
  category: 'Your Category', 
  icon: '🛠️' 
}
```

### Disable/Enable the Extension

- **Temporarily disable**: Toggle the switch on the extension's detail page
- **Remove**: Click "Remove" button

## Privacy & Security

✅ Your data stays on your computer
✅ No credentials are stored in the extension
✅ No tracking or analytics
✅ Open source - review the code anytime

## Next Steps

1. Install the extension (follow steps above)
2. Open 5-10 of your commonly-used SaaS tools in tabs
3. Click the extension icon
4. Select the tools you want to add
5. Click "Add Selected"
6. Check your SaaS Hub dashboard to see your tools!

## Need Help?

- Check the extension popup status message
- View browser console logs (F12 → Console)
- Refer to `browser-extension/README.md` for technical details
- Visit Integrations Hub in the app for setup instructions

Happy organizing! 🚀
