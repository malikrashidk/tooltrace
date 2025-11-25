/**
 * Content script that runs on all pages
 * Detects when user is on a known SaaS tool
 */

// Store visited tools in local storage
const visitedTools = new Set();

function getCurrentTool() {
  const domain = window.location.hostname;
  
  const knownTools = {
    'figma.com': 'Figma',
    'github.com': 'GitHub',
    'chat.openai.com': 'ChatGPT',
    'aws.amazon.com': 'AWS',
    'notion.so': 'Notion',
    'slack.com': 'Slack',
    'zoom.us': 'Zoom',
    'monday.com': 'Monday.com',
    'asana.com': 'Asana',
    'trello.com': 'Trello',
  };

  for (const [knownDomain, toolName] of Object.entries(knownTools)) {
    if (domain.includes(knownDomain.split('.')[0])) {
      return { name: toolName, domain: domain };
    }
  }

  return null;
}

// Track visited tools
const tool = getCurrentTool();
if (tool && !visitedTools.has(tool.domain)) {
  visitedTools.add(tool.domain);
  chrome.storage.local.get('visitedTools', (result) => {
    const visited = result.visitedTools || [];
    if (!visited.includes(tool.domain)) {
      visited.push(tool.domain);
      chrome.storage.local.set({ visitedTools: visited });
    }
  });
}
