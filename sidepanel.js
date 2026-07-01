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
  pageContextEnabled: false,
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
  el.pageContextBtn = $('#page-context-btn');
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

  el.customProviderNameInput = $('#custom-provider-name');
  el.customProviderNameGroup = $('#custom-provider-name-group');
  el.customProviderActions = $('#custom-provider-actions');
  el.addCustomProviderBtn = $('#add-custom-provider-btn');
  el.deleteCustomProviderBtn = $('#delete-custom-provider-btn');
}

// ============= Provider Helpers =============
function isCustomProvider(provider) {
  return typeof provider === 'string' && provider.startsWith('custom:');
}

function getCustomProviderId(provider) {
  return provider.slice(7);
}

function getCustomProvider(provider) {
  if (!isCustomProvider(provider)) return null;
  return state.settings?.customProviders?.[getCustomProviderId(provider)] || null;
}

function getProviderName(provider) {
  if (isCustomProvider(provider)) {
    return getCustomProvider(provider)?.name || t('settings.customProvider');
  }
  return PROVIDERS[provider]?.name || provider;
}

function getProviderBaseURL(provider) {
  if (isCustomProvider(provider)) {
    return getCustomProvider(provider)?.baseURL || '';
  }
  return PROVIDERS[provider]?.baseURL || '';
}

function getProviderAPIKey(provider) {
  return state.settings?.apiKeys?.[provider] || '';
}

function getProviderModel(provider) {
  return state.settings?.savedModels?.[provider] || '';
}

function getProviderModelList(provider) {
  return state.settings?.savedModelLists?.[provider] || [];
}

/**
 * 迁移旧版单个 custom 服务商到新的多自定义服务商结构
 */
function migrateLegacyCustomProvider(settings) {
  const hasLegacy =
    settings.provider === 'custom' ||
    settings.customBaseURL ||
    settings.apiKeys?.custom;
  if (!hasLegacy) return settings;

  const id = Storage.generateId();
  settings.customProviders = settings.customProviders || {};
  settings.customProviders[id] = {
    id,
    name: t('settings.customProvider'),
    baseURL: settings.customBaseURL || '',
  };

  if (settings.apiKeys?.custom) {
    settings.apiKeys[`custom:${id}`] = settings.apiKeys.custom;
    delete settings.apiKeys.custom;
  }
  if (settings.savedModels?.custom) {
    settings.savedModels[`custom:${id}`] = settings.savedModels.custom;
    delete settings.savedModels.custom;
  }
  if (settings.savedModelLists?.custom) {
    settings.savedModelLists[`custom:${id}`] = settings.savedModelLists.custom;
    delete settings.savedModelLists.custom;
  }

  if (settings.provider === 'custom') {
    settings.provider = `custom:${id}`;
  }
  settings.customBaseURL = '';
  return settings;
}

// ============= Settings UI =============
function renderSettingsForm() {
  const provider = state.settings.provider;
  const customProviders = state.settings.customProviders || {};

  // 服务商下拉：预设 + 自定义
  el.providerSelect.innerHTML = [
    ...Object.entries(PROVIDERS).map(
      ([key, p]) => `<option value="${key}" ${key === provider ? 'selected' : ''}>${p.name}</option>`
    ),
    ...Object.entries(customProviders).map(([id, cp]) => {
      const key = `custom:${id}`;
      return `<option value="${key}" ${key === provider ? 'selected' : ''}>${cp.name || t('settings.customProvider')}</option>`;
    }),
  ].join('');

  // 自定义服务商名称输入与删除按钮
  const isCustom = isCustomProvider(provider);
  el.customProviderNameGroup.classList.toggle('hidden', !isCustom);
  el.customProviderActions.classList.toggle('hidden', !isCustom);
  if (isCustom) {
    const cp = getCustomProvider(provider);
    el.customProviderNameInput.value = cp?.name || '';
  }

  // Base URL
  updateBaseURLInput();

  // API Key — 从每个服务商独立的存储池读取
  el.apiKeyInput.value = getProviderAPIKey(provider);

  // 模型 — 从每个服务商独立的模型池读取
  if (!state.settings._models || !state.settings._models.length) {
    state.settings._models = getProviderModelList(provider);
  }
  const models = state.settings._models;
  const savedModel = getProviderModel(provider);
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
  const isCustom = isCustomProvider(provider);
  el.baseURLInput.value = getProviderBaseURL(provider);
  el.baseURLInput.placeholder = isCustom
    ? t('settings.customBaseURLPH')
    : t('settings.baseURLPH');
  // 内置服务商只读，自定义服务商可编辑
  el.baseURLInput.readOnly = !isCustom;
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
  const providerName = getProviderName(state.settings.provider);
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

  // 显示流式消息容器（打字动画）
  resetStreamingState();
  showTypingIndicator();

  try {
    const settings = state.settings;
    const model = settings.model || state.currentSession.model;

    // 构建消息列表，粗略估计 token 数量
    let messages = state.currentSession.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    // 在开头添加系统消息
    messages.unshift({ role: 'system', content: t('system.prompt') });

    // 如果启用了页面内容读取，注入当前页面文本
    if (state.pageContextEnabled) {
      const pageText = await readPageContent();
      if (pageText) {
        messages.splice(1, 0, {
          role: 'system',
          content: `[Current page content]\n${pageText}`,
        });
      }
    }

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
    let rafId = null;
    const throttledUpdate = (fullContent) => {
      accumulatedContent = fullContent;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
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

    // 取消并刷新最后一次 rAF（防止回调在 renderMessages 后触发导致重复）
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      updateStreamingMessage(accumulatedContent);
    }

    // 流式完成
    aiMsg.content = accumulatedContent;
    state.currentSession.updatedAt = Date.now();
    await Storage.saveSession(state.currentSession);
    resetStreamingState();

    // 最终渲染（带代码高亮）
    renderMessages();
  } catch (err) {
    if (err.name === 'AbortError') {
      aiMsg.content = `**[${t('error.cancelled')}]**`;
    } else {
      aiMsg.content = `**${t('error.networkError')}**: ${err.message}`;
    }

    state.currentSession.updatedAt = Date.now();
    await Storage.saveSession(state.currentSession);
    resetStreamingState();
    renderMessages();
  }

  state.isStreaming = false;
  state.abortController = null;
  el.sendBtn.disabled = !el.input.value.trim();
}

// ============= Streaming UI Helpers =============

/** 当前正在流式刷新的消息 DOM 元素引用 */
let _streamingEl = null;

/** 创建或返回流式消息元素，在消息列表末尾插入一个真实的 assistant 结构 */
function ensureStreamingElement() {
  if (_streamingEl && document.contains(_streamingEl)) {
    return _streamingEl;
  }
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.innerHTML = '<div class="message-avatar">🤖</div><div class="message-content"></div>';
  el.messages.appendChild(div);
  _streamingEl = div;
  scrollToBottom();
  return div;
}

/** 显示打字动画（替换 loading indicator） */
function showTypingIndicator() {
  const el_ = ensureStreamingElement();
  el_.querySelector('.message-content').innerHTML =
    '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  scrollToBottom();
}

/** 更新流式消息内容 */
function updateStreamingMessage(content) {
  const el_ = ensureStreamingElement();
  const contentEl = el_.querySelector('.message-content');
  if (!contentEl) return;
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

/** 清除流式状态 */
function resetStreamingState() {
  _streamingEl = null;
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

// ============= Page Context =============
/**
 * 读取当前标签页的文本内容
 * @returns {Promise<string>} 页面文本内容（截断至 8000 字符）
 */
async function readPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id) return '';

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // 尝试取 article / main 区域的内容，fallback 到 body
        const main = document.querySelector('article') ||
                     document.querySelector('main') ||
                     document.querySelector('[role="main"]');
        const source = main || document.body;
        return source ? source.innerText || source.textContent || '' : '';
      },
    });

    let text = '';
    if (results?.[0]?.result) {
      text = results[0].result;
    }

    // 清理空白、截断
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 30000) {
      text = text.slice(0, 30000) + '...';
    }
    return text;
  } catch {
    return '';
  }
}

/**
 * 更新页面读取按钮的外观
 */
function updatePageContextBtn() {
  const btn = el.pageContextBtn;
  if (!btn) return;
  if (state.pageContextEnabled) {
    btn.classList.add('active');
    btn.dataset.i18nTitle = 'chat.pageContextOn';
    btn.title = t('chat.pageContextOn');
  } else {
    btn.classList.remove('active');
    btn.dataset.i18nTitle = 'chat.pageContextOff';
    btn.title = t('chat.pageContextOff');
  }
}

// ============= Event Bindings =============
function bindEvents() {
  // ---- Settings ----
  el.providerSelect.addEventListener('change', () => {
    const oldProvider = state.settings.provider;
    const newProvider = el.providerSelect.value;

    // 保存旧自定义服务商的元数据（名称、Base URL）
    if (isCustomProvider(oldProvider)) {
      const customProviders = state.settings.customProviders || {};
      const cp = customProviders[getCustomProviderId(oldProvider)];
      if (cp) {
        cp.name = el.customProviderNameInput.value.trim() || t('settings.customProvider');
        cp.baseURL = el.baseURLInput.value.trim();
      }
    }

    // 将当前 Key / 模型 / 模型列表保存到旧服务商独立池中
    const apiKeys = state.settings.apiKeys || {};
    apiKeys[oldProvider] = el.apiKeyInput.value;

    const savedModels = state.settings.savedModels || {};
    savedModels[oldProvider] = el.modelSelect.value;

    const savedModelLists = state.settings.savedModelLists || {};
    savedModelLists[oldProvider] = state.settings._models || [];

    // 切换当前激活服务商
    state.settings.provider = newProvider;
    state.settings.apiKeys = apiKeys;
    state.settings.savedModels = savedModels;
    state.settings.savedModelLists = savedModelLists;
    state.settings.baseURL = getProviderBaseURL(newProvider);
    state.settings.apiKey = apiKeys[newProvider] || '';
    state.settings._models = savedModelLists[newProvider] || [];
    state.settings.model = savedModels[newProvider] || '';

    // 自定义服务商：显示/隐藏名称输入与删除按钮
    const isCustom = isCustomProvider(newProvider);
    el.customProviderNameGroup.classList.toggle('hidden', !isCustom);
    el.customProviderActions.classList.toggle('hidden', !isCustom);
    if (isCustom) {
      const cp = getCustomProvider(newProvider);
      el.customProviderNameInput.value = cp?.name || '';
    }

    updateBaseURLInput();

    // 加载新服务商独立保存的 Key
    el.apiKeyInput.value = apiKeys[newProvider] || '';

    // 加载新服务商的模型下拉
    const newSavedModel = savedModels[newProvider] || '';
    const providerModels = state.settings._models;

    if (providerModels.length > 0) {
      // 有模型列表：保留完整列表，选中已保存的模型
      el.modelSelect.innerHTML =
        `<option value="">${t('settings.selectModel')}</option>` +
        providerModels
          .map((m) => `<option value="${m.id || m}">${m.id || m}</option>`)
          .join('');
      if (newSavedModel) el.modelSelect.value = newSavedModel;
    } else if (newSavedModel) {
      // 只有已保存的模型名，没有列表
      el.modelSelect.innerHTML =
        `<option value="">${t('settings.selectModel')}</option>` +
        `<option value="${newSavedModel}">${newSavedModel}</option>`;
      el.modelSelect.value = newSavedModel;
    } else {
      // 没有任何记录
      el.modelSelect.innerHTML = `<option value="">${t('settings.fetchModelsFirst')}</option>`;
    }
  });

  // ---- Custom Provider Management ----
  el.addCustomProviderBtn.addEventListener('click', () => {
    const currentProvider = state.settings.provider;

    // 如果当前是自定义服务商，先保存其名称与 Base URL
    if (isCustomProvider(currentProvider)) {
      const customProviders = state.settings.customProviders || {};
      const cp = customProviders[getCustomProviderId(currentProvider)];
      if (cp) {
        cp.name = el.customProviderNameInput.value.trim() || t('settings.customProvider');
        cp.baseURL = el.baseURLInput.value.trim();
      }
    }

    // 保存当前服务商状态
    const apiKeys = state.settings.apiKeys || {};
    apiKeys[currentProvider] = el.apiKeyInput.value;
    const savedModels = state.settings.savedModels || {};
    savedModels[currentProvider] = el.modelSelect.value;
    const savedModelLists = state.settings.savedModelLists || {};
    savedModelLists[currentProvider] = state.settings._models || [];

    // 创建新的自定义服务商
    const id = Storage.generateId();
    const newProvider = `custom:${id}`;
    const customProviders = state.settings.customProviders || {};
    customProviders[id] = {
      id,
      name: `${t('settings.customProvider')} ${Object.keys(customProviders).length + 1}`,
      baseURL: '',
    };

    state.settings.provider = newProvider;
    state.settings.customProviders = customProviders;
    state.settings.apiKeys = apiKeys;
    state.settings.savedModels = savedModels;
    state.settings.savedModelLists = savedModelLists;
    state.settings.baseURL = '';
    state.settings.apiKey = '';
    state.settings.model = '';
    state.settings._models = [];

    renderSettingsForm();
  });

  el.deleteCustomProviderBtn.addEventListener('click', () => {
    const provider = state.settings.provider;
    if (!isCustomProvider(provider)) return;

    if (!confirm(t('toast.deleteCustomProviderConfirm'))) return;

    const id = getCustomProviderId(provider);
    const customProviders = { ...(state.settings.customProviders || {}) };
    delete customProviders[id];

    const apiKeys = { ...(state.settings.apiKeys || {}) };
    delete apiKeys[provider];
    const savedModels = { ...(state.settings.savedModels || {}) };
    delete savedModels[provider];
    const savedModelLists = { ...(state.settings.savedModelLists || {}) };
    delete savedModelLists[provider];

    // 切换到第一个可用服务商
    const firstPreset = Object.keys(PROVIDERS)[0];
    const firstCustom = Object.keys(customProviders)[0];
    const newProvider = firstCustom ? `custom:${firstCustom}` : firstPreset;

    state.settings.provider = newProvider;
    state.settings.customProviders = customProviders;
    state.settings.apiKeys = apiKeys;
    state.settings.savedModels = savedModels;
    state.settings.savedModelLists = savedModelLists;
    state.settings.baseURL = getProviderBaseURL(newProvider);
    state.settings.apiKey = apiKeys[newProvider] || '';
    state.settings.model = savedModels[newProvider] || '';
    state.settings._models = savedModelLists[newProvider] || [];

    renderSettingsForm();
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

    // 更新自定义服务商元数据
    const customProviders = { ...(state.settings.customProviders || {}) };
    if (isCustomProvider(provider)) {
      const id = getCustomProviderId(provider);
      customProviders[id] = {
        id,
        name: el.customProviderNameInput.value.trim() || t('settings.customProvider'),
        baseURL,
      };
    }

    state.settings = {
      provider,
      baseURL,
      apiKey,
      model,
      language,
      customBaseURL: '',
      pageContextEnabled: state.settings.pageContextEnabled || false,
      _models: state.settings._models || [],
      apiKeys: {
        ...(state.settings.apiKeys || {}),
        [provider]: apiKey,
      },
      savedModels: {
        ...(state.settings.savedModels || {}),
        [provider]: model,
      },
      savedModelLists: {
        ...(state.settings.savedModelLists || {}),
        [provider]: state.settings._models || [],
      },
      customProviders,
    };

    await Storage.saveSettings(state.settings);
    hideSettingsPanel();
    updateModelIndicator();
    showToast(t('toast.saveSuccess'), 'success');

    // 同步更新当前会话的模型与服务商
    if (state.currentSession) {
      state.currentSession.model = model;
      state.currentSession.provider = provider;
      state.currentSession.updatedAt = Date.now();
      await Storage.saveSession(state.currentSession);
      renderMessages();
      renderSessions();
    }

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
    // 更新页面读取按钮
    updatePageContextBtn();
  });

  // ---- Chat ----
  el.sendBtn.addEventListener('click', handleSend);

  el.pageContextBtn?.addEventListener('click', async () => {
    state.pageContextEnabled = !state.pageContextEnabled;
    updatePageContextBtn();
    // 持久化到设置
    state.settings.pageContextEnabled = state.pageContextEnabled;
    await Storage.saveSettings(state.settings);
  });

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

  // 应用语言设置（迁移前设置，保证默认名称使用当前语言）
  setLanguage(state.settings.language || 'zh');

  // 迁移旧版单个 custom 服务商
  const needsMigration =
    state.settings.provider === 'custom' ||
    state.settings.customBaseURL ||
    state.settings.apiKeys?.custom;
  state.settings = migrateLegacyCustomProvider(state.settings);
  if (state.settings.provider === 'custom') {
    state.settings.provider = Object.keys(PROVIDERS)[0];
  }

  // 同步当前激活服务商的运行时值
  const provider = state.settings.provider;
  state.settings.baseURL = getProviderBaseURL(provider);
  state.settings.apiKey = getProviderAPIKey(provider);
  state.settings.model = getProviderModel(provider);
  state.settings._models = getProviderModelList(provider);
  state.pageContextEnabled = state.settings.pageContextEnabled || false;

  // 如果发生过迁移，持久化
  if (needsMigration) {
    await Storage.saveSettings(state.settings);
  }

  applyLanguage();
  el.input.placeholder = t('chat.placeholder');
  el.apiKeyInput.placeholder = t('settings.apiKeyPH');
  updatePageContextBtn();

  // 检查是否已配置
  if (!state.settings.apiKey || !state.settings.model) {
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
