# Tool Trace Browser Extension

Auto-detect and add SaaS tools to your Tool Trace dashboard while browsing!

## Features

✨ **Auto-Detection**: Automatically detects SaaS tools you're using
🔍 **Quick Add**: Select and add multiple tools with one click
📊 **Supported Tools**: Figma, GitHub, ChatGPT, AWS, Notion, Slack, Zoom, and more
🔒 **Privacy First**: Works entirely on your browser without tracking

## Installation

### Chrome / Edge / Brave / Other Chromium Browsers

1. Download or clone this repository
2. Open `chrome://extensions` in your browser
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `browser-extension` folder
6. The extension will appear in your browser toolbar!

### Manual Setup

If the above doesn't work:
1. Click the extension icon in your toolbar
2. Verify it shows "Connected to Tool Trace"
3. Visit any SaaS tool website
4. The extension will detect it automatically

## How to Use

1. **Browse Normally**: Visit your favorite SaaS tools
2. **Click Extension Icon**: Open the popup from your toolbar
3. **Select Tools**: Check the tools you want to add
4. **Click "Add Selected"**: Tools are added to your Tool Trace dashboard

## Supported Tools

### Design
- Figma
- Canva

### Development
- GitHub
- Jira
- Vercel

### Cloud & Infrastructure
- AWS
- Netlify

### AI & Automation
- ChatGPT

### Productivity & Management
- Notion
- Slack
- Zoom
- Monday.com
- Asana
- Trello

### Marketing & Finance
- Stripe
- Mailchimp
- HubSpot

## Adding New Tools

Edit `popup.js` and add your tool to the `KNOWN_SAAS_TOOLS` object:

```javascript
KNOWN_SAAS_TOOLS = {
  'your-domain.com': { 
    name: 'Tool Name', 
    category: 'Category', 
    icon: '🔧' 
  },
  // ... more tools
}
```

## Privacy & Security

- ✅ No data is sent to third parties
- ✅ Credentials are never stored in the extension
- ✅ Uses browser's native storage API
- ✅ Works offline (detects from current tabs only)

## Troubleshooting

### Extension not detecting tools?
- Make sure the tool domain is in the `KNOWN_SAAS_TOOLS` list
- Try refreshing the extension by toggling it off/on
- Check that you're on the correct domain (e.g., github.com, not github.io)

### "Cannot connect to Tool Trace" error?
- Ensure Tool Trace app is running (typically at `http://localhost:5000`)
- Check browser console for error messages
- Try refreshing both the extension and the app

## Contributing

To add support for more tools:
1. Fork this repository
2. Add your tool to `KNOWN_SAAS_TOOLS`
3. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or feature requests, please visit: [GitHub Issues](https://github.com/yourusername/saazhub-extension/issues)
