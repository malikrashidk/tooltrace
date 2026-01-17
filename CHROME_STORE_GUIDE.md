# Chrome Web Store Submission Guide: Tooltrace

Follow these steps to get your extension live today.

## 1. Prepare the ZIP Bundle
The Chrome Web Store accepts a single `.zip` file.
- **Option A (Manual)**: Right-click the `browser-extension` folder and "Compress to ZIP".
- **Option B (GitHub)**: Go to your new `tooltrace-extension` repository, tag a version (e.g., `v1.0.1`), and the GitHub Action will create the professional ZIP for you automatically.

## 2. Chrome Developer Account
1. Visit the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
2. Pay the one-time **$5 USD** developer registration fee if you haven't already.

## 3. Mandatory Assets
Google requires several graphics to make your extension searchable:
- **Icon**: You already have the 128x128 icon which is perfect.
- **Screenshots**: You need at least **one (1280x800 or 640x400)**.
  - *Tip*: Take a screenshot of the Tooltrace popup while on a site like GitHub so the "Tool Found" banner shows.
- **Promotional Tile (Small)**: 440x280 image (Mandatory).
- **Description**: 
  > Tooltrace is your smarter SaaS companion. Automatically track your software usage, manage credentials securely, and discover tools you're paying for but forgot about. Syncs instantly with your Tooltrace Hub.

## 4. Privacy & Permissions (Important)
Google will ask you to justify your permissions. Use these explanations:
- **`scripting` & `tabs`**: Used to offer the "Magic Fill" feature which helps users securely inject saved credentials into login forms.
- **`cookies`**: Used to synchronize the authentication session with the Tooltrace web dashboard so users don't have to log in twice.
- **`webNavigation`**: Used for the Smart Scan to detect when you visit a SaaS tool like Slack or Notion.

## 5. Privacy Policy
You **MUST** provide a Privacy Policy URL. 
- You can host a simple one at `app.tooltrace.io/privacy`.
- It should state that you collect domain activity only to provide usage tracking features and that credentials are encrypted.

---

### Ready to Upload?
Once you have the ZIP and the Assets, click **"+ New Item"** in the console and upload the ZIP!
