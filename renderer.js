// ============= Renderer =============
// Markdown 渲染 + 代码高亮 + 复制按钮

// 配置 marked：启用 GFM 和换行转换
marked.setOptions({
  gfm: true,
  breaks: true,
});

const Renderer = {
  /**
   * 渲染 Markdown 内容为 HTML（支持 LaTeX 公式）
   * @param {string} content - Markdown 文本
   * @returns {string} HTML 字符串
   */
  renderMarkdown(content) {
    if (!content) return '';

    // 预处理 LaTeX 公式（用占位符替换，避免 marked 干扰）
    const { text, latexMap } = this._extractLatex(content);

    try {
      let html = marked.parse(text);

      // 将占位符替换为渲染后的 KaTeX HTML
      html = html.replace(/\x00LATEX_(\d+)\x00/g, (_, id) => {
        return latexMap[parseInt(id)] || '';
      });

      return html;
    } catch {
      return `<p>${this._escapeHtml(content)}</p>`;
    }
  },

  /**
   * 提取并渲染 LaTeX 公式，替换为不可见占位符
   * @param {string} content
   * @returns {{ text: string, latexMap: string[] }}
   */
  _extractLatex(content) {
    const latexMap = [];
    let counter = 0;
    const SCROLL_THRESHOLD = 80;
    const placeholder = (html, expr) => {
      const key = `\x00LATEX_${counter}\x00`;
      if (expr && expr.length > SCROLL_THRESHOLD) {
        latexMap[counter++] = `<div class="katex-scrollable">${html}</div>`;
      } else {
        latexMap[counter++] = html;
      }
      return key;
    };

    // 1) 块级公式 $$...$$ 或 \[...\]
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
      const trimmed = expr.trim();
      if (!trimmed) return '$$$$';
      if (typeof katex === 'undefined') return `<pre><code>$$${trimmed}$$</code></pre>`;
      try {
        return placeholder(katex.renderToString(trimmed, { displayMode: true, throwOnError: false }), trimmed);
      } catch {
        return `<pre><code>$$${trimmed}$$</code></pre>`;
      }
    });

    // 1b) 块级公式 \[...\]（反斜杠中括号）
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
      const trimmed = expr.trim();
      if (!trimmed) return '[]';
      if (typeof katex === 'undefined') return `<pre><code>${_.replace(/\\/g,'')}</code></pre>`;
      try {
        return placeholder(katex.renderToString(trimmed, { displayMode: true, throwOnError: false }), trimmed);
      } catch {
        return _.replace(/\\/g, '');
      }
    });

    // 2) 行内公式 $...$
    processed = processed.replace(/(^|[^$])\$(\S[^$\n]*?\S)\$(?!\$)/g, (match, before, expr) => {
      if (/^\d+([.,]\d+)?$/.test(expr)) return match;
      if (typeof katex === 'undefined') return before + `<code>$${expr}$</code>`;
      try {
        return before + placeholder(katex.renderToString(expr.trim(), { throwOnError: false }), expr);
      } catch {
        return match;
      }
    });

    // 2b) 行内公式 \(...\)（反斜杠圆括号）
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, expr) => {
      const trimmed = expr.trim();
      if (!trimmed) return '()';
      if (typeof katex === 'undefined') return `(${trimmed})`;
      try {
        return placeholder(katex.renderToString(trimmed, { throwOnError: false }), trimmed);
      } catch {
        return match.replace(/\\/g, '');
      }
    });

    return { text: processed, latexMap };
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
      btn.textContent = t('ui.copy');

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = pre.querySelector('code');
        const text = code ? code.textContent : pre.textContent;

        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = t('ui.copied');
          setTimeout(() => {
            btn.textContent = t('ui.copy');
          }, 2000);
        } catch {
          btn.textContent = t('ui.copyFailed');
          setTimeout(() => {
            btn.textContent = t('ui.copy');
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
