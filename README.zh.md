# WebChat AI

一个 Chrome 侧栏 AI 对话插件。支持 OpenAI 兼容格式的 API，内置多个预设服务商，支持会话管理、Markdown 渲染和流式输出。

## 功能

- 🤖 **多服务商** — OpenAI、Anthropic、Gemini、DeepSeek、DashScope、MiniMax、BigModel、自定义
- 🔄 **一键切换** — 自由切换服务商，每个独立保存 API Key 和模型选择
- 💬 **会话管理** — 新建、切换、删除对话
- ⚡ **流式输出** — 实时 SSE 流式响应，带打字动画
- 📝 **Markdown 渲染** — 完整 GFM 支持，代码语法高亮 + 一键复制
- 🌐 **中英双语** — 支持中文和英文界面，设置中一键切换
- 🔒 **隐私优先** — 所有数据存储在本地 `chrome.storage.local`，无需中转服务器
- 🎨 **深色主题** — 护眼暗色设计

## 快速开始

1. 打开 `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展** → 选择 `webchat-chrome` 目录
4. 点击扩展图标 → 侧栏打开
5. 选择服务商 → 填入 API Key → 获取模型列表 → 保存
6. 开始对话！

## 服务商速查

| 服务商 | Base URL |
|--------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| DeepSeek | `https://api.deepseek.com/v1` |
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| MiniMax | `https://api.minimaxi.com/v1` |
| BigModel | `https://open.bigmodel.cn/api/paas/v4` |
| 自定义 | 用户手动填写 |

## 项目结构

```
webchat-chrome/
├── manifest.json              # Manifest V3 声明
├── background.js              # Service Worker
├── sidepanel.html             # 侧栏 HTML 入口
├── sidepanel.js               # 主控制器
├── styles.css                 # 深色主题样式
├── api.js                     # OpenAI 格式 API 客户端 + SSE 流式解析
├── storage.js                 # chrome.storage.local 封装层
├── renderer.js                # Markdown 渲染 + 代码高亮
├── i18n.js                    # 中英双语字符串和 t() 函数
└── icons/                     # 应用图标
```

## 开发

无需任何构建工具。克隆仓库后直接以解压扩展加载。

```bash
git clone https://github.com/dunegym/webchat-chrome.git
```

## 许可

MIT
