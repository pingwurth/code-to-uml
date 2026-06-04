# Code-To-UML 推广计划 — 迈向 1000 Star

> 目标：通过 16 周系统化运营，使 `github.com/pingwurth/code-to-uml` 达到 1000+ GitHub Star。

---

## 📊 项目现状分析

### 核心优势（必须打透的点）

| 优势 | 说明 |
|------|------|
| **AI 原生** | `SKILL.md` 让 Cursor / Claude Code / Qwen 等 AI 代理自动生成 UML 报告，这是最大的差异化 |
| **零依赖、浏览器优先** | 无 `node_modules`，打开即用，隐私安全，纯静态 |
| **双语设计** | 中英文双语，天然横跨两大开发者社区 |
| **WASM 优先 + 自动降级** | 客户端 WASM 渲染失败后自动服务端 `plantuml.jar` 重试 |
| **100+ 图表示例** | 20+ 图表类型的完整双语示例库 |
| **交互式灯箱** | 全屏查看、缩放、平移、键盘导航 |
| **AI 技能系统完善** | 4 份参考文档 + 验证脚本 + 13 节报告结构的完整报告契约 |
| **零构建工具** | 纯 HTML/CSS/JS，无 `npm install`，无 bundler |
| **可复用模板** | `.ctu` 数据文件 + `_TEMPLATE.html` 的可复现报告生成机制 |

### 关键短板（需优先补齐）

- ❌ **零社交存在** — 无 Twitter/X、知乎、B 站、微信公众号
- ❌ **零 SEO** — 所有 HTML 页缺少 OG / Twitter Card 元标签，分享无预览
- ❌ **无 GitHub 社区基建** — 无 Issue/PR 模板、无 CONTRIBUTING.md、未开启 Discussions
- ❌ **无视频演示** — 只有两个 GIF，没有 YouTube / B 站视频
- ❌ **无对比页** — 用户无法快速理解"为什么用你不用其他工具"
- ❌ **无 npm / Gitee 镜像** — 影响国内开发者获取
- ❌ **无 CI/CD** — 无 GitHub Actions，无自动化质量门禁
- ❌ **无贡献者指南** — 贡献门槛高

---

## 🗣️ 核心叙事（所有内容统一传达）

> **「AI 时代，读代码的能力比写代码的能力更稀缺。」**
>
> Code-To-UML 是这个理念的产物。它不是又一个 PlantUML 在线编辑器——它是一个让 AI 为你理解代码、画出架构图、生成双语报告的完整工具链。
>
> 零依赖、零安装、纯浏览器渲染、支持 Cursor / Claude Code / Qwen 等主流 AI 工具。无论是接手祖传代码、做系统分析、学新框架、还是审查 AI 生成的代码——3 分钟上手，10 分钟出报告。

### 推荐内容选题（痛点驱动）

每篇内容从一个具体痛点切入，展示产品如何解决问题：

1. **系统分析，阅读代码费劲**
   → 《接手一个 5000 星开源项目，我是如何用 AI + UML 在 2 小时内看懂全部核心逻辑的》

2. **代码太烂，一个方法几百行**
   → 《面对 300 行的祖传方法，不要一行行读——让 AI 先生成时序图再动手》

3. **问题排查低效**
   → 《记一次生产 Bug 排查：看到调用链图的那一刻，问题一目了然》

4. **Vibe Coding 时代的代码审查**
   → 《Cursor 写了一坨代码给我？用 Code-To-UML 做代码审查的类图验证》

5. **快速学习新框架**
   → 《一周上手一个新框架：我的秘诀是先让 AI 画架构图》

6. **AI 时代读代码比写代码更重要**
   → 《AI 写代码越来越强，但能读懂代码的人越来越少——这个工具正好相反》

---

## 📋 执行计划（5 个阶段）

### 阶段 0：产品打磨 + 分享基建（第 1-2 周）

| 任务 | 具体动作 | 优先级 |
|------|---------|--------|
| **GitHub 社交 Badge** | 添加 Star / Fork / 贡献者 / 许可证 badge | P0 |
| **SEO 元标签** | 给所有 HTML 页面添加 Open Graph + Twitter Card meta | P0 |
| **CONTRIBUTING.md** | 编写贡献指南 | P0 |
| **GitHub 模板** | 创建 Issue（Feature request / Bug report / New example）+ PR 模板 | P0 |
| **开启 Discussions** | 在 GitHub 仓库设置中开启 Discussions 功能 | P0 |
| **设置 Social Preview** | 为仓库设置精美的 social preview 图片 | P0 |
| **Gitee 镜像** | 同步到 gitee.com，降低国内开发者访问门槛 | P1 |
| **修复小缺陷** | 检查并修复明显的 UI/UX 问题（如 dark mode 缺失、响应式问题等） | P1 |
| **README 优化** | 顶部增加 star history 图和"为何选择"对比表格 | P1 |

### 阶段 1：内容营销 — 痛点驱动（第 2-5 周）

#### 中文平台

| 平台 | 内容类型 | 发布频率 | 目标效果 |
|------|---------|---------|---------|
| **知乎** | 深度技术文章（3000-5000 字） | 共 2-3 篇 | 每篇 5000+ 阅读，知乎推荐 |
| **掘金** | 教程类文章 | 共 2 篇 | 首页推荐，点赞 100+ |
| **V2EX** | 社区分享帖 | 1 次 | 300+ 回复热度 |
| **OSChina** | 项目入驻 + 推荐文章 | 1 次 | 开源中国首页推荐 |
| **SegmentFault** | 技术分享 | 1 篇 | 首页推荐 |
| **微信公众号** | 技术专栏投稿（如"奇舞周刊""前端早读课"等） | 2-3 次 | 精准前端开发者触达 |
| **程序员小红书** | 短图文教程 | 3-5 篇 | 泛开发者圈层破圈 |

#### 英文平台

| 平台 | 内容类型 | 发布频率 |
|------|---------|---------|
| **Hacker News** | Show HN | 1 次（最佳时机：美东早 8-9 点） |
| **Reddit** | r/programming、r/plantuml、r/selfhosted、r/coolgithubprojects | 每两周 1 帖 |
| **Twitter/X** | 日常分享截图 + 短视频 + 使用技巧 | 每周 2-3 条 |
| **Dev.to** | 教程文章 | 2 篇 |
| **Medium** | 技术博客 | 2 篇 |

### 阶段 2：视频 + 视觉营销（第 3-6 周）

| 任务 | 说明 | 平台 |
|------|------|------|
| **英文 Screencast** | 3-5 分钟：从 clone 到 AI 生成报告全过程 | YouTube |
| **中文教程视频** | 3-5 分钟：现场演示，中文解说 | B 站 |
| **短视频系列** | 30-60 秒：展示单点功能（如"3 秒看懂一个函数调用链"） | 抖音 / 小红书 / Twitter |
| **高质量截图** | 制作 lightbox 效果图、before/after 对比图 | 所有平台 |
| **产品 Demo 动图** | 制作更清晰、更精美的 GIF 动图 | GitHub README |
| **GitHub Social Preview** | 设计仓库的社交分享大图（1280×640px） | GitHub |

### 阶段 3：社区 + 生态建设（第 4-10 周）

| 任务 | 具体动作 |
|------|---------|
| **Reddit 深耕** | 在社区持续参与讨论，自然插入项目链接，避免纯广告 |
| **Product Hunt 准备** | 准备 PH 发布页面：精美 GIF 首图、详细说明、准备回复评论、邀请朋友提前排队 |
| **Newsletter 投稿** | Awesome JavaScript Weekly / Python Weekly / AI Toolkit / Open Source Weekly |
| **工具类网站收录** | awesome-plantuml / awesome-ai-tools / static-site-generator-list |
| **KOL 合作** | 联系 2-3 位技术 KOL（中英文各一半），提供现成 demo 素材请他们试用转发 |
| **GitHub 每日互动** | 每天 15 分钟回复 Issues 和 Discussions，对优质反馈打赏/感谢标签 |
| **用户案例征集** | 鼓励用户把 UML 报告截图发 Discussions，评选"最美报告" |
| **Star 里程碑激励** | 每到一个里程碑（100/300/500/1000）发 release notes + 感谢贡献者 |

### 阶段 4：Launch 冲刺（第 8-12 周）

集中力量做几个大渠道的发布：

| 渠道 | 策略 | 时间 |
|------|------|------|
| **Product Hunt** | 精美的 GIF 首图、详细的说明、准备回复评论、邀请朋友 upvote。选择周二/周四早间（美东）发布 | 第 8-9 周 |
| **Hacker News Show HN** | 简短有力的介绍 + demo link。美东早 8-9 点提交 | 第 9-10 周 |
| **Reddit r/programming** | "I built an open-source tool that lets AI agents auto-generate UML reports from code – zero npm, zero build" | 第 8-9 周 |
| **知乎圆桌/话题** | 在"开源项目推荐""有哪些提升开发效率的神器"等问题下回答 | 第 8-10 周 |
| **微信群/TG 群** | 在开发者社群中自然分享（非广告式），邀请试用 | 持续 |

### 阶段 5：增长飞轮 + 持续运营（第 12 周起）

| 策略 | 说明 |
|------|------|
| **功能迭代即营销** | 每次发版（dark mode、PDF 导出、更多 AI agent 集成）都是新的宣传点 |
| **Star 历史图** | README 中加入 star history 图表（stars.timeline.app），展示增长曲线，形成社交证明 |
| **月报/周刊** | 每月一份项目更新 Newsletter |
| **内容持续产出** | 每月 1-2 篇技术文章 + 1 个短视频 |
| **用户案例墙** | 在 README 底部展示用户生成的代表性报告（经授权的） |
| **自动化发布** | 配置 GitHub Release + 发布通知流程 |

---

## 📅 时间线甘特图

```
阶段 \ 周   1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
───────────────────────────────────────────────────────────
P0 打磨基建  ██ ██
P1 内容营销      ██ ██ ██ ██
P2 视频视觉         ██ ██ ██ ██
P3 社区建设            ██ ██ ██ ██ ██ ██
P4 Launch冲刺                  ██ ██ ██ ██
P5 持续运营                              ██ ██ ██ ██ ██
```

---

## 📈 关键指标追踪

| 指标 | 当前 | 第 4 周目标 | 第 8 周目标 | 第 12 周目标 | 第 16 周目标 |
|------|------|:----------:|:----------:|:----------:|:----------:|
| **GitHub Stars** | — | 100 | 300 | 600 | **1000** |
| **知乎文章阅读量** | 0 | 10,000 | 50,000 | 100,000 | 200,000+ |
| **掘金/中文文章** | 0 | 2 篇 | 5 篇 | 8 篇 | 12 篇+ |
| **英文文章** | 0 | 1 篇 | 4 篇 | 8 篇 | 12 篇+ |
| **视频播放（B 站+YouTube）** | 0 | 500 | 5,000 | 15,000 | 30,000+ |
| **PR 数量** | 0 | 3 | 10 | 20 | 30+ |
| **贡献者人数** | 0 | 2 | 8 | 15 | 20+ |
| **Discussions 帖子** | 0 | 10 | 50 | 120 | 200+ |
| **Forks** | — | 20 | 60 | 150 | 250+ |

---

## 🛠️ 内容创作清单（开箱即用）

### 中文方向

- [ ] **知乎文章 1**：《接手一个 5000 星开源项目，我是如何用 AI + UML 在 2 小时内看懂全部核心逻辑的》
- [ ] **知乎文章 2**：《面对 300 行的祖传方法，不要一行行读——让 AI 先生成时序图再动手》
- [ ] **知乎文章 3**：《AI 写代码越来越强，但能读懂代码的人越来越少》
- [ ] **掘金教程 1**：《零依赖、零配置：3 分钟搭建你的 PlantUML 交互式文档站》
- [ ] **掘金教程 2**：《Cursor + Code-To-UML：让 AI 为自己的代码生成架构图》
- [ ] **V2EX 分享帖**：《分享一个让 AI 自动生成 UML 分析报告的开源工具》
- [ ] **OSChina 项目入驻**
- [ ] **B 站视频 1**：《千万别一行行读代码了！让 AI 把代码变成 UML 图》
- [ ] **B 站视频 2**：《3 分钟入门 Code-To-UML：AI 代码分析 + UML 图生成》

### 英文方向

- [ ] **Show HN**：《Show HN: Code-To-UML – AI-powered code analysis to UML in your browser》
- [ ] **Reddit r/programming**：《I built an open-source tool that lets AI agents auto-generate UML reports》
- [ ] **Dev.to 文章 1**：《Zero-dependency, zero-build: The modern way to document code with UML》
- [ ] **Dev.to 文章 2**：《AI reads code for you: How to generate UML diagrams from any codebase》
- [ ] **YouTube video**：《From Code to UML in 3 Minutes – Full Demo》
- [ ] **Product Hunt 发布页准备**
- [ ] **Twitter 日常分享 (3 per week)**

---

## 🔧 阶段 0 的立即执行项（代码变更）

以下是可立即开始做的代码层面的准备工作，在开始推广前完成：

1. `demo.html` & `index.html` — 添加 Open Graph / Twitter Card meta
2. `README.md` — 添加 star badge、social 链接、star history 图
3. 新建 `CONTRIBUTING.md` — 贡献指南
4. 新建 `.github/ISSUE_TEMPLATE/` — Issue 模板
5. 新建 `.github/PULL_REQUEST_TEMPLATE.md` — PR 模板
6. `README.md`"相关链接"部分 — 添加 Twitter/X、Discussions 等

---

## 📝 备注与建议

- **不要追求一次性全部铺开**，优先做好 2-3 个平台（建议知乎 + V2EX + B 站，或 HN + Reddit + Product Hunt 二选一）再扩展到其他平台。
- **内容质量 > 数量**。一篇在 Hacker News 登上首页的文章胜过 10 篇无人问津的博客。
- **时机很重要**。HN/PH/Reddit 的最佳发布时间是美东时间工作日的早 8-10 点；知乎/掘金的最佳时间是工作日晚 8-10 点。
- **保持迭代**。根据数据反馈（哪个渠道带来最多 star）动态调整资源分配。
- **GitHub Profile 本身是营销页**。仓库的 README、Issues 响应速度、PR 合并效率直接影响星标转化率。
