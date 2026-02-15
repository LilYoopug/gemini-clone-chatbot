// Gemini Clone - JavaScript (2025 Redesign) with localStorage

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const newChatBtn = document.getElementById('new-chat-btn');
const chatList = document.getElementById('chat-list');
const searchInput = document.getElementById('search-input');
const modelBtn = document.getElementById('model-btn');
const modelDropdown = document.getElementById('model-dropdown');
const emptyState = document.getElementById('empty-state');
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatArea = document.getElementById('chat-area');
const suggestionChips = document.getElementById('suggestion-chips');
const attachBtn = document.getElementById('attach-btn');
const micBtn = document.getElementById('mic-btn');
const menuToggle = document.getElementById('menu-toggle');
const newChatIconBtn = document.getElementById('new-chat-icon-btn');
const mainContent = document.getElementById('main-content');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');

// State
let conversation = [];
let currentConversationId = null;
let currentModel = 'gemini-2.5-flash';
let isWaiting = false;
let currentFiles = []; // Array to store multiple files

// Constants
const STORAGE_KEY = 'gemini_conversations';

// Initialize
function init() {
  setupEventListeners();
  setupTextarea();
  setupChips();
  setupModelSelector();
  setupSearch();
  loadRecentChats();
  animateSpark();
}

// localStorage Functions
function getConversationsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading conversations:', e);
    return [];
  }
}

function saveConversationsToStorage(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Error saving conversations:', e);
  }
}

function saveCurrentConversation() {
  if (!currentConversationId || conversation.length === 0) return;

  const conversations = getConversationsFromStorage();
  const existingIndex = conversations.findIndex(c => c.id === currentConversationId);

  // Generate title from first user message
  const firstUserMessage = conversation.find(m => m.role === 'user');
  const title = firstUserMessage ?
    firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '') :
    'Percakapan Baru';

  const conversationData = {
    id: currentConversationId,
    title: title,
    messages: conversation,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    conversations[existingIndex] = conversationData;
  } else {
    conversations.unshift(conversationData);
  }

  // Keep only last 50 conversations
  const trimmedConversations = conversations.slice(0, 50);
  saveConversationsToStorage(trimmedConversations);
  loadRecentChats();
}

function generateConversationId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function loadConversation(conversationId) {
  const conversations = getConversationsFromStorage();
  const found = conversations.find(c => c.id === conversationId);

  if (found) {
    currentConversationId = found.id;
    conversation = found.messages || [];

    // Clear and render messages
    messagesContainer.innerHTML = '';
    messagesContainer.classList.add('active');
    chatArea.classList.add('has-conversation');
    mainContent.classList.add('has-conversation');
    emptyState.classList.add('hidden');
    suggestionChips.classList.add('hidden');

    conversation.forEach(msg => {
      // Convert old single file format to new files array format if needed
      if (msg.file && !msg.files) {
        msg.files = [msg.file];
      }
      renderMessage(msg.role, msg.text, msg);
    });

    // Highlight active chat in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.id === conversationId) {
        item.classList.add('active');
      }
    });

    if (window.innerWidth <= 768) {
      closeSidebar();
    }

    scrollToBottom();
  }
}

// Spark Animation on Load
function animateSpark() {
  const spark = document.getElementById('gemini-spark');
  if (spark) {
    spark.style.animation = 'none';
    setTimeout(() => {
      spark.style.animation = 'sparkRotate 3s ease-in-out infinite';
    }, 100);
  }
}

// Event Listeners
function setupEventListeners() {
  // Send message
  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Overlay click
  sidebarOverlay.addEventListener('click', closeSidebar);

  // Mobile menu toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }

  // New chat
  newChatBtn.addEventListener('click', startNewChat);

  // Mobile new chat icon button
  if (newChatIconBtn) {
    newChatIconBtn.addEventListener('click', startNewChat);
  }

  // Model selector
  modelBtn.addEventListener('click', toggleModelDropdown);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector-compact')) {
      modelDropdown.classList.remove('active');
      modelBtn.classList.remove('active');
    }
  });

  // Attach button - trigger file input
  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change - handle file selection
  fileInput.addEventListener('change', handleFileSelect);


  // Mic button (placeholder)
  micBtn.addEventListener('click', () => {
    console.log('Mic clicked');
  });
}

// Auto-resize textarea and toggle mic/send button
function setupTextarea() {
  const micBtn = document.getElementById('mic-btn');
  const sendBtn = document.getElementById('send-btn');

  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';

    // Toggle between mic and send button
    const hasText = userInput.value.trim().length > 0;
    if (hasText) {
      micBtn.classList.add('hidden');
      sendBtn.classList.remove('hidden');
    } else {
      micBtn.classList.remove('hidden');
      sendBtn.classList.add('hidden');
    }
  });

  // Removed focus scroll behavior to prevent spacing issues
}

// Setup suggestion chips
function setupChips() {
  const chips = document.querySelectorAll('.chip');
  const micBtn = document.getElementById('mic-btn');
  const sendBtn = document.getElementById('send-btn');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      userInput.value = prompt;
      userInput.style.height = 'auto';
      userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';

      // Toggle to show send button instead of mic
      micBtn.classList.add('hidden');
      sendBtn.classList.remove('hidden');

      userInput.focus();
    });
  });
}

// Sidebar functionality
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  }
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

// Model selector
function setupModelSelector() {
  // Use event delegation on the dropdown
  if (modelDropdown) {
    modelDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.model-option');
      if (!option) return;

      const model = option.dataset.model;
      currentModel = model;

      // Update active state for all options
      document.querySelectorAll('.model-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      // Update button text
      const modelName = option.querySelector('.model-title').textContent;
      const modelNameShort = modelName.includes('Flash') ? 'Flash' : 'Pro';

      const shortNameEl = document.querySelector('.model-name-short');
      if (shortNameEl) shortNameEl.textContent = modelNameShort;

      // Close dropdown
      modelDropdown.classList.remove('active');
      modelBtn.classList.remove('active');
    });
  }
}

function toggleModelDropdown() {
  modelDropdown.classList.toggle('active');
  modelBtn.classList.toggle('active');
}

// Setup search functionality
function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    filterConversations(searchTerm);
  });

  // Clear search when clicking new conversation
  newChatBtn.addEventListener('click', () => {
    searchInput.value = '';
    loadRecentChats();
  });
}

function filterConversations(searchTerm) {
  const conversations = getConversationsFromStorage();

  if (!searchTerm) {
    loadRecentChats();
    return;
  }

  const filtered = conversations.filter(chat => {
    // Search in title
    if (chat.title.toLowerCase().includes(searchTerm)) return true;

    // Search in messages
    if (chat.messages && chat.messages.length > 0) {
      return chat.messages.some(msg =>
        msg.text.toLowerCase().includes(searchTerm)
      );
    }

    return false;
  });

  renderChatList(filtered, searchTerm);
}

function renderChatList(conversations, searchTerm = '') {
  if (conversations.length === 0) {
    const message = searchTerm
      ? 'Tidak ada percakapan yang cocok'
      : 'Belum ada percakapan';
    chatList.innerHTML = `<li class="chat-item empty">${message}</li>`;
    return;
  }

  chatList.innerHTML = conversations.map(chat => {
    const isActive = chat.id === currentConversationId;
    return `
      <li class="chat-item ${isActive ? 'active' : ''}" data-id="${chat.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>${escapeHtml(chat.title)}</span>
      </li>
    `;
  }).join('');

  // Re-attach click handlers
  document.querySelectorAll('.chat-item').forEach(item => {
    if (item.classList.contains('empty')) return;
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      loadConversation(id);
    });
  });
}

// Load recent chats from localStorage
function loadRecentChats() {
  const conversations = getConversationsFromStorage();
  renderChatList(conversations);
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return date.toLocaleDateString('id-ID');
}

// Handle sending message
async function handleSend() {
  const message = userInput.value.trim();
  if ((!message && currentFiles.length === 0) || isWaiting) return;

  // Create new conversation if needed
  if (!currentConversationId) {
    currentConversationId = generateConversationId();
  }

  // Process all files
  let filesData = [];
  if (currentFiles.length > 0) {
    const filePromises = currentFiles.map(file => processFile(file));
    filesData = await Promise.all(filePromises);
    filesData = filesData.filter(f => f !== null);
  }

  // Prepare message content
  let messageContent = message;
  if (!messageContent && filesData.length > 0) {
    messageContent = `Sent ${filesData.length} file${filesData.length > 1 ? 's' : ''}`;
  }

  // Add user message with files at the top
  renderMessage('user', messageContent, { files: filesData });
  conversation.push({
    role: 'user',
    text: messageContent,
    files: filesData
  });
  saveCurrentConversation();

  // Clear input, files, and reset buttons
  userInput.value = '';
  userInput.style.height = 'auto';
  removeAllFiles();
  const micBtn = document.getElementById('mic-btn');
  const sendBtn = document.getElementById('send-btn');
  micBtn.classList.remove('hidden');
  sendBtn.classList.add('hidden');

  // Show messages container
  emptyState.classList.add('hidden');
  suggestionChips.classList.add('hidden');
  messagesContainer.classList.add('active');
  chatArea.classList.add('has-conversation');
  mainContent.classList.add('has-conversation');

  // Show thinking indicator
  const thinkingId = showThinking();
  isWaiting = true;

  // Prepare conversation for API - only send file data for the LAST message
  // Previous messages with files should not include base64 data (too large)
  const apiConversation = conversation.map((msg, index) => {
    const isLastMessage = index === conversation.length - 1;
    if (msg.role === 'user') {
      return {
        role: 'user',
        text: msg.text,
        // Only include file data for the last message
        files: isLastMessage ? msg.files : undefined,
        file: isLastMessage ? msg.file : undefined
      };
    }
    return msg;
  });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation: apiConversation, model: currentModel })
    });

    const data = await response.json();
    removeThinking(thinkingId);

    if (data.result) {
      renderMessage('bot', data.result);
      conversation.push({ role: 'model', text: data.result });
      saveCurrentConversation();
    } else {
      const errorMsg = 'Maaf, tidak ada respons yang diterima.';
      renderMessage('bot', errorMsg);
      conversation.push({ role: 'model', text: errorMsg });
      saveCurrentConversation();
    }
  } catch (error) {
    console.error('Error:', error);
    removeThinking(thinkingId);
    const errorMsg = 'Gagal menghubungi server. Silakan coba lagi.';
    renderMessage('bot', errorMsg);
    conversation.push({ role: 'model', text: errorMsg });
    saveCurrentConversation();
  } finally {
    isWaiting = false;
  }
}

// Render message to chat
function renderMessage(role, text, msg = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  let formattedText = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  if (role === 'user') {
    // User message: Actions on left, bubble with sharp top-right
    let fileAttachmentsHtml = '';

    // Handle multiple files (new format)
    if (msg && msg.files && msg.files.length > 0) {
      const filesHtml = msg.files.map(file => {
        // Images: show larger image preview without filename
        if (file.type.startsWith('image/')) {
          return `
            <div class="message-image-item">
              <img src="${file.data}" alt="${escapeHtml(file.name)}">
            </div>
          `;
        }
        // Other files: show filename + icon
        return `
          <div class="message-file-item">
            <div class="message-file-details">
              <span class="message-file-name">${escapeHtml(file.name)}</span>
            </div>
            <div class="message-file-thumb">
              ${getFileIcon(file.type)}
            </div>
          </div>
        `;
      }).join('');

      fileAttachmentsHtml = `<div class="message-file-attachment">${filesHtml}</div>`;
    }
    // Handle single file (old format - for backward compatibility)
    else if (msg && msg.file) {
      if (msg.file.type.startsWith('image/')) {
        fileAttachmentsHtml = `
          <div class="message-file-attachment">
            <div class="message-image-item">
              <img src="${msg.file.data}" alt="${escapeHtml(msg.file.name)}">
            </div>
          </div>
        `;
      } else {
        fileAttachmentsHtml = `
          <div class="message-file-attachment">
            <div class="message-file-item">
              <div class="message-file-details">
                <span class="message-file-name">${escapeHtml(msg.file.name)}</span>
              </div>
              <div class="message-file-thumb">
                ${getFileIcon(msg.file.type)}
              </div>
            </div>
          </div>
        `;
      }
    }

    messageDiv.innerHTML = `
      <div class="message-actions">
        <div class="action-icon" title="Edit" onclick="editMessage(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div class="action-icon" title="Copy" onclick="copyMessage(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </div>
      </div>
      <div class="message-wrapper">
        ${fileAttachmentsHtml}
        <div class="message-content">
          <div class="message-text">${formattedText}</div>
        </div>
      </div>
    `;
  } else {
    // AI message: Icon, text directly below, 3 vertical dots on far right
    const avatarSvg = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="msg-grad-${Date.now()}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4285F4"/>
            <stop offset="100%" stop-color="#4285F4"/>
          </linearGradient>
        </defs>
        <path d="M12 2C12 2 8 6 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 6 12 2 12 2Z" fill="url(#msg-grad-${Date.now()})"/>
        <path d="M22 12C22 12 18 8 14 8C11.79 8 10 9.79 10 12C10 14.21 11.79 16 14 16C18 16 22 12 22 12Z" fill="url(#msg-grad-${Date.now()})"/>
        <path d="M12 22C12 22 16 18 16 14C16 11.79 14.21 10 12 10C9.79 10 8 11.79 8 14C8 18 12 22 12 22Z" fill="url(#msg-grad-${Date.now()})"/>
        <path d="M2 12C2 12 6 16 10 16C12.21 16 14 14.21 14 12C14 9.79 12.21 8 10 8C6 8 2 12 2 12Z" fill="url(#msg-grad-${Date.now()})"/>
       </svg>`;

    messageDiv.innerHTML = `
      <div class="ai-message-wrapper">
        <div class="ai-message-header">
          <div class="message-avatar">${avatarSvg}</div>
          <div class="bot-options">
            <button class="options-btn" title="More options" onclick="toggleDropdown(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="5" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            <div class="options-dropdown">
              <button class="dropdown-item" onclick="copyMessage(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Salin</span>
              </button>
              <button class="dropdown-item" onclick="retryMessage(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <span>Coba lagi</span>
              </button>
            </div>
          </div>
        </div>
        <div class="message-content">
          <div class="message-text">${formattedText}</div>
        </div>
      </div>
    `;
  }

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Edit message function
function editMessage(icon) {
  const messageDiv = icon.closest('.message');
  const textDiv = messageDiv.querySelector('.message-text');
  const currentText = textDiv.textContent;
  const contentDiv = messageDiv.querySelector('.message-content');

  // Create edit container
  const editContainer = document.createElement('div');
  editContainer.className = 'edit-container';
  editContainer.style.cssText = 'width: 100%; display: flex; flex-direction: column; gap: 12px;';

  // Create input with white outline
  const input = document.createElement('textarea');
  input.value = currentText;
  input.className = 'edit-input';

  // Create buttons container
  const buttonsDiv = document.createElement('div');
  buttonsDiv.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;';

  // Cancel button (gray text, circular)
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Batal';
  cancelBtn.className = 'edit-btn edit-btn-cancel';

  // Update button (gray until modified, then blue)
  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Perbarui';
  updateBtn.className = 'edit-btn edit-btn-update';
  updateBtn.disabled = true;

  buttonsDiv.appendChild(cancelBtn);
  buttonsDiv.appendChild(updateBtn);

  // Track text changes
  input.addEventListener('input', () => {
    const hasChanged = input.value.trim() !== currentText.trim();
    if (hasChanged) {
      updateBtn.classList.add('active');
      updateBtn.disabled = false;
    } else {
      updateBtn.classList.remove('active');
      updateBtn.disabled = true;
    }
  });
  editContainer.appendChild(input);
  editContainer.appendChild(buttonsDiv);

  // Hide original content and show edit mode below the bubble
  contentDiv.style.display = 'none';
  messageDiv.appendChild(editContainer);
  input.focus();

  // Cancel edit
  const cancelEdit = () => {
    contentDiv.style.display = '';
    editContainer.remove();
  };

  // Save edit
  const saveEdit = () => {
    const newText = input.value.trim();
    if (newText && newText !== currentText) {
      textDiv.textContent = newText;
      // Update in conversation array
      const msgIndex = Array.from(messagesContainer.children).indexOf(messageDiv);
      if (conversation[msgIndex]) {
        conversation[msgIndex].text = newText;
        saveCurrentConversation();
      }
    }
    contentDiv.style.display = '';
    editContainer.remove();
  };

  cancelBtn.addEventListener('click', cancelEdit);
  updateBtn.addEventListener('click', saveEdit);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  });
}

// Add message to chat (alias for renderMessage)
function addMessage(role, text) {
  renderMessage(role, text);
}

// Show thinking indicator
function showThinking() {
  const id = 'thinking-' + Date.now();
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = id;
  thinkingDiv.className = 'message bot';

  const avatarSvg = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="think-grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4285F4"/>
            <stop offset="100%" stop-color="#4285F4"/>
          </linearGradient>
        </defs>
        <path d="M12 2C12 2 8 6 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 6 12 2 12 2Z" fill="url(#think-grad-${id})"/>
        <path d="M22 12C22 12 18 8 14 8C11.79 8 10 9.79 10 12C10 14.21 11.79 16 14 16C18 16 22 12 22 12Z" fill="url(#think-grad-${id})"/>
        <path d="M12 22C12 22 16 18 16 14C16 11.79 14.21 10 12 10C9.79 10 8 11.79 8 14C8 18 12 22 12 22Z" fill="url(#think-grad-${id})"/>
        <path d="M2 12C2 12 6 16 10 16C12.21 16 14 14.21 14 12C14 9.79 12.21 8 10 8C6 8 2 12 2 12Z" fill="url(#think-grad-${id})"/>
      </svg>`;

  thinkingDiv.innerHTML = `
    <div class="ai-message-wrapper">
      <div class="ai-message-header">
        <div class="message-avatar">${avatarSvg}</div>
        <div class="bot-options">
          <button class="options-btn" title="More options" onclick="toggleDropdown(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          <div class="options-dropdown">
            <button class="dropdown-item" onclick="copyMessage(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Salin</span>
            </button>
            <button class="dropdown-item" onclick="retryMessage(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Coba lagi</span>
            </button>
          </div>
        </div>
      </div>
      <div class="message-content">
        <div class="thinking">
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
        </div>
      </div>
    </div>
  `;

  messagesContainer.appendChild(thinkingDiv);
  scrollToBottom();

  return id;
}

// Remove thinking indicator
function removeThinking(id) {
  const thinkingDiv = document.getElementById(id);
  if (thinkingDiv) {
    thinkingDiv.remove();
  }
}

// Toggle dropdown menu
function toggleDropdown(btn) {
  const dropdown = btn.nextElementSibling;
  const isActive = dropdown.classList.contains('active');

  // Close all other dropdowns
  document.querySelectorAll('.options-dropdown.active').forEach(d => {
    d.classList.remove('active');
  });

  // Toggle current dropdown
  if (!isActive) {
    dropdown.classList.add('active');

    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeDropdown);
    }, 0);
  }
}

// Copy message text to clipboard
function copyMessage(btn) {
  const messageDiv = btn.closest('.message');
  const textDiv = messageDiv.querySelector('.message-text');
  const text = textDiv ? textDiv.textContent : '';

  navigator.clipboard.writeText(text).then(() => {
    // Check if this is a dropdown item or action icon
    const span = btn.querySelector('span');
    if (span) {
      // Dropdown item - show "Tersalin!" text
      const originalText = span.textContent;
      span.textContent = 'Tersalin!';
      setTimeout(() => {
        span.textContent = originalText;
      }, 1500);
    } else {
      // Action icon - change color to green
      btn.style.color = 'var(--google-green)';
      setTimeout(() => {
        btn.style.color = '';
      }, 1000);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
  });

  // Close dropdown if exists
  const dropdown = btn.closest('.options-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

// Retry message - resend the previous user message with files
async function retryMessage(btn) {
  // Close dropdown
  const dropdown = btn.closest('.options-dropdown');
  if (dropdown) dropdown.classList.remove('active');

  const messageDiv = btn.closest('.message');
  if (!messageDiv) {
    console.error('No message div found');
    return;
  }

  // Check if this is actually a bot message
  if (!messageDiv.classList.contains('bot')) {
    console.error('Message is not a bot message');
    return;
  }

  // Get all messages (both user and bot) to find the position
  const allMessages = Array.from(messagesContainer.children);
  const messageIndex = allMessages.indexOf(messageDiv);

  if (messageIndex === -1) {
    console.error('Message not found in container');
    return;
  }

  // Count how many bot messages exist up to and including this one
  let botCount = 0;
  for (let i = 0; i <= messageIndex; i++) {
    if (allMessages[i].classList.contains('bot')) {
      botCount++;
    }
  }

  // The bot count is the index (1-based, so subtract 1 for 0-based)
  const botIndex = botCount - 1;

  // Find this bot message in conversation array
  let convBotIndex = -1;
  let tempBotCount = 0;
  for (let i = 0; i < conversation.length; i++) {
    if (conversation[i].role === 'model') {
      if (tempBotCount === botIndex) {
        convBotIndex = i;
        break;
      }
      tempBotCount++;
    }
  }

  if (convBotIndex === -1) {
    console.error('Bot message not found in conversation array');
    return;
  }

  // Find the user message that triggered this bot response
  let userConvIndex = -1;
  for (let i = convBotIndex - 1; i >= 0; i--) {
    if (conversation[i].role === 'user') {
      userConvIndex = i;
      break;
    }
  }

  if (userConvIndex === -1) {
    console.error('No user message found before this bot message');
    return;
  }

  // Remove this bot message and all subsequent messages from conversation
  conversation = conversation.slice(0, convBotIndex);

  // Remove this bot message and all subsequent messages from DOM
  for (let i = allMessages.length - 1; i >= messageIndex; i--) {
    allMessages[i].remove();
  }

  // Show thinking indicator
  const thinkingId = showThinking();
  isWaiting = true;

  // Prepare API conversation - include files for the last user message
  const apiConversation = conversation.map((msg, idx) => {
    const isLast = idx === conversation.length - 1;
    if (msg.role === 'user') {
      return {
        role: 'user',
        text: msg.text,
        files: isLast ? msg.files : undefined,
        file: isLast ? msg.file : undefined
      };
    }
    return msg;
  });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: apiConversation, model: currentModel })
    });

    const data = await response.json();
    removeThinking(thinkingId);

    if (data.result) {
      renderMessage('bot', data.result);
      conversation.push({ role: 'model', text: data.result });
      saveCurrentConversation();
    } else {
      const errorMsg = 'Maaf, tidak ada respons yang diterima.';
      renderMessage('bot', errorMsg);
      conversation.push({ role: 'model', text: errorMsg });
      saveCurrentConversation();
    }
  } catch (error) {
    console.error('Error:', error);
    removeThinking(thinkingId);
    const errorMsg = 'Gagal menghubungi server. Silakan coba lagi.';
    renderMessage('bot', errorMsg);
    conversation.push({ role: 'model', text: errorMsg });
    saveCurrentConversation();
  } finally {
    isWaiting = false;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Scroll to bottom of chat
function scrollToBottom() {
  setTimeout(() => {
    chatArea.scrollTo({
      top: chatArea.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);
}

// Start new chat
function startNewChat() {
  // Save current conversation before switching
  if (currentConversationId && conversation.length > 0) {
    saveCurrentConversation();
  }

  // Reset state
  conversation = [];
  currentConversationId = null;

  // Clear any selected files
  removeAllFiles();

  // Clear messages
  messagesContainer.innerHTML = '';
  messagesContainer.classList.remove('active');
  chatArea.classList.remove('has-conversation');
  mainContent.classList.remove('has-conversation');

  // Show empty state and chips
  emptyState.classList.remove('hidden');
  suggestionChips.classList.remove('hidden');

  // Clear input and reset buttons
  userInput.value = '';
  userInput.style.height = 'auto';
  const micBtn = document.getElementById('mic-btn');
  const sendBtn = document.getElementById('send-btn');
  micBtn.classList.remove('hidden');
  sendBtn.classList.add('hidden');

  // Remove active state from sidebar
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }

  // Focus input
  userInput.focus();

  // Re-animate spark
  animateSpark();
}

// Handle file selection
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  // Add new files to current files array
  currentFiles = [...currentFiles, ...files];
  showFilePreviews();
}

// Show all file previews
function showFilePreviews() {
  if (currentFiles.length === 0) {
    filePreview.classList.add('hidden');
    return;
  }

  filePreview.innerHTML = '';

  currentFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');

    // Images: show larger preview
    if (file.type.startsWith('image/')) {
      fileItem.className = 'file-preview-image';
      fileItem.innerHTML = `
        <img id="file-preview-img-${index}" alt="${file.name}">
        <button class="file-preview-remove image-remove" data-index="${index}" aria-label="Remove file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      filePreview.appendChild(fileItem);

      // Load image
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgEl = document.getElementById(`file-preview-img-${index}`);
        if (imgEl) {
          imgEl.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Other files: show filename + icon
      fileItem.className = 'file-preview-item';
      fileItem.innerHTML = `
        <div class="file-preview-details">
          <span class="file-preview-name">${file.name}</span>
        </div>
        <div class="file-preview-thumb">
          ${getFileIcon(file.type)}
        </div>
        <button class="file-preview-remove" data-index="${index}" aria-label="Remove file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      filePreview.appendChild(fileItem);
    }
  });

  // Add event listeners to remove buttons
  filePreview.querySelectorAll('.file-preview-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeFile(index);
    });
  });

  filePreview.classList.remove('hidden');
}

// Get file icon SVG based on file type
function getFileIcon(fileType) {
  if (fileType.includes('pdf')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15v-4"/>
      <path d="M12 15v-6"/>
      <path d="M15 15v-2"/>
    </svg>`;
  }
  if (fileType.includes('word') || fileType.includes('document')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>`;
  }
  if (fileType.includes('text') || fileType.includes('txt')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>`;
  }
  // Default file icon
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>`;
}

// Remove selected file by index
function removeFile(index) {
  currentFiles.splice(index, 1);
  showFilePreviews();

  // Clear file input if no files left
  if (currentFiles.length === 0) {
    fileInput.value = '';
  }
}

// Remove all files
function removeAllFiles() {
  currentFiles = [];
  fileInput.value = '';
  filePreview.innerHTML = '';
  filePreview.classList.add('hidden');
}

// Process file for sending (convert to base64)
function processFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      });
    };
    reader.onerror = () => {
      console.error('Error reading file');
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
