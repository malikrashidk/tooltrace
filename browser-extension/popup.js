const KNOWN_SAAS_TOOLS = {
  'figma.com': { name: 'Figma', category: 'Design', icon: 'Ž¨' },
  'github.com': { name: 'GitHub', category: 'Development', icon: '’»' },
  'chat.openai.com': { name: 'ChatGPT', category: 'AI', icon: '¤–' },
  'aws.amazon.com': { name: 'AWS', category: 'Cloud', icon: '…˜ï¸' },
  'notion.so': { name: 'Notion', category: 'Productivity', icon: '“' },
  'slack.com': { name: 'Slack', category: 'Communication', icon: '’¬' },
  'zoom.us': { name: 'Zoom', category: 'Communication', icon: '“¹' },
  'monday.com': { name: 'Monday.com', category: 'Productivity', icon: '“Š' },
  'asana.com': { name: 'Asana', category: 'Productivity', icon: '…œ“' },
  'trello.com': { name: 'Trello', category: 'Productivity', icon: '“‹' },
  'jira.atlassian.net': { name: 'Jira', category: 'Development', icon: 'ž' },
  'canva.com': { name: 'Canva', category: 'Design', icon: 'Ž¨' },
  'stripe.com': { name: 'Stripe', category: 'Finance', icon: '’³' },
  'mailchimp.com': { name: 'Mailchimp', category: 'Marketing', icon: '“§' },
  'hubspot.com': { name: 'HubSpot', category: 'Marketing', icon: 'Ž¯' },
  'vercel.com': { name: 'Vercel', category: 'Development', icon: '…š¡' },
  'netlify.com': { name: 'Netlify', category: 'Cloud', icon: 'Œ' },
  'dopely.com': { name: 'Dopely', category: 'Design', icon: 'Ž¨' },
};

let detectedTools = [];
let selectedTools = new Set();

async function detectTools() {
  chrome.tabs.query({}, (tabs) => {
    detectedTools = [];
    const visitedDomains = new Set();

    tabs.forEach(tab => {
      if (!tab.url) return;

      try {
        const url = new URL(tab.url);
        const domain = url.hostname;

        if (visitedDomains.has(domain)) return;
        visitedDomains.add(domain);

        // Check for exact matches
        let toolInfo = KNOWN_SAAS_TOOLS[domain];

        // Check for partial matches
        if (!toolInfo) {
          for (const [knownDomain, info] of Object.entries(KNOWN_SAAS_TOOLS)) {
            if (domain.includes(knownDomain.split('.')[0])) {
              toolInfo = info;
              break;
            }
          }
        }

        if (toolInfo) {
          detectedTools.push({
            id: domain,
            name: toolInfo.name,
            domain: domain,
            url: `https://${domain}`,
            category: toolInfo.category,
            icon: toolInfo.icon,
            detected: true,
          });
        }
      } catch (e) {
        console.error('Error parsing URL:', tab.url);
      }
    });

    renderTools();
  });
}

async function checkSavedCredentials() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;
    try {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;

      chrome.runtime.sendMessage({ action: 'checkSavedCredentials', domain }, response => {
        const matchView = document.getElementById('matchView');
        if (response && response.tool) {
          matchView.classList.remove('hidden');
          document.getElementById('matchName').innerText = `âœ… ${response.tool.name}`;
          document.getElementById('autofillBtn').onclick = () => {
            chrome.runtime.sendMessage({ action: 'autofill', toolId: response.tool.id }, res => {
              if (res.success) {
                showStatus('âœ… Credentials filled!', 'success');
              }
            });
          };
        } else {
          matchView.classList.add('hidden');
        }
      });
    } catch (e) { }
  });
}

function renderTools() {
  const toolsList = document.getElementById('toolsList');
  const emptyState = document.getElementById('emptyState');
  const addBtn = document.getElementById('addBtn');

  if (detectedTools.length === 0) {
    toolsList.innerHTML = '';
    emptyState.style.display = 'block';
    addBtn.disabled = true;
    return;
  }

  emptyState.style.display = 'none';
  toolsList.innerHTML = detectedTools
    .map(tool => `
      <div class="tool-item">
        <input 
          type="checkbox" 
          id="tool-${tool.id}" 
          onchange="toggleTool('${tool.id}')"
        >
        <div class="tool-info">
          <div class="tool-name">${tool.icon} ${tool.name}</div>
          <div class="tool-url">${tool.domain}</div>
        </div>
      </div>
    `)
    .join('');

  addBtn.disabled = selectedTools.size === 0;
}

function toggleTool(toolId) {
  if (selectedTools.has(toolId)) {
    selectedTools.delete(toolId);
  } else {
    selectedTools.add(toolId);
  }

  document.getElementById('addBtn').disabled = selectedTools.size === 0;
}

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;

  if (type !== 'loading') {
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 3000);
  }
}

async function addSelectedTools() {
  if (selectedTools.size === 0) return;

  showStatus('<span class="spinner"></span>Adding to Tool Trace...', 'loading');

  const toolsToAdd = detectedTools.filter(t => selectedTools.has(t.id));

  try {
    chrome.runtime.sendMessage({
      action: 'addTools',
      tools: toolsToAdd
    }, response => {
      if (response && response.success) {
        showStatus(`âœ… Added ${response.count} tool(s) successfully!`, 'success');
        selectedTools.clear();
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('addBtn').disabled = true;
      } else {
        showStatus('Failed to add tools. ' + (response.error || ''), 'error');
      }
    });
  } catch (error) {
    showStatus('Error adding tools. ' + error.message, 'error');
  }
}

function refreshTools() {
  showStatus('<span class="spinner"></span>Scanning...', 'loading');
  selectedTools.clear();
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  setTimeout(() => {
    detectTools();
    checkSavedCredentials();
  }, 500);
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  detectTools();
  checkSavedCredentials();

  document.getElementById('addBtn').onclick = addSelectedTools;

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      document.getElementById('detectView').classList.add('hidden');
      document.getElementById('pinnedView').classList.add('hidden');
      document.getElementById('addView').classList.add('hidden');

      document.getElementById(target + 'View').classList.remove('hidden');
    };
  });
});

