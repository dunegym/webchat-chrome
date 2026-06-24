// ===========================================
// WebChat AI - 主控制器
// 负责 UI 渲染、事件绑定、状态协调
// ===========================================

// ============= State =============
const state = {
  settings: null,
  sessions: [],
  currentSessionId: null,
  currentSession: null,
  isStreaming: false,
  abortController: null,
  sessionsVisible: false,
  isInitialized: false,
};

// ============= DOM Refs =============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {};
function cacheDom() {
  el.settingsPanel = $('#settings-panel');
  el.chatView = $('#chat-view');
  el.sessionsPanel = $('#sessions-panel');
  el.sessionsList = $('#sessions-list');
  el.messages = $('#messages');
  el.messagesContainer = $('#messages-container');
  el.input = $('#message-input');
  el.sendBtn = $('#send-btn');
  el.newSessionBtn = $('#new-session-btn');
  el.settingsBtn = $('#settings-btn');
  el.toggleSessionsBtn = $('#toggle-sessions-btn');
  el.closeSessionsBtn = $('#close-sessions-btn');
  el.overlay = $('#overlay');
  el.modelIndicator = $('#model-indicator');

  el.providerSelect = $('#provider-select');
  el.baseURLInput = $('#baseurl-input');
  el.apiKeyInput = $('#apikey-input');
  el.modelSelect = $('#model-select');
  el.saveSettingsBtn = $('#save-settings-btn');
  el.cancelSettingsBtn = $('#cancel-settings-btn');
  el.fetchModelsBtn = $('#fetch-models-btn');
  el.languageSelect = $('#language-select');
}

// ============= Settings UI =============
function renderSettingsForm() {
  // 服务商下拉
  el.providerSelect.innerHTML = Object.entries(PROVIDERS)
    .map(
      ([key, p]) =>
        `<option value="${key}" ${key === state.settings.provider ? 'selected' : ''}>${p.name}</option>`
    )
    .join('');

  // Base URL
  updateBaseURLInput();

  // API Key — 从每个服务商独立的存储池读取
  const apiKeys = state.settings.apiKeys || {};
  el.apiKeyInput.value = apiKeys[state.settings.provider] || '';

  // 模型 — 从每个服务商独立的模型池读取
  const models = state.settings._models || [];
  const savedModels = state.settings.savedModels || {};
  const savedModel = savedModels[state.settings.provider] || '';
  el.modelSelect.innerHTML =
    `<option value="">${t('settings.selectModel')}</option>` +
    models
      .map(
        (m) =>
          `<option value="${m.id || m}" ${(m.id || m) === savedModel ? 'selected' : ''}>${m.id || m}</option>`
      )
      .join('');
  if (!models.length && savedModel) {
    el.modelSelect.innerHTML +=
      `<option value="${savedModel}" selected>${savedModel}</option>`;
  }

  // 语言选择器
  el.languageSelect.innerHTML = Object.entries(LANGUAGES)
    .map(
      ([key, name]) =>
        `<option value="${key}" ${key === (state.settings.language || 'zh') ? 'selected' : ''}>${name}</option>`
    )
    .join('');
}

function updateBaseURLInput() {
  const provider = state.settings.provider;
  if (provider === 'custom') {
    el.baseURLInput.value = state.settings.customBaseURL || '';
    el.baseURLInput.placeholder = t('settings.customBaseURLPH');
  } else {
    const p = PROVIDERS[provider];
    el.baseURLInput.value = p ? p.baseURL : '';
    el.baseURLInput.placeholder = t('settings.baseURLPH');
  }
}

// ============= Sessions UI =============
async function renderSessions() {
  state.sessions = await Storage.getSessions();

  if (!state.sessions.length) {
    el.sessionsList.innerHTML = `<div class="empty-sessions">${t('chat.noSessions')}</div>`;
    return;
  }

  el.sessionsList.innerHTML = state.sessions
    .map(
      (s) => `
    <div class="session-item ${s.id === state.currentSessionId ? 'active' : ''}" data-id="${s.id}">
      <span class="session-title">${escapeHtml(s.title || t('chat.newChat'))}</span>
      <button class="session-delete-btn" data-id="${s.id}">✕</button>
    </div>`
    )
    .join('');

  // 绑定点击切换
  el.sessionsList.querySelectorAll('.session-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('session-delete-btn')) return;
      switchSession(item.dataset.id);
    });
  });

  // 绑定删除
  el.sessionsList.querySelectorAll('.session-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(t('toast.deleteConfirm'))) return;
      const id = btn.dataset.id;
      await Storage.deleteSession(id);
      if (id === state.currentSessionId) {
        state.currentSessionId = null;
        state.currentSession = null;
        await Storage.setCurrentSessionId(null);
      }
      renderSessions();
      renderMessages();
      updateModelIndicator();
    });
  });
}

// ============= Messages UI =============
function renderMessages() {
  if (!state.currentSession || !state.currentSession.messages.length) {
    el.messages.innerHTML = `<div class="welcome-message">${t('chat.welcome')}</div>`;
    return;
  }

  el.messages.innerHTML = state.currentSession.messages
    .map((msg) => {
      const isUser = msg.role === 'user';
      const content = isUser
        ? escapeHtml(msg.content)
        : Renderer.renderMarkdown(msg.content);
      return `
      <div class="message ${msg.role}">
        <div class="message-avatar">${isUser ? '👤' : '🤖'}</div>
        <div class="message-content">${content || '<em>...</em>'}</div>
      </div>`;
    })
    .join('');

  Renderer.highlightAll();
  Renderer.addCopyButtons();
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
  });
}

// ============= Model Indicator =============
function updateModelIndicator() {
  const p = PROVIDERS[state.settings.provider];
  const providerName = p ? p.name : state.settings.provider;
  const model = state.settings.model || state.currentSession?.model || t('status.notSelected');
  el.modelIndicator.textContent = t('chat.modelIndicator', { provider: providerName, model });
}

// ============= Session Actions =============
async function switchSession(id) {
  if (state.isStreaming) {
    state.abortController?.abort();
    state.isStreaming = false;
    el.sendBtn.disabled = !el.input.value.trim();
  }

  state.currentSessionId = id;
  state.currentSession = await Storage.getSession(id);
  await Storage.setCurrentSessionId(id);

  renderSessions();
  renderMessages();
  updateModelIndicator();
  toggleSessionsPanel(false);
}

async function newSession() {
  if (state.isStreaming) {
    state.abortController?.abort();
    state.isStreaming = false;
    el.sendBtn.disabled = !el.input.value.trim();
  }

  if (!state.settings.apiKey || !state.settings.model) {
    showToast(t('error.configureFirst'), 'error');
    return;
  }

  const session = {
    id: Storage.generateId(),
    title: t('chat.newChat'),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: state.settings.model,
    provider: state.settings.provider,
  };

  await Storage.saveSession(session);
  await switchSession(session.id);
}

// ============= Send Message =============
async function handleSend() {
  const content = el.input.value.trim();
  if (!content || state.isStreaming) return;

  if (!state.settings.apiKey || !state.settings.model) {
    showToast(t('error.configureFirst'), 'error');
    return;
  }

  // 确保有当前会话
  if (!state.currentSession) {
    await newSession();
    // 如果 newSession 因为未配置而返回，再次检查
    if (!state.currentSession) return;
  }

  // 添加用户消息
  const userMsg = { role: 'user', content, timestamp: Date.now() };
  state.currentSession.messages.push(userMsg);
  state.currentSession.updatedAt = Date.now();

  // 自动生成标题：取第一条消息的前 30 字
  if (state.currentSession.messages.length === 1) {
    state.currentSession.title =
      content.slice(0, 30) + (content.length > 30 ? '...' : '');
  }

  await Storage.saveSession(state.currentSession);

  // 清空输入
  el.input.value = '';
  el.sendBtn.disabled = true;
  autoResizeInput();

  // 重绘消息
  renderMessages();

  // 发起 API 调用
  await sendToAPI();

  // 更新会话列表
  renderSessions();
}

async function sendToAPI() {
  state.isStreaming = true;
  state.abortController = new AbortController();
  el.sendBtn.disabled = true;

  // 添加 AI 占位消息
  const aiMsg = { role: 'assistant', content: '', timestamp: Date.now() };
  state.currentSession.messages.push(aiMsg);

  // 显示加载动画
  showLoadingIndicator();

  try {
    const settings = state.settings;
    const model = state.currentSession.model || settings.model;

    // 构建消息列表，粗略估计 token 数量
    let messages = state.currentSession.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    // 在开头添加系统消息
    messages.unshift({ role: 'system', content: t('system.prompt') });

    // 粗略 token 估算：中文字符 ≈ 2 token，其他 ≈ 4 字符/token
    // 如果超过 120K token，截断早期的对话
    const MAX_TOKENS = 120000;
    let totalTokens = 0;
    for (const m of messages) {
      // 粗略估算
      const chineseChars = (m.content.match(/[一-鿿]/g) || []).length;
      const otherChars = m.content.length - chineseChars;
      totalTokens += chineseChars / 2 + otherChars / 4;
    }

    if (totalTokens > MAX_TOKENS) {
      // 保留系统消息和最后 20 条消息
      const systemMsg = messages.shift();
      while (messages.length > 20) {
        messages.shift();
      }
      messages.unshift(systemMsg);
      // 添加截断提示
      messages.splice(1, 0, {
        role: 'system',
        content: t('system.truncated'),
      });
    }

    let accumulatedContent = '';

    // requestAnimationFrame 节流：控制 DOM 更新频率
    let rafPending = false;
    const throttledUpdate = (fullContent) => {
      accumulatedContent = fullContent;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          removeLoadingIndicator();
          updateStreamingMessage(accumulatedContent);
        });
      }
    };

    await API.chatCompletion({
      baseURL: settings.baseURL,
      apiKey: settings.apiKey,
      model,
      messages,
      signal: state.abortController.signal,
      onChunk: (_text, fullContent) => {
        throttledUpdate(fullContent);
      },
    });

    // 确保最后一次 rAF 已执行
    if (rafPending) {
      rafPending = false;
      removeLoadingIndicator();
      updateStreamingMessage(accumulatedContent);
    }

    // 流式完成
    aiMsg.content = accumulatedContent;
    state.currentSession.updatedAt = Date.now();
    await Storage.saveSession(state.currentSession);

    // 最终渲染（带代码高亮）
    renderMessages();
  } catch (err) {
    removeLoadingIndicator();

    if (err.name === 'AbortError') {
      aiMsg.content = `**[${t('error.cancelled')}]**`;
    } else {
      aiMsg.content = `**${t('error.networkError')}**: ${err.message}`;
    }

    state.currentSession.updatedAt = Date.now();
    await Storage.saveSession(state.currentSession);
    renderMessages();
  }

  state.isStreaming = false;
  state.abortController = null;
  el.sendBtn.disabled = !el.input.value.trim();
}

// ============= Streaming UI Helpers =============
function showLoadingIndicator() {
  removeLoadingIndicator();
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'loading-indicator';
  div.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  el.messages.appendChild(div);
  scrollToBottom();
}

function removeLoadingIndicator() {
  document.getElementById('loading-indicator')?.remove();
}

function updateStreamingMessage(content) {
  const msgs = el.messages.querySelectorAll('.message.assistant');
  const last = msgs[msgs.length - 1];
  if (!last || last.id === 'loading-indicator') return;

  const contentEl = last.querySelector('.message-content');
  if (contentEl) {
    contentEl.innerHTML = Renderer.renderMarkdown(content);
    Renderer.highlightAll();
    Renderer.addCopyButtons();

    // 如果用户接近底部（100px 内），自动跟随
    const { scrollTop, scrollHeight, clientHeight } = el.messagesContainer;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (nearBottom) {
      el.messagesContainer.scrollTop = scrollHeight;
    }
  }
}

// ============= Settings Panel =============
function showSettingsPanel() {
  renderSettingsForm();
  el.settingsPanel.classList.remove('hidden');
  el.chatView.classList.add('hidden');
  el.overlay.classList.remove('hidden');
}

function hideSettingsPanel() {
  el.settingsPanel.classList.add('hidden');
  el.chatView.classList.remove('hidden');
  el.overlay.classList.add('hidden');
}

// ============= Sessions Toggle =============
function toggleSessionsPanel(show) {
  if (show === undefined) {
    state.sessionsVisible = !state.sessionsVisible;
  } else {
    state.sessionsVisible = show;
  }
  el.sessionsPanel.classList.toggle('hidden', !state.sessionsVisible);
  if (state.sessionsVisible) {
    renderSessions();
  }
}

// ============= Toast =============
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============= Helpers =============
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function autoResizeInput() {
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 200) + 'px';
}

// ============= Event Bindings =============
function bindEvents() {
  // ---- Settings ----
  el.providerSelect.addEventListener('change', () => {
    const oldProvider = state.settings.provider;
    const newProvider = el.providerSelect.value;

    // 将当前 Key 保存到旧服务商的独立池中
    const apiKeys = state.settings.apiKeys || {};
    apiKeys[oldProvider] = el.apiKeyInput.value;

    // 将当前模型名保存到旧服务商的独立池中
    const savedModels = state.settings.savedModels || {};
    savedModels[oldProvider] = el.modelSelect.value;

    state.settings.provider = newProvider;
    state.settings.apiKeys = apiKeys;
    state.settings.savedModels = savedModels;
    state.settings.apiKey = apiKeys[newProvider] || ''; // 用于 API 调用
    state.settings.model = savedModels[newProvider] || '';
    updateBaseURLInput();

    // 加载新服务商独立保存的 Key
    el.apiKeyInput.value = apiKeys[newProvider] || '';

    // 加载新服务商独立保存的模型列表与选中模型
    state.settings._models = [];
    const newSavedModel = savedModels[newProvider] || '';
    el.modelSelect.innerHTML = newSavedModel
      ? `<option value="">${t('settings.selectModel')}</option><option value="${newSavedModel}" selected>${newSavedModel}</option>`
      : `<option value="">${t('settings.fetchModelsFirst')}</option>`;
  });

  el.fetchModelsBtn.addEventListener('click', async () => {
    const baseURL = el.baseURLInput.value.trim();
    const apiKey = el.apiKeyInput.value.trim();

    if (!baseURL) {
      showToast(t('error.fillBaseURL'), 'error');
      return;
    }
    if (!apiKey) {
      showToast(t('error.fillApiKey'), 'error');
      return;
    }

    el.fetchModelsBtn.disabled = true;
    el.fetchModelsBtn.textContent = t('status.loading');

    try {
      const models = await API.fetchModelList(baseURL, apiKey);
      state.settings._models = models;
      state.settings.baseURL = baseURL;
      state.settings.apiKey = apiKey;
      // 同时保存到独立 Key 池
      const apiKeys = state.settings.apiKeys || {};
      apiKeys[state.settings.provider] = apiKey;
      state.settings.apiKeys = apiKeys;

      // 保留上一次选择的模型（如果仍在列表中）
      const savedModels = state.settings.savedModels || {};
      const prevModel = savedModels[state.settings.provider] || '';
      const modelStillExists = prevModel && models.some((m) => (m.id || m) === prevModel);

      // 更新模型下拉 — 使用同名选项
      const selectPlaceholder = t('settings.selectModel');
      el.modelSelect.innerHTML =
        `<option value="">${selectPlaceholder}</option>` +
        models
          .map(
            (m) =>
              `<option value="${m.id || m}" ${(m.id || m) === prevModel ? 'selected' : ''}>${m.id || m}</option>`
          )
          .join('');
      // 如果之前的模型已不在列表中，仍显示为可选（保留用户手动输入的模型）
      if (prevModel && !modelStillExists) {
        el.modelSelect.innerHTML +=
          `<option value="${prevModel}" selected>${prevModel}</option>`;
      }
      el.modelSelect.disabled = false;

      showToast(t('toast.fetchSuccess', { count: models.length }), 'success');
    } catch (err) {
      showToast(t('toast.fetchFailed', { msg: err.message }), 'error');
    }

    el.fetchModelsBtn.disabled = false;
    el.fetchModelsBtn.textContent = t('status.fetchModels');
  });

  // 不保存直接返回
  el.cancelSettingsBtn.addEventListener('click', () => {
    hideSettingsPanel();
  });

  el.saveSettingsBtn.addEventListener('click', async () => {
    const provider = el.providerSelect.value;
    const baseURL = el.baseURLInput.value.trim();
    const apiKey = el.apiKeyInput.value.trim();
    const model = el.modelSelect.value;

    if (!apiKey) {
      showToast(t('error.inputApiKey'), 'error');
      return;
    }
    if (!baseURL) {
      showToast(t('error.inputBaseURL'), 'error');
      return;
    }
    if (!model) {
      showToast(t('error.selectModel'), 'error');
      return;
    }

    // 保存语言偏好
    const language = el.languageSelect?.value || state.settings.language || 'zh';

    state.settings = {
      provider,
      baseURL,
      apiKey,
      model,
      language,
      customBaseURL: provider === 'custom' ? baseURL : '',
      _models: state.settings._models || [],
      apiKeys: {
        ...(state.settings.apiKeys || {}),
        [provider]: apiKey,
      },
      savedModels: {
        ...(state.settings.savedModels || {}),
        [provider]: model,
      },
    };

    await Storage.saveSettings(state.settings);
    hideSettingsPanel();
    updateModelIndicator();
    showToast(t('toast.saveSuccess'), 'success');

    // 如果没有当前会话，创建一个
    if (!state.currentSession) {
      await newSession();
    }
  });

  // ---- Language ----
  el.languageSelect?.addEventListener('change', () => {
    const lang = el.languageSelect.value;
    setLanguage(lang);
    applyLanguage();
    // 更新动态文本
    updateBaseURLInput();
    updateModelIndicator();
    // 刷新模型下拉的同名选项
    const selectPlaceholder = t('settings.selectModel');
    const options = el.modelSelect.querySelectorAll('option');
    if (options.length > 0) options[0].textContent = selectPlaceholder;
    // 更新输入框占位符
    el.input.placeholder = t('chat.placeholder');
    // 更新 API Key input placeholder
    el.apiKeyInput.placeholder = t('settings.apiKeyPH');
  });

  // ---- Chat ----
  el.sendBtn.addEventListener('click', handleSend);

  el.input.addEventListener('input', () => {
    el.sendBtn.disabled = !el.input.value.trim() || state.isStreaming;
    autoResizeInput();
  });

  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ---- Top Bar ----
  el.newSessionBtn.addEventListener('click', newSession);
  el.settingsBtn.addEventListener('click', () => {
    if (el.settingsPanel.classList.contains('hidden')) {
      showSettingsPanel();
    } else {
      hideSettingsPanel();
    }
  });
  el.toggleSessionsBtn.addEventListener('click', () => toggleSessionsPanel());
  el.closeSessionsBtn.addEventListener('click', () => toggleSessionsPanel(false));
  el.overlay.addEventListener('click', hideSettingsPanel);

  // ---- Auto resize on paste ----
  el.input.addEventListener('paste', () => {
    setTimeout(autoResizeInput, 0);
  });
}

// ============= Init =============
async function init() {
  cacheDom();
  bindEvents(); // ⚠️ 之前遗漏了这一句！所有事件绑定现在生效

  // 加载设置
  state.settings = await Storage.getSettings();

  // 应用语言设置
  setLanguage(state.settings.language || 'zh');
  applyLanguage();
  el.input.placeholder = t('chat.placeholder');
  el.apiKeyInput.placeholder = t('settings.apiKeyPH');

  // 检查是否已配置
  if (!state.settings.apiKey) {
    showSettingsPanel();
    return;
  }

  // 加载当前会话
  state.currentSessionId = await Storage.getCurrentSessionId();
  if (state.currentSessionId) {
    state.currentSession = await Storage.getSession(state.currentSessionId);
  }

  renderMessages();
  renderSessions();
  updateModelIndicator();

  // 监听跨标签页的状态同步
  Storage.onChanged((changes) => {
    if (changes.sessions || changes.currentSessionId) {
      renderSessions();
    }
  });

  state.isInitialized = true;
}

// ============= Boot =============
document.addEventListener('DOMContentLoaded', init);
