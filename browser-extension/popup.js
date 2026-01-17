const KNOWN_SAAS_TOOLS = {
  // Design & Creative
  'figma.com': { name: 'Figma', category: 'Design', icon: '🎨' },
  'canva.com': { name: 'Canva', category: 'Design', icon: '🎨' },
  'adobe.com': { name: 'Adobe Creative Cloud', category: 'Design', icon: '🎨' },
  'dribbble.com': { name: 'Dribbble', category: 'Design', icon: '🏀' },
  'sketch.com': { name: 'Sketch', category: 'Design', icon: '💎' },
  'framer.com': { name: 'Framer', category: 'Design', icon: '📐' },

  // Development & DevOps
  'github.com': { name: 'GitHub', category: 'Development', icon: '💻' },
  'gitlab.com': { name: 'GitLab', category: 'Development', icon: '🦊' },
  'bitbucket.org': { name: 'Bitbucket', category: 'Development', icon: '📥' },
  'stackoverflow.com': { name: 'Stack Overflow', category: 'Development', icon: '📚' },
  'vercel.com': { name: 'Vercel', category: 'Development', icon: '🚀' },
  'netlify.com': { name: 'Netlify', category: 'Development', icon: '🌐' },
  'digitalocean.com': { name: 'DigitalOcean', category: 'Infrastructure', icon: '💧' },
  'heroku.com': { name: 'Heroku', category: 'Infrastructure', icon: '🟣' },
  'aws.amazon.com': { name: 'AWS', category: 'Infrastructure', icon: '☁️' },
  'console.cloud.google.com': { name: 'Google Cloud', category: 'Infrastructure', icon: '☁️' },
  'azure.microsoft.com': { name: 'Azure', category: 'Infrastructure', icon: '☁️' },
  'docker.com': { name: 'Docker', category: 'Development', icon: '🐳' },
  'jira.atlassian.net': { name: 'Jira', category: 'Development', icon: '🎫' },

  // Productivity & Collaboration
  'notion.so': { name: 'Notion', category: 'Productivity', icon: '📝' },
  'slack.com': { name: 'Slack', category: 'Communication', icon: '💬' },
  'zoom.us': { name: 'Zoom', category: 'Communication', icon: '📹' },
  'monday.com': { name: 'Monday.com', category: 'Productivity', icon: '📅' },
  'asana.com': { name: 'Asana', category: 'Productivity', icon: '✅' },
  'trello.com': { name: 'Trello', category: 'Productivity', icon: '📋' },
  'clickup.com': { name: 'ClickUp', category: 'Productivity', icon: '🆙' },
  'linear.app': { name: 'Linear', category: 'Productivity', icon: '📉' },
  'miro.com': { name: 'Miro', category: 'Productivity', icon: '🖼️' },
  'loom.com': { name: 'Loom', category: 'Communication', icon: '📹' },
  'calendly.com': { name: 'Calendly', category: 'Productivity', icon: '📅' },

  // AI & Machine Learning
  'chat.openai.com': { name: 'ChatGPT', category: 'AI', icon: '🤖' },
  'anthropic.com': { name: 'Claude', category: 'AI', icon: '🧠' },
  'midjourney.com': { name: 'Midjourney', category: 'AI', icon: '🎨' },
  'perplexitiy.ai': { name: 'Perplexity', category: 'AI', icon: '🔍' },

  // Marketing & Sales
  'hubspot.com': { name: 'HubSpot', category: 'Marketing', icon: '📈' },
  'mailchimp.com': { name: 'Mailchimp', category: 'Marketing', icon: '📧' },
  'salesforce.com': { name: 'Salesforce', category: 'Sales', icon: '☁️' },
  'intercom.com': { name: 'Intercom', category: 'Marketing', icon: '💬' },
  'buffer.com': { name: 'Buffer', category: 'Marketing', icon: '📝' },
  'hootsuite.com': { name: 'Hootsuite', category: 'Marketing', icon: '🦉' },

  // Finance & Operations
  'stripe.com': { name: 'Stripe', category: 'Finance', icon: '💳' },
  'paypal.com': { name: 'PayPal', category: 'Finance', icon: '💳' },
  'quickbooks.com': { name: 'QuickBooks', category: 'Finance', icon: '💼' },
  'xero.com': { name: 'Xero', category: 'Finance', icon: '💼' },
  'gusto.com': { name: 'Gusto', category: 'HR', icon: '👥' },
  'bamboohr.com': { name: 'BambooHR', category: 'HR', icon: '🎋' },
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
        const autofillBtn = document.getElementById('autofillBtn');
        const addCredsBtn = document.getElementById('addCredsBtn');
        const matchDesc = document.getElementById('matchDesc');
        const quickCredForm = document.getElementById('quickCredForm');

        if (response && response.tool) {
          matchView.classList.remove('hidden');
          document.getElementById('matchName').innerText = `✔ ${response.tool.name}`;

          if (response.tool.hasCredentials) {
            matchDesc.innerText = 'Saved credentials ready to use';
            autofillBtn.classList.remove('hidden');
            addCredsBtn.classList.add('hidden');
            quickCredForm.classList.add('hidden');

            const newBtn = autofillBtn.cloneNode(true);
            autofillBtn.parentNode.replaceChild(newBtn, autofillBtn);
            newBtn.addEventListener('click', () => {
              chrome.runtime.sendMessage({ action: 'autofill', toolId: response.tool.id }, res => {
                if (res.success) showStatus('✔ Credentials filled!', 'success');
              });
            });
          } else {
            matchDesc.innerText = 'No credentials saved for this tool';
            autofillBtn.classList.add('hidden');
            addCredsBtn.classList.remove('hidden');

            const newAddBtn = addCredsBtn.cloneNode(true);
            addCredsBtn.parentNode.replaceChild(newAddBtn, addCredsBtn);
            newAddBtn.addEventListener('click', () => {
              quickCredForm.classList.toggle('hidden');
            });

            const saveBtn = document.getElementById('saveQuickCredBtn');
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            newSaveBtn.addEventListener('click', () => {
              const user = document.getElementById('quickUser').value;
              const pass = document.getElementById('quickPass').value;
              if (!user || !pass) {
                showStatus('Please enter both username and password', 'error');
                return;
              }
              showStatus('Saving...', 'loading');
              chrome.runtime.sendMessage({
                action: 'updateToolCredentials',
                toolId: response.tool.id,
                username: user,
                password: pass
              }, res => {
                if (res.success) {
                  showStatus('Credentials saved!', 'success');
                  quickCredForm.classList.add('hidden');
                  checkSavedCredentials(); // Refresh UI
                } else {
                  showStatus('Failed to save: ' + res.error, 'error');
                }
              });
            });
          }
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
    emptyState.classList.remove('hidden');
    addBtn.disabled = true;
    return;
  }

  emptyState.classList.add('hidden');
  toolsList.innerHTML = detectedTools
    .map(tool => `
      <div class="tool-card">
        <div class="tool-checkbox-container">
          <input 
            type="checkbox" 
            class="tool-checkbox"
            data-id="${tool.id}"
            ${selectedTools.has(tool.id) ? 'checked' : ''}
          >
        </div>
        <div class="tool-icon">${tool.icon || '🛠️'}</div>
        <div class="tool-info">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-domain">${tool.domain}</div>
        </div>
      </div>
    `)
    .join('');

  // Attach event listeners to checkboxes
  toolsList.querySelectorAll('.tool-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const toolId = e.target.getAttribute('data-id');
      toggleTool(toolId);
    });
  });

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
  const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ';
  statusDiv.innerHTML = `
    <div class="status-msg status-${type}">
      ${type === 'loading' ? '<span class="spinner spinner-dark"></span>' : `<span>${icon}</span>`}
      ${message}
    </div>
  `;

  if (type !== 'loading') {
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 4000);
  }
}

async function addSelectedTools() {
  if (selectedTools.size === 0) return;

  showStatus('Adding to Tooltrace...', 'loading');

  const toolsToAdd = detectedTools.filter(t => selectedTools.has(t.id));

  try {
    chrome.runtime.sendMessage({
      action: 'addTools',
      tools: toolsToAdd
    }, response => {
      if (response && response.success) {
        showStatus(`Added ${response.count} tool(s) successfully!`, 'success');
        selectedTools.clear();
        document.querySelectorAll('.tool-checkbox').forEach(cb => cb.checked = false);
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
  showStatus('Scanning for tools...', 'loading');
  selectedTools.clear();
  document.querySelectorAll('.tool-checkbox').forEach(cb => cb.checked = false);
  setTimeout(() => {
    detectTools();
    checkSavedCredentials();
  }, 500);
}

async function updateAuthStatus() {
  chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
    const statusDiv = document.getElementById('authStatus');
    if (response && response.token) {
      statusDiv.innerHTML = '<div class="status-dot" style="background: #10b981"></div> Connected';
    } else {
      statusDiv.innerHTML = '<div class="status-dot" style="background: #ef4444"></div> Disconnected';
    }
  });
}

async function fetchPinnedTools() {
  chrome.runtime.sendMessage({ action: 'getPinnedTools' }, response => {
    if (response && response.success) {
      renderPinnedTools(response.tools);
    }
  });
}

function renderPinnedTools(tools) {
  const pinnedList = document.getElementById('pinnedList');
  const pinnedEmpty = document.getElementById('pinnedEmpty');

  if (!tools || tools.length === 0) {
    pinnedList.innerHTML = '';
    pinnedEmpty.classList.remove('hidden');
    return;
  }

  pinnedEmpty.classList.add('hidden');
  pinnedList.innerHTML = tools
    .map(tool => {
      let hostname = 'Unknown';
      try { hostname = new URL(tool.websiteUrl).hostname; } catch (e) { }
      const icon = KNOWN_SAAS_TOOLS[hostname]?.icon || tool.iconUrl || '🛠️';
      return `
      <div class="tool-card" style="cursor: pointer;">
        <div class="tool-icon">${icon}</div>
        <div class="tool-info">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-domain">${hostname}</div>
        </div>
      </div>
    `})
    .join('');

  pinnedList.querySelectorAll('.tool-card').forEach((card, index) => {
    card.addEventListener('click', () => {
      if (tools[index].websiteUrl) {
        window.open(tools[index].websiteUrl, '_blank');
      }
    });
  });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  detectTools();
  checkSavedCredentials();
  updateAuthStatus();
  fetchPinnedTools();

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

      if (target === 'pinned') {
        fetchPinnedTools();
      }

      // Hide/Show footer based on tab
      const footer = document.querySelector('.footer');
      if (target === 'detect') {
        footer.classList.remove('hidden');
      } else {
        footer.classList.add('hidden'); // Only show global add on detect tab
      }
    };
  });
});

