// ============= 预设服务商 =============
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
  },
  gemini: {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
  },
  dashscope: {
    name: 'DashScope',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  minimax: {
    name: 'MiniMax',
    baseURL: 'https://api.minimaxi.com/v1',
  },
  bigmodel: {
    name: 'BigModel',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  },
};

// ============= 默认设置 =============
const DEFAULT_SETTINGS = {
  provider: 'openai',
  baseURL: PROVIDERS.openai.baseURL,
  apiKey: '',
  model: '',
  customBaseURL: '',
  language: 'zh',
  apiKeys: {},
  savedModels: {},
  savedModelLists: {},
  customProviders: {},
  pageContextEnabled: false,
};

// ============= 多语言系统 =============
const LANGUAGES = { zh: '中文', en: 'English' };

const STRINGS = {
  zh: {
    settings: {
      title: '⚙️ 设置',
      provider: '服务商',
      baseURL: 'Base URL',
      apiKey: 'API Key',
      model: '模型',
      language: '语言',
      fetchModels: '获取列表',
      save: '保存',
      cancel: '返回',
      selectModel: '-- 选择模型 --',
      fetchModelsFirst: '-- 请先获取模型列表 --',
      customBaseURLPH: '输入自定义 API Base URL',
      baseURLPH: 'API Base URL',
      apiKeyPH: 'sk-...',
      customProviderName: '服务商名称',
      addCustomProvider: '添加自定义服务商',
      deleteCustomProvider: '删除当前服务商',
      customProvider: '自定义',
      customProviderNamePH: '例如：My API',
    },
    chat: {
      welcome: '💬 开始新对话吧',
      welcomeFirst: '👋 欢迎使用 WebChat AI<br/><br/>点击 ⚙️ 配置 API 设置后开始对话',
      placeholder: '输入消息...（Enter 发送，Shift+Enter 换行）',
      send: '发送',
      newSession: '新建对话',
      settings: '设置',
      sessionsTitle: '对话历史',
      noSessions: '暂无对话',
      notConfigured: '未配置',
      newChat: '新对话',
      sessionList: '对话列表',
      close: '✕',
      modelIndicator: '{provider} / {model}',
      pageContextOn: '📄 页面已读取',
      pageContextOff: '📄 读取页面',
    },
    message: {
      userAvatar: '👤',
      aiAvatar: '🤖',
    },
    error: {
      configureFirst: '请先在设置中配置 API Key 和模型',
      fillBaseURL: '请填写 Base URL',
      fillApiKey: '请填写 API Key',
      selectModel: '请选择模型',
      inputApiKey: '请输入 API Key',
      inputBaseURL: '请输入 Base URL',
      networkError: '错误',
      fetchFailed: '获取失败',
      cancelled: '已取消',
    },
    toast: {
      saveSuccess: '✅ 设置已保存',
      fetchSuccess: '✅ 获取成功，共 {count} 个模型',
      fetchFailed: '❌ 获取失败: {msg}',
      deleteConfirm: '确定删除此对话？',
      deleteCustomProviderConfirm: '确定删除该自定义服务商？',
    },
    system: {
      prompt: 'You are a helpful assistant.',
      truncated: '(前面的部分对话因上下文过长已被截断)',
    },
    status: {
      loading: '获取中...',
      fetchModels: '获取模型列表',
      notSelected: '未选择',
    },
    ui: {
      copy: '复制',
      copied: '已复制!',
      copyFailed: '失败',
      retry: '重试',
    },
  },

  en: {
    settings: {
      title: '⚙️ Settings',
      provider: 'Provider',
      baseURL: 'Base URL',
      apiKey: 'API Key',
      model: 'Model',
      language: 'Language',
      fetchModels: 'Fetch Models',
      save: 'Save',
      cancel: 'Back',
      selectModel: '-- Select Model --',
      fetchModelsFirst: '-- Fetch models first --',
      customBaseURLPH: 'Enter custom API Base URL',
      baseURLPH: 'API Base URL',
      apiKeyPH: 'sk-...',
      customProviderName: 'Provider Name',
      addCustomProvider: 'Add Custom Provider',
      deleteCustomProvider: 'Delete Current Provider',
      customProvider: 'Custom',
      customProviderNamePH: 'e.g. My API',
    },
    chat: {
      welcome: '💬 Start a new conversation',
      welcomeFirst: '👋 Welcome to WebChat AI<br/><br/>Click ⚙️ to configure API settings',
      placeholder: 'Type a message... (Enter to send, Shift+Enter new line)',
      send: 'Send',
      newSession: 'New Chat',
      settings: 'Settings',
      sessionsTitle: 'Chat History',
      noSessions: 'No conversations yet',
      notConfigured: 'Not configured',
      newChat: 'New Chat',
      sessionList: 'Chat List',
      close: '✕',
      modelIndicator: '{provider} / {model}',
      pageContextOn: '📄 Page read',
      pageContextOff: '📄 Read page',
    },
    message: {
      userAvatar: '👤',
      aiAvatar: '🤖',
    },
    error: {
      configureFirst: 'Please configure API Key and model in settings first',
      fillBaseURL: 'Please enter Base URL',
      fillApiKey: 'Please enter API Key',
      selectModel: 'Please select a model',
      inputApiKey: 'Please enter API Key',
      inputBaseURL: 'Please enter Base URL',
      networkError: 'Error',
      fetchFailed: 'Fetch failed',
      cancelled: 'Cancelled',
    },
    toast: {
      saveSuccess: '✅ Settings saved',
      fetchSuccess: '✅ Successfully fetched {count} models',
      fetchFailed: '❌ Fetch failed: {msg}',
      deleteConfirm: 'Delete this conversation?',
      deleteCustomProviderConfirm: 'Delete this custom provider?',
    },
    system: {
      prompt: 'You are a helpful assistant.',
      truncated: '(Earlier messages truncated due to context limit)',
    },
    status: {
      loading: 'Loading...',
      fetchModels: 'Fetch Models',
      notSelected: 'Not selected',
    },
    ui: {
      copy: 'Copy',
      copied: 'Copied!',
      copyFailed: 'Failed',
      retry: 'Retry',
    },
  },
};

// ============= i18n 核心函数 =============
let _currentLang = 'zh';

function setLanguage(lang) {
  if (STRINGS[lang]) _currentLang = lang;
}

function getLanguage() {
  return _currentLang;
}

/**
 * 翻译函数，支持点号路径和参数替换
 * t('toast.fetchSuccess', { count: 10 })
 * t('chat.modelIndicator', { provider: 'OpenAI', model: 'gpt-4' })
 */
function t(path, params) {
  const keys = path.split('.');
  let val = STRINGS[_currentLang];
  for (const k of keys) {
    val = val ? val[k] : undefined;
  }
  // fallback to zh
  if (val === undefined) {
    val = STRINGS['zh'];
    for (const k of keys) {
      val = val ? val[k] : undefined;
    }
  }
  if (val === undefined) return path;
  if (params) {
    return val.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
  }
  return val;
}

/**
 * 将当前语言的文本应用到 DOM 元素
 * data-i18n → textContent
 * data-i18n-placeholder → placeholder
 * data-i18n-title → title
 */
function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const translated = t(el.dataset.i18n);
    if (translated) el.textContent = translated;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const translated = t(el.dataset.i18nPlaceholder);
    if (translated) el.placeholder = translated;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const translated = t(el.dataset.i18nTitle);
    if (translated) el.title = translated;
  });
}
