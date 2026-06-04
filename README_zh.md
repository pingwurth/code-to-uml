# Code-To-UML

<p align="center">
  <img src="logo.png" alt="Code-To-UML logo" width="180">
</p>

> 将代码转化为交互式 UML 报告，浏览 100+ 双语图表示例 — 纯浏览器渲染，零构建工具。

**[English Documentation](README.md)**

<!-- Badges -->
<p align="center">
  <a href="https://github.com/pingwurth/code-to-uml/stargazers"><img src="https://img.shields.io/github/stars/pingwurth/code-to-uml?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/pingwurth/code-to-uml/network/members"><img src="https://img.shields.io/github/forks/pingwurth/code-to-uml?style=social" alt="GitHub Forks"></a>
  <a href="https://github.com/pingwurth/code-to-uml/issues"><img src="https://img.shields.io/github/issues/pingwurth/code-to-uml" alt="GitHub Issues"></a>
  <a href="https://github.com/pingwurth/code-to-uml/pulls"><img src="https://img.shields.io/github/issues-pr/pingwurth/code-to-uml" alt="GitHub Pull Requests"></a>
  <a href="https://github.com/pingwurth/code-to-uml/graphs/contributors"><img src="https://img.shields.io/github/contributors/pingwurth/code-to-uml" alt="GitHub Contributors"></a>
  <a href="https://github.com/pingwurth/code-to-uml/blob/main/LICENSE"><img src="https://img.shields.io/github/license/pingwurth/code-to-uml" alt="License"></a>
</p>

<p align="center">
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20Code-To-UML%20-%20AI-powered%20code%20analysis%20that%20generates%20interactive%20UML%20reports!&url=https://github.com/pingwurth/code-to-uml"><img src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social" alt="Twitter"></a>
  <a href="https://github.com/pingwurth/code-to-uml/discussions"><img src="https://img.shields.io/badge/GitHub-Discussions-blue" alt="GitHub Discussions"></a>
  <a href="https://github.com/pingwurth/code-to-uml/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/Contributions-Welcome-brightgreen" alt="Contributions Welcome"></a>
</p>

<p align="center">
  <a href="#为什么选择-code-to-uml"><strong>为什么选择 Code-To-UML？</strong></a> ·
  <a href="#演示"><strong>演示</strong></a> ·
  <a href="#快速开始"><strong>快速开始</strong></a> ·
  <a href="#参与贡献"><strong>参与贡献</strong></a> ·
  <a href="#相关链接"><strong>相关链接</strong></a>
</p>

---

## 为什么选择 Code-To-UML？

> **"AI 时代，读代码的能力比写代码的能力更稀缺。"**

Code-To-UML 是这个理念的产物。它不是又一个 PlantUML 在线编辑器——它是一个让 AI 为你理解代码、画出架构图、生成双语报告的完整工具链。

### 六大核心痛点，一个解决方案

| 痛点 | 问题描述 | Code-To-UML 解决方案 |
|------|----------|---------------------|
| 🔍 **系统分析困难** | 面对复杂代码库，难以快速理解整体架构和模块关系 | 一键生成项目/模块/文件级别的架构图 |
| 📝 **设计文档创建困难** | 整理现有代码逻辑时，面对数百行方法需要逐行阅读 | 自动生成 13 个维度的分析报告，智能代码片段提取（< 30 行）|
| 🐛 **调试效率低下** | 逐行阅读代码进行故障排查效率极低 | 调用关系图快速定位问题路径，数据流图追踪状态变化 |
| 🤖 **AI 代码审查** | Vibe Coding 时代，AI 生成的代码需要更高效的审查工具 | 快速理解 AI 生成代码的结构，识别潜在的架构问题和风险 |
| 📚 **快速学习新框架** | 学习新技术栈和参与开源维护需要快速理解代码 | 开发者入门指南自动生成，核心原理和设计决策可视化 |
| 🎯 **读代码比写代码更重要** | 代码理解能力成为核心竞争力 | AI 技能集成，支持 Cursor、Claude Code 等主流 AI 工具 |

**核心价值:** 将代码转换为交互式 UML 报告，让代码理解效率提升 10 倍

---

## 演示

<p align="center">
  <img src="docs/images/demo_zh.gif" alt="Code-To-UML 演示" width="800">
</p>

---

## 核心特性

- ✅ **浏览器优先渲染** — PlantUML WASM，零服务器延迟
- ✅ **自动降级** — 客户端失败 → 服务端 plantuml.jar 自动重试
- ✅ **交互式灯箱** — 全屏查看，支持缩放、平移、键盘导航
- ✅ **侧边目录同步滚动** — 长报告始终可见导航
- ✅ **零构建工具** — 无 npm 依赖，纯 HTML/JS 直接运行
- ✅ **可复用模板** — 从结构化 `.ctu` 数据文件生成分析报告
- ✅ **AI 技能集成** — 内置 SKILL.md，AI 代理自动生成报告

---

## 目录

- [为什么选择 Code-To-UML？](#为什么选择-code-to-uml)
- [关于项目](#关于项目)
- [支持的图表类型](#支持的图表类型)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [项目结构](#项目结构)
- [API 参考](#api-参考)
- [配置](#配置)
- [架构设计](#架构设计)
- [AI 代理集成](#ai-代理集成)
- [参与贡献](#参与贡献)
- [许可证](#许可证)
- [相关链接](#相关链接)

---

## 关于项目

大多数 UML 文档工作流依赖重量级 IDE、脆弱的构建管线或不透明的 SaaS 工具。Code-To-UML 采用不同的方式：

1. **代码分析报告** — 将源代码交给 AI 代理，生成包含 UML 图表、双语解释和交互式导航的独立 HTML 报告。
2. **图表展示** — 浏览 20+ 种图表类型的 100+ 双语 PlantUML 示例，在浏览器中实时渲染。
3. **AI 代理技能** — 内置技能定义（`SKILL.md`），让 Cursor、Claude Code、Qwen、Codex 等 AI 编码助手自主生成报告。

无框架。无转译器。无 `node_modules`。打开 `demo.html` 即可使用。

---

## 支持的图表类型

| 分类 | 类型 |
|------|------|
| **UML** | 时序图、用例图、类图、对象图、活动图、组件图、部署图、状态图、时间图 |
| **非 UML** | 甘特图、思维导图、WBS、EBNF、正则表达式、网络图 (nwdiag)、JSON、YAML、Archimate、Salt (线框图) |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Node.js 轻量开发服务器（`serve.js`，约 600 行） |
| 运行时 | 原生 ES6+ JavaScript — 无框架、无 npm 依赖 |
| 客户端渲染 | PlantUML WASM（`plantuml.js`） |
| 服务端渲染 | `plantuml.jar`（Java）— 自动降级 |
| 图形布局 | Graphviz（Viz.js） |
| 数据格式 | `.ctu` 结构化文本文件 |
| 国际化 | 自定义 JS 系统，localStorage 持久化，`docs:langchange` 事件 |
| 样式 | 纯 CSS，自定义属性主题化 |

---

## 快速开始

### 前置条件

- **Node.js 18+**
- **Java**（用于服务端 PlantUML 渲染降级）

### 安装

1. 克隆仓库：

```bash
git clone https://github.com/pingwurth/code-to-uml.git
cd code-to-uml
```

2. （可选）设置 `CTU_HOME` 以支持 AI 代理集成：

```bash
node install.js
```

3. 启动服务器：

```bash
./serve.sh
# 或指定自定义端口
./serve.sh 5401
# 或直接使用 Node
node serve.js 5401
```

4. 打开浏览器：

```bash
# 访问如下 url 查看分析示例
http://localhost:5401
# 或者查看 uml 语法示例
http://localhost:5401/plantuml-official-demo/zh/sequence-diagram_zh.html
```

无需 `npm install`。无需构建步骤。就是这么简单。

---

## 使用指南

### 使用示例

在 AI 代理中使用 `/code-to-uml` 斜杠命令，可对任意粒度的代码生成 UML 驱动的 HTML 报告：

**文件级别分析**

```
/code-to-uml 请分析 component/render-failure-common.js 文件，并生成基于 UML 的、格式统一的 HTML 报告
```

**函数级别分析**

```
/code-to-uml 请分析 renderWithFailureHandling 函数，并生成基于 UML 的、格式统一的 HTML 报告
```

**工程/项目级别分析**

```
/code-to-uml 请分析 code-to-uml 工程，并生成基于 UML 的、格式统一的 HTML 报告
```

**模块级别分析**

```
/code-to-uml 请分析 component/ 模块，并生成基于 UML 的、格式统一的 HTML 报告
```

四种命令生成相同的 13 节报告结构 — 分析粒度决定内容深度和示例数量，不影响章节契约。生成的报告保存至 `cache/` 目录，可通过 `index.html` 访问。

### 交互式演示

打开 `demo.html` 浏览所有图表示例。使用标签栏切换图表类型，使用语言切换按钮在中英文之间切换。

### 生成报告

1. 将 `.ctu` 数据文件放置在 `data/s20-comprehensive/`（或自定义目录）。
2. 使用 AI 技能（参见 [AI 代理集成](#ai-代理集成)）或手动基于 `cache/_TEMPLATE.html` 创建 HTML 报告。
3. 生成的报告出现在 `cache/` 目录中，可通过 `index.html` 访问。

### .ctu 文件格式

每个 `.ctu` 文件定义一个或多个带元数据的图表示例：

```text
Title: 章节标题
Describe: 描述
------------------------------------------------------------
[Example]
示例标题

[Description]
描述该图表演示内容的 Markdown 文本

[UML]
@startuml
Alice -> Bob: 你好
Bob --> Alice: 你好呀
@enduml

[Detail]
图表元素和语法的解释
------------------------------------------------------------
```

**命名规范：** `{图表类型}--{编号}_{语言}.ctu`

示例：`sequence--1_en.ctu`、`class--3_zh.ctu`、`activity--2_en.ctu`

---

## 项目结构

```
code-to-uml/
├── serve.js                 # 开发服务器 + API 端点
├── demo.html                # 主图表查看器 SPA
├── demo.js                  # 页面控制器
├── index.html               # 首页 / 缓存索引
├── main.css                 # 所有样式
├── i18n-config.js           # 国际化运行时
├── i18n/
│   ├── zh.js                # 中文字符串
│   └── en.js                # 英文字符串
├── component/               # 可复用 UI 组件
│   ├── docs-page-core.js    # 核心页面逻辑
│   ├── render-failure-common.js  # 错误处理
│   ├── demo-example-component.js # 示例卡片渲染器
│   └── toc-component.js     # 目录组件
├── data/
│   ├── demo/                # 内置示例（.ctu 文件）
│   ├── _TEMPLATE.ctu        # 新报告模板
│   └── s20-comprehensive/   # 示例：分析报告数据
├── cache/
│   ├── _TEMPLATE.html       # 可复用报告 HTML 模板
│   └── (生成的报告)
├── js/                      # PlantUML + 主题库
├── plantuml-official-demo/  # PlantUML 官方参考文档
├── skills/code-to-uml/
│   └── SKILL.md             # AI 代理技能定义
├── CLAUDE.md                # Claude Code 指引
├── AGENTS.md                # 代理文档
└── install.js      # CTU_HOME 设置脚本
```

---

## API 参考

### `GET /api/demo-examples`

返回解析后的 `.ctu` 示例，供图表查看器使用。

| 参数 | 类型 | 说明 |
|------|------|------|
| `lang` | `en` \| `zh` | 语言过滤（默认：`en`） |

**响应：** 解析后的示例对象 JSON 数组。

### `POST /api/plantuml-svg`

服务端 PlantUML 渲染降级接口。

| 字段 | 说明 |
|------|------|
| **请求体** | 原始 PlantUML 源文本 |
| **Content-Type** | `text/plain` |
| **响应** | SVG 标记 |

---

## 配置

| 设置 | 方式 | 默认值 |
|------|------|--------|
| 服务器端口 | `PORT` 环境变量或 CLI 参数 | `5401` |
| 项目根目录 | `CTU_HOME` 环境变量（由 `install.js` 设置） | 当前工作目录 |
| 界面语言 | `localStorage` 键 `plantuml-docs-lang` | 浏览器区域设置 |
| 主题 | `main.css` 中的 CSS 自定义属性 | 亮色 |

---

## 架构设计

渲染管线采用双层策略以实现最大可靠性：

```
用户打开 demo.html
        │
        ▼
    [渲染队列]
        │
        ▼
  尝试浏览器渲染 (plantuml.js WASM)
        │
        ▼
  渲染成功? ── 是 ──▶ 显示 SVG
        │
       否
        │
        ▼
  检测错误类型
        │
        ▼
  重试服务端渲染 (POST /api/plantuml-svg)
        │
        ▼
  成功? ── 是 ──▶ 显示 SVG
        │
       否
        │
        ▼
  显示错误信息 + 恢复操作
```

核心设计决策：
- **WASM 优先** 消除了大多数图表的服务器往返延迟。
- **自动降级** 处理 WASM 有局限性的边界情况（大型图表、某些 stdlib 导入）。
- **错误分类** 实现了有针对性的重试逻辑，而非盲目重试。

---

## AI 代理集成

Code-To-UML 在 [`skills/code-to-uml/SKILL.md`](skills/code-to-uml/SKILL.md) 中附带了技能定义，使 AI 编码助手能够生成分析报告。

### 支持的代理

- Cursor（通过 Rules / AGENTS.md）
- Claude Code（通过 CLAUDE.md）
- Qwen Coder
- OpenAI Codex
- 任何支持技能/工具定义的代理

### 设置方法

1. 运行 `node install.js` 注册项目路径。
2. 将你的 AI 代理指向 `skills/code-to-uml/SKILL.md`。
3. 让代理分析代码库 — 它将生成 `.ctu` 数据文件和 HTML 报告。

---

## 参与贡献

我们欢迎社区贡献！请在提交 Pull Request 前阅读我们的[贡献指南](CONTRIBUTING.md)。

欢迎以下方向的贡献：

- **新图表示例** — 为覆盖不足的图表类型添加 `.ctu` 文件
- **本地化** — 扩展中英文之外的语言支持
- **主题变体** — 额外的 CSS 自定义属性集
- **PlantUML 标准库覆盖** — 使用 AWS、Azure、K8s 图标库的示例
- **测试** — 扩展 `test/` 中的测试套件
- **Bug 修复** — 查看我们的[开放 Issue](https://github.com/pingwurth/code-to-uml/issues)
- **文档** — 改进指南和示例

### 快速贡献链接

- 🐛 [报告 Bug](https://github.com/pingwurth/code-to-uml/issues/new?template=bug_report.md)
- 💡 [请求功能](https://github.com/pingwurth/code-to-uml/issues/new?template=feature_request.md)
- 📊 [建议图表示例](https://github.com/pingwurth/code-to-uml/issues/new?template=new_example.md)
- 💬 [加入讨论](https://github.com/pingwurth/code-to-uml/discussions)

---

## 许可证

[MIT](LICENSE)

---

## 相关链接

### 文档
- [PlantUML 官方文档](https://plantuml.com)
- [AI 技能定义](skills/code-to-uml/SKILL.md)
- [代理指引](AGENTS.md)
- [Claude Code 指引](CLAUDE.md)
- [CTU 模板](data/_TEMPLATE.ctu)
- [贡献指南](CONTRIBUTING.md)

### 社区
- [GitHub Discussions](https://github.com/pingwurth/code-to-uml/discussions) — 提问、分享想法
- [GitHub Issues](https://github.com/pingwurth/code-to-uml/issues) — 报告 Bug、请求功能
- [Pull Requests](https://github.com/pingwurth/code-to-uml/pulls) — 贡献代码

### 社交
- ⭐ [在 GitHub 上 Star](https://github.com/pingwurth/code-to-uml) — 表示支持！
- 🐦 [在 Twitter 上分享](https://twitter.com/intent/tweet?text=Check%20out%20Code-To-UML%20-%20AI-powered%20code%20analysis%20that%20generates%20interactive%20UML%20reports!&url=https://github.com/pingwurth/code-to-uml) — 传播消息
- 📖 [GitHub 个人主页](https://github.com/pingwurth) — 关注获取更新
