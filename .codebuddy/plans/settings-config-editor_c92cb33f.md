---
name: settings-config-editor
overview: 在 Settings 页面新增"主配置文件"和"Geosite 配置"两个标签页，使用 CodeMirror 6 编辑器实现配置文件在线编辑，带 smartdns.conf 语法高亮，先用 mock 数据。
design:
  architecture:
    framework: react
    component: mui
  styleKeywords:
    - Material Design
    - Dark Mode
    - Code Editor
    - Clean
  fontSystem:
    fontFamily: JetBrains Mono, Roboto Mono, monospace
    heading:
      size: 20px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#1976D2"
      - "#42A5F5"
    background:
      - "#1E1E1E"
      - "#FFFFFF"
      - "#F5F5F5"
    text:
      - "#D4D4D4"
      - "#212121"
    functional:
      - "#4CAF50"
      - "#F44336"
      - "#FF9800"
todos:
  - id: install-codemirror
    content: 安装 @uiw/react-codemirror 及 @codemirror/language 等依赖
    status: completed
  - id: create-smartdns-lang
    content: 创建 smartdns.ts 自定义语言模式，定义关键字、注释、字符串高亮规则
    status: completed
    dependencies:
      - install-codemirror
  - id: create-config-editor
    content: 创建 config-editor.tsx 通用编辑器组件，支持 dark/light 主题切换
    status: completed
    dependencies:
      - install-codemirror
      - create-smartdns-lang
  - id: create-mock-data
    content: 创建 config-data.ts mock 数据文件，包含 smartdns.conf 和 geosite 文件列表及内容
    status: completed
  - id: create-main-config-panel
    content: 创建 main-config-panel.tsx 主配置编辑面板
    status: completed
    dependencies:
      - create-config-editor
      - create-mock-data
  - id: create-geosite-panel
    content: 创建 geosite-config-panel.tsx Geosite 文件列表 + 编辑面板
    status: completed
    dependencies:
      - create-config-editor
      - create-mock-data
  - id: integrate-tabs-i18n
    content: 修改 settings-tab.tsx 集成新 Tab，添加 i18n 翻译，预留后端 API 方法
    status: completed
    dependencies:
      - create-main-config-panel
      - create-geosite-panel
---

## 产品概述

在 Settings 设置页面中新增两个功能标签页："主配置文件"和"Geosite 配置"，用于在线查看和编辑 SmartDNS 服务器的配置文件。

## 核心功能

### Tab 1: 主配置文件

- 读取 `smartdns.conf` 完整内容并展示在代码编辑器中
- 支持 smartdns 配置指令关键字语法高亮
- 支持在线编辑（暂使用 mock 数据，后续对接后端 API）
- 编辑后可保存（调用后端 API，目前 mock 展示保存按钮）

### Tab 2: Geosite 配置

- 左侧/上方展示 geosite 文件列表（名称 + 来源标签：本地/远程）
- 点击文件后读取内容到右侧代码编辑器
- 支持在线编辑保存
- mock 数据包含约 8 个 geosite 数据文件（cn.list、gfw.list、openai.list 等）

### 语法高亮

- 自定义 smartdns 配置文件语言模式
- 高亮规则：指令关键字、`#` 注释、`-` 选项参数、双引号字符串、IP 地址/URL
- 关键字列表从 `smartdns.conf` 模板和 C 源码中归纳提取（约 60+ 个指令）

## 技术栈

- **代码编辑器**: CodeMirror 6 (`@uiw/react-codemirror`) — 轻量 ~200KB，React 集成好，与 Next.js `output: 'export'` 静态导出兼容
- **语法高亮**: `@codemirror/lang` + 自定义 `StreamLanguage` 定义 smartdns 语言模式
- **UI**: MUI 7 (TabContext, TabList, TabPanel, Card, Button, Select, MenuItem, Chip, Box, Stack)
- **i18n**: react-i18next (zh-CN, de-DE 翻译文件；en 使用代码字符串 fallback)
- **SSR 兼容**: 使用项目已有的 `NoSsr` 组件 (`src/components/core/no-ssr.tsx`) 包裹 CodeMirror，避免静态导出时报错

## 实现方案

### 整体架构

在现有 `settings-tab.tsx` 的 `tabs` 数组中追加两个 Tab 项，遵循现有的 `TabContext` + `TabList` + `TabPanel` 模式。每个 Tab 对应独立的 Panel 组件，内部封装各自的业务逻辑。

### CodeMirror 集成策略

- 使用 `@uiw/react-codemirror`（CodeMirror 6 的 React 封装），通过 `NoSsr` 包裹确保客户端渲染
- 编辑器主题跟随系统 dark/light 模式：通过 `useTheme()` 获取 MUI 当前模式，动态切换 `cmTheme`
- 创建通用 `ConfigEditor` 组件，接收 `content`/`onChange`/`readOnly` props，可复用于主配置和 geosite 文件编辑

### SmartDNS 语言模式

- 使用 `@codemirror/language` 的 `StreamLanguage.define()` 创建自定义语言
- Token 分类：
- **keyword**: 配置指令（server, bind, domain-rules, geosite-dat 等 ~60 个）
- **comment**: `#` 到行尾
- **string**: 双引号 `"..."`
- **variable**: `-` 开头的选项参数
- **number**: IP 地址中的数字、端口号
- 从 `smartdns.conf` 模板（459 行）中归纳的完整关键字列表，覆盖：DNS 绑定、缓存、服务器、域名规则、IP 规则、客户端规则、日志审计、插件、geosite 等所有模块

### Geosite Tab 布局

- 上方：文件选择器（`Select` 下拉 + 可选 `Chip` 标签显示来源类型）
- 下方：`ConfigEditor` 展示选中文件内容
- 切换文件时加载对应 mock 内容

### Mock 数据

- 主配置：使用 `smartdns-geosite.conf` 的完整 46 行内容作为示例（真实的活跃配置）
- Geosite 文件列表：从配置文件中的 `geosite-dat` 指令提取，约 8 个文件
- 每个 geosite 文件生成合理的 mock 内容（域名列表格式）

### 后端 API 预留（暂不调用）

在 `server.ts` 中预留接口类型和方法签名，前端组件先使用 mock 数据：

```
GET  /api/config/file?path=smartdns.conf
PUT  /api/config/file?path=smartdns.conf
GET  /api/config/geosite/list
GET  /api/config/geosite/file?name=xxx
PUT  /api/config/geosite/file?name=xxx
```

## 目录结构

```
src/
├── components/
│   ├── common/
│   │   └── config-editor.tsx              # [NEW] 通用 CodeMirror 编辑器组件
│   ├── dashboard/settings/
│   │   ├── settings-tab.tsx               # [MODIFY] 追加 2 个 Tab
│   │   ├── main-config-panel.tsx          # [NEW] 主配置编辑面板
│   │   ├── geosite-config-panel.tsx       # [NEW] Geosite 文件列表 + 编辑面板
│   │   ├── config-languages/
│   │   │   └── smartdns.ts                # [NEW] SmartDNS 语法高亮语言模式
│   │   └── ... (现有文件不变)
│   └── core/
│       └── no-ssr.tsx                     # [EXISTING] 复用 NoSsr 组件
├── lib/
│   ├── backend/server.ts                  # [MODIFY] 预留配置文件 API 方法
│   └── mock/
│       └── config-data.ts                 # [NEW] Mock 配置数据
└── public/locales/
    ├── zh-CN/translation.json             # [MODIFY] 新增配置相关翻译
    └── de-DE/translation.json             # [MODIFY] 新增配置相关翻译
```

## 实现注意事项

- **Bundle 体积**: `@uiw/react-codemirror` 约 200KB gzip，可接受。避免引入 Monaco Editor（~2MB+ web workers）
- **Tab 渲染**: MUI `TabPanel` 默认用 `display:none` 隐藏非活跃面板，所有编辑器实例都会挂载。4 个 Tab 的编辑器同时挂载不会有性能问题
- **Dark Mode**: CodeMirror 主题需与 MUI 主题同步，使用 `useMediaQuery('(prefers-color-scheme: dark)')` 和 MUI palette 判断
- **Prettier/ESLint**: `@uiw/react-codemirror` 需在 eslint.config.mjs 中确认无冲突

## 设计风格

在现有 Settings 页面的 MUI Card + Tab 布局基础上，新增两个标签页。保持与 Password/Language Tab 一致的视觉风格。

### 主配置文件 Tab

- 全宽代码编辑器，高度自适应（min 400px），带等宽字体
- 顶部工具栏：文件路径显示 + 保存按钮 + 重置按钮
- 编辑器底栏：行数/列数信息

### Geosite 配置 Tab

- 上方区域：文件选择器（MUI Select 下拉，显示文件名 + 来源 Chip 标签）
- 下方区域：与主配置相同的代码编辑器
- 文件列表项包含文件名、来源类型（本地文件/远程 URL）、数据源标签

### 代码编辑器视觉

- 使用 One Dark / One Light 主题，跟随系统暗色模式
- 行号显示，当前行高亮
- 关键字用蓝色/紫色高亮，注释灰色，字符串绿色，选项参数橙色