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
  custom: {
    name: '自定义',
    baseURL: '',
  },
};

// ============= 默认设置 =============
const DEFAULT_SETTINGS = {
  provider: 'openai',
  baseURL: PROVIDERS.openai.baseURL,
  apiKey: '',
  model: '',
  customBaseURL: '',
  apiKeys: {},     // 每个服务商独立保存的 API Key
  savedModels: {}, // 每个服务商独立保存的模型名
};
