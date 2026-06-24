# WebChat AI

A Chrome side panel AI chat extension. Supports OpenAI-compatible APIs with multiple preset providers, session management, Markdown rendering, and streaming output.

## Features

- 🤖 **Multi-Provider** — OpenAI, Anthropic, Gemini, DeepSeek, DashScope, MiniMax, BigModel, Custom
- 🔄 **One-Click Switch** — Switch providers freely, each with independent API key and model persistence
- 💬 **Session Management** — Create, switch, and delete conversations
- ⚡ **Streaming Output** — Real-time SSE streaming with typing animation
- 📝 **Markdown Rendering** — Full GFM support with syntax highlighting and copy button
- 🌐 **Bilingual UI** — Chinese and English supported, switchable in settings
- 🔒 **Privacy First** — All data stored locally via `chrome.storage.local`, no server relay
- 🎨 **Dark Theme** — Eye-friendly dark design

## Quick Start

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `webchat-chrome` directory
4. Click the extension icon → side panel opens
5. Choose a provider → enter API Key → fetch model list → save
6. Start chatting!

## Provider Quick Reference

| Provider | Base URL |
|----------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| DeepSeek | `https://api.deepseek.com/v1` |
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| MiniMax | `https://api.minimaxi.com/v1` |
| BigModel | `https://open.bigmodel.cn/api/paas/v4` |
| Custom | User-defined |

## Project Structure

```
webchat-chrome/
├── manifest.json              # Manifest V3
├── background.js              # Service Worker
├── sidepanel.html             # Side panel HTML
├── sidepanel.js               # Main controller
├── styles.css                 # Stylesheet (dark theme)
├── api.js                     # OpenAI-format API client with SSE
├── storage.js                 # chrome.storage.local wrapper
├── renderer.js                # Markdown rendering + code highlight
├── i18n.js                   # Bilingual strings and t() function
└── icons/                     # Application icons
```

## Development

Zero build tools required. Clone the repo and load as an unpacked extension.

```bash
git clone https://github.com/dunegym/webchat-chrome.git
```

## License

MIT
