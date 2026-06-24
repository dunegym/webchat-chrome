// ============= API Client =============
// OpenAI 兼容格式的 API 客户端，支持 SSE 流式解析

const API = {
  /**
   * 获取模型列表
   * @param {string} baseURL - API Base URL
   * @param {string} apiKey  - API Key
   * @returns {Promise<Array<{id: string}>>}
   */
  async fetchModelList(baseURL, apiKey) {
    const url = baseURL.replace(/\/+$/, '') + '/models';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err.error?.message || message;
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    const data = await response.json();
    return data.data || [];
  },

  /**
   * 流式聊天补全
   * @param {Object} opts
   * @param {string}   opts.baseURL   - API Base URL
   * @param {string}   opts.apiKey    - API Key
   * @param {string}   opts.model     - 模型 ID
   * @param {Array}    opts.messages  - 消息数组 [{role, content}]
   * @param {Function} opts.onChunk   - 每收到一个 chunk 的回调 (text, fullText)
   * @param {AbortSignal} [opts.signal] - 取消信号
   * @returns {Promise<string>} 完整响应文本
   */
  async chatCompletion({ baseURL, apiKey, model, messages, onChunk, signal }) {
    const url = baseURL.replace(/\/+$/, '') + '/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err.error?.message || message;
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE
      const lines = buffer.split('\n');
      // 保留最后一个不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content || '';
          if (content) {
            fullContent += content;
            onChunk?.(content, fullContent);
          }
        } catch {
          // 解析错误时跳过该 chunk
        }
      }
    }

    return fullContent;
  },
};
