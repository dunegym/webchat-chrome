// ============= Renderer =============
// Markdown 渲染 + 代码高亮 + 复制按钮

// 配置 marked：启用 GFM 和换行转换
marked.setOptions({
  gfm: true,
  breaks: true,
});

const Renderer = {
  /**
   * 渲染 Markdown 内容为 HTML
   * @param {string} content - Markdown 文本
   * @returns {string} HTML 字符串
   */
  renderMarkdown(content) {
    if (!content) return '';
    try {
      return marked.parse(content);
    } catch {
      return `<p>${this._escapeHtml(content)}</p>`;
    }
  },

  /**
   * 为所有代码块执行语法高亮
   */
  highlightAll() {
    document.querySelectorAll('#messages pre code').forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch {
        // highlight 失败时跳过
      }
    });
  },

  /**
   * 为没有复制按钮的代码块添加复制按钮
   */
  addCopyButtons() {
    document.querySelectorAll('#messages pre').forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '复制';

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = pre.querySelector('code');
        const text = code ? code.textContent : pre.textContent;

        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = '已复制!';
          setTimeout(() => {
            btn.textContent = '复制';
          }, 2000);
        } catch {
          btn.textContent = '失败';
          setTimeout(() => {
            btn.textContent = '复制';
          }, 2000);
        }
      });

      pre.appendChild(btn);
    });
  },

  /**
   * HTML 转义
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
