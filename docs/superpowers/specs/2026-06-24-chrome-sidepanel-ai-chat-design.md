# Chrome 侧栏 AI 对话插件 - 设计文档

## 概述

一个 Chrome 浏览器侧栏扩展，提供与多种 AI 模型的对话界面。支持 OpenAI 兼容格式的 API，预设多个主流服务商，用户在侧栏中即可完成与 AI 的对话，无需离开当前页面。

## 目标

- 在 Chrome 侧栏中提供流畅的 AI 对话体验
- 支持多个 AI 服务商一键切换
- 支持自定义 API Base URL
- 自动获取模型列表
- 支持多轮对话、Markdown 渲染、流式输出

## 技术方案

**选型：Vanilla JS（无构建步骤）**

- Manifest V3
- 零构建工具，零 npm 依赖
- 第三方库以本地文件引入：marked.js、highlight.js
- 数据存储使用 chrome.storage.local

## 目录结构

```
webchat-chrome/
├── manifest.json              # Manifest V3 声明
├── background.js              # Service Worker，负责侧栏创建与消息中转
├── sidepanel.html             # 侧栏 HTML 入口
├── sidepanel.js               # 主逻辑：UI 控制、事件绑定
├── styles.css                 # 全部样式
├── api.js                     # OpenAI 格式 API 客户端，SSE 流式解析
├── storage.js                 # chrome.storage.local 封装层
├── renderer.js                # Markdown + 代码高亮渲染
├── i18n.js                    # 多语言/常量定义
├── lib/
│   ├── marked.min.js          # Markdown 解析
│   └── highlight.min.js       # 代码语法高亮
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 预设服务商

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

## 核心模块设计

### 1. API 客户端 (`api.js`)

- `fetchModelList(baseURL, apiKey)` → `Promise<Model[]>`
  - 调用 `GET {baseURL}/models`，返回模型 ID 列表
- `chatCompletion(baseURL, apiKey, model, messages, onChunk)` → `Promise<string>`
  - 调用 `POST {baseURL}/chat/completions`
  - `stream: true`，SSE 逐块解析
  - `onChunk(text)` 回调实现逐字流式渲染
  - 返回完整文本用于持久化

**错误处理：**
- HTTP 4xx：Key 无效 / 配额不足 → 显示具体错误提示
- 网络错误：断网 / 超时 → 显示重试按钮
- SSE 解析异常：容错，显示已收到的部分

### 2. 存储层 (`storage.js`)

```
chrome.storage.local schema:
{
  settings: {
    provider: string,          // 当前选中服务商 key
    baseURL: string,           // 当前 base URL
    apiKey: string,            // 已保存的 API Key
    model: string,             // 当前选中模型 ID
    customBaseURL: string,     // 用户自定义 URL（仅 provider='custom' 时使用）
  },
  sessions: [
    {
      id: string,              // uuid
      title: string,           // 自动生成：第一条消息前20字
      messages: [
        { role: "user" | "assistant", content: string, timestamp: number }
      ],
      createdAt: number,
      updatedAt: number,
      model: string,           // 该对话使用的模型
      provider: string,        // 该对话使用的服务商
    }
  ],
  currentSessionId: string | null
}
```

### 3. 界面布局

**主布局：** 会话列表（左）+ 聊天区域（右），适合宽侧栏；窄屏时会话列表可折叠 / 覆盖显示。

**聊天区域（从上到下）：**
1. 顶栏：服务商+模型指示器 | 设置按钮（⚙️）| 新建对话（＋）
2. 消息列表：滚动到底部自动跟随；新消息自动滚动
3. 输入区域：多行文本框（自适应高度） + 发送按钮

**设置面板（弹出层）：**
- 服务商下拉（7 预设 + 自定义）
- Base URL 输入框（预设自动填入、允许修改；自定义模式完全可编辑）
- API Key 输入框（password 类型，本地保存）
- [获取模型列表] 按钮 / 自动触发
- 模型下拉（获取后填充）
- [保存] 按钮

### 4. 消息渲染 (`renderer.js`)

- 用户消息：纯文本
- AI 消息：marked.parse(content) 渲染为 HTML
- 使用 highlight.js 对代码块进行语法高亮
- 代码块右上角添加 [复制] 按钮
- 流式输出时：对已接收部分不断重新渲染

### 5. 流式输出体验

- 收到第一个 `data: [DONE]` 前显示加载指示器（打字动画）
- 每收到一个 `data: {...}` 块，提取 `choices[0].delta.content`，追加到当前 AI 消息缓冲区
- 缓冲区内容经过 Markdown 渲染后插入 DOM
- 滚动自动跟随到底部
- 渲染节流：如果内容更新太快，使用 requestAnimationFrame 控制 DOM 写入频率

### 6. 背景脚本 (`background.js`)

- `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
- 监听扩展图标点击，打开侧栏
- 负责管理侧栏生命周期

### 7. 权限声明

manifest.json 需要的权限：
- `sidePanel` — 侧栏功能
- `storage` — 本地存储对话和设置
- `host_permissions` — 预设的所有 API 域名，允许用户添加自定义域名

## 用户交互流程

```
1. 用户首次安装 → 点击扩展图标 → 侧栏打开
2. 侧栏显示设置引导界面（未配置时）
3. 用户选择服务商 → Base URL 自动填充
4. 用户填入 API Key → 自动/手动获取模型列表
5. 用户选择模型 → 保存设置
6. 进入对话界面 → 输入消息 → 回车发送
7. 流式响应逐字显示 → 完成后可继续对话
8. 可随时：新建对话 / 切换历史对话 / 修改设置
```

## 边界情况与错误处理

| 场景 | 处理方式 |
|------|---------|
| API Key 无效 | 401 时弹出错误提示，引导到设置页 |
| 网络断开 | 显示网络错误 + [重试] 按钮 |
| 模型列表为空 | 提示模型列表获取失败，允许手动输入模型 ID |
| 上下文过长 | 前端按 token 粗略估算，超出时自动截断早期消息 |
| 空输入 | 禁止发送 |
| 流式中断 | 保留已收到内容，显示 [继续/重试] 按钮 |
| 多个标签页 | 使用 chrome.storage.onChanged 同步状态 |
