---
name: code-to-uml
description: 在生成、更新、修复、验证或评审 Code-To-UML .ctu/HTML 源码分析报告（涵盖项目、模块、文件、类、函数、已有报告，以及 validator/渲染失败）时使用。
---

# Code-To-UML 报告

## 核心规则

生成、更新、修复、验证或评审基于源码证据的 Code-To-UML `.ctu`/HTML 报告。
除非用户要求修改代码，否则被分析的源码是只读的。报告内容保留在 `.ctu` 数据文件中，HTML 保持为数据驱动的薄壳，仅当 UML 能降低读者理解成本时才添加。

脚本优先：凡是能由脚本机械完成的步骤（扫描统计、复杂度评分、生成计划、编译/刷新 HTML 外壳、契约验证、运行时验证），一律通过脚本执行；LLM 只负责脚本无法完成的内容创作——`.ctu` 卡片内容、整份报告概述、图的选择与内容，以及评审判断。

## 绝对路径规则

- 在读取 skill 资源或运行 skill 脚本之前，先将 `CTU_SKILL_ROOT` 解析为包含本 `SKILL.md` 的绝对目录。
- 在读取模板、写入产物、验证报告或启动服务器之前，先用 `CTU_HOME Bootstrap` 中的解析脚本将 `CTU_HOME` 解析为 Code-To-UML 的绝对根目录。本 skill 中的 `$CTU_HOME` 是解析后的逻辑变量，不必作为预设的环境变量存在。
- 本文档中的每个 `$CTU_SKILL_ROOT/...` 和 `$CTU_HOME/...` 路径都视为绝对路径，因为这两个根变量都必须包含绝对路径。
- 不要使用裸相对路径、`.` 路径、`..` 路径，或含义取决于 shell 工作目录的命令。

## CTU_HOME Bootstrap

在选择输出路径或运行任何命令之前，先运行内置的解析脚本：

```bash
node "$CTU_SKILL_ROOT/scripts/resolve-ctu-home.js" [--hint "<user-provided-root-or-report-path>"]
```

- 从 stdout 读取 `CTU_HOME=<absolute path>` 行，将其保留为绝对路径的本地变量供后续每条命令使用，并以 `--root "$CTU_HOME"` 显式传给所有脚本。不要依赖环境变量在工具调用之间保持。
- 脚本用四个哨兵文件 `$CTU_HOME/cache/_TEMPLATE.html`、`$CTU_HOME/data/_TEMPLATE.ctu`、`$CTU_HOME/demo.html` 和 `$CTU_HOME/serve.js` 校验每个候选路径，依次尝试：`--hint` 路径及其祖先目录、`node install.js` 放置在 skill 旁边的安装指针 `ctu-home.json`、`CTU_HOME` 环境变量、打包本 skill 的仓库、当前工作目录及其祖先目录，以及 `node install.js` 写入的 shell profile 标记。
- 当用户明确给出 Code-To-UML 根目录或已有报告 HTML 路径时，始终传入 `--hint`。
- 退出码为 1 时，解析脚本会打印检查过的每个候选路径以及缺失的哨兵文件。请转述该诊断信息，然后请用户在 Code-To-UML 仓库中运行 `node install.js`，或提供显式根目录，并用 `--hint` 重试一次。
- 如果脚本不可用，则回退到上述按顺序的候选路径，并在接受任何根目录之前手工验证全部四个哨兵文件。
- 安装在 `~/.claude/skills/code-to-uml` 这类工具目录下的 skill 同样以 `skills/code-to-uml` 结尾；它的祖父目录是该工具的配置目录，绝不是 Code-To-UML 仓库。`dirname(dirname(CTU_SKILL_ROOT))` 这一捷径仅在哨兵文件确实通过校验时才有效。
- 绝不臆造根目录。绝不在被分析的仓库、skill 目录或任何猜测的位置创建 cache/ 或 data/ 报告结构。位于解析出的 CTU 根目录之外的报告无法加载其 `../main.css`、`../demo.js` 和 `../js/...` 资源，因此会渲染为无样式、无脚本的页面。

## 脚本职责

| 步骤 | 脚本 | 脚本负责 |
| --- | --- | --- |
| 解析根目录 | `$CTU_SKILL_ROOT/scripts/resolve-ctu-home.js` | 确定性解析 `CTU_HOME`，校验哨兵文件并输出诊断 |
| 目标扫描（可选） | `$CTU_SKILL_ROOT/scripts/scan-target.js` | 机械统计文件数/行数/符号数/信号数，输出六维复杂度评分、升级触发条件和 scope 建议 |
| 生成计划 | `$CTU_SKILL_ROOT/scripts/plan-report.js` | 输出必需 section 清单（含所属类别）、`--mode`/`--scope`/`--complexity` 对应的卡片下限、数据覆盖差异、PlantUML 可用性，以及下一条 scaffold/validate 的精确命令 |
| 编译报告外壳 | `$CTU_SKILL_ROOT/scripts/scaffold-report.js` | 从 `$CTU_HOME/cache/_TEMPLATE.html` 编译或就地刷新 HTML 外壳：tabs（`data-diagram`）、tab 标签（`.ctu` 的 `Title:` 头）、section 概述段落（`Describe:` 头）、`h2#demo-title`、`body[data-dir]`、`<title>`、`<h1>` 与概述段落 |
| 契约验证 | `$CTU_SKILL_ROOT/scripts/validate-report.js` | 产物结构、内容契约、覆盖度与深度门禁、占位符/编码检查，可选 PlantUML 渲染 |
| 运行时验证（可选） | `$CTU_SKILL_ROOT/scripts/check-runtime.js` | 通过 HTTP 验证报告页面锚点、首页发现、`/api/demo-examples` 类别、全部被引用静态资源，可选服务端 PlantUML 渲染；`--start` 可自行启动并在结束时停止服务器 |
| validator 自检 | `$CTU_SKILL_ROOT/scripts/validate-fixtures.js` | 用 `$CTU_SKILL_ROOT/fixtures/` 回归 validator 行为 |

脚本输出全部支持 `--json` 机读形式；失败时退出码非 0 并给出可操作的错误信息。脚本定位失败会立即报错而不会写出损坏的页面。

## 模式选择

在阅读参考文档或修改文件之前先选择模式。

| 用户意图 | 模式 | 是否写入 | 所需参考文档 | 验证 |
| --- | --- | --- | --- | --- |
| 全新的项目/模块/文件综合报告，或明确要求 "full" | 完整报告 | 是 | `$CTU_SKILL_ROOT/references/report-contract.md`，以及按需使用的绝对 template/diagram/UML 参考路径 | `--mode full` |
| 范围较窄的函数/类/小文件报告，或明确要求 "compact" | 紧凑报告 | 是 | 与 full 模式相同的参考文档；compact 只改变深度与卡片数量下限 | `--mode compact` |
| 刷新已有报告 | 更新已有报告 | 是 | 已有报告加上变更面的参考文档 | 原有模式，通常是 `--mode full` 或 `--mode compact` |
| validator、产物、PlantUML 或运行时失败 | 修复验证/渲染 | 是 | 失败的产物加上相关契约/脚本 | 复现并重跑失败的命令 |
| 检查某个 skill、报告或产物 | 仅评审 | 除非被要求，否则不写入 | 被评审的文件；参考文档仅用于正在核查的论断 | 可选 |

## 默认行为

- 目标：将 "本项目/当前仓库" 解析为当前仓库的绝对根路径，scope 为 `project`。
- Scope：从目录推断 `module`，从源文件推断 `file`，当结构化工具能解析时从显式符号推断 `function`/`class`。`scan-target.js` 的 scope 建议只是提示，用户意图优先。
- 报告语言：使用用户的语言；以中文为主的请求用 `zh`，以英文为主的请求用 `en`。
- 报告模式：用户显式指定的模式优先；否则对小函数/类/低复杂度文件使用 compact，对项目/模块/文件或综合性请求使用 full。
- 输出路径：生成 HTML 时若未指定，使用 `$CTU_HOME/cache/<target-slug>_analysis.html`。
- CTU 根目录：始终使用上文 `CTU_HOME Bootstrap` 的解析器，并保持结果为绝对路径。
- 用户给出的相对输出路径始终相对于解析后的 CTU 根目录，必须立即转换为绝对 `$CTU_HOME/...` 路径，绝不能相对于被分析的仓库 cwd、skill 目录或 shell cwd。
- 仅当用户显式提供绝对路径并明确要求放到外部位置时，才允许输出路径位于解析后的 CTU 根目录之外；此时要警告相对模板资源将无法加载，并在步骤 7 的 validator 命令中加 `--allow-external-assets`，把这些预期内的缺失资源降级为非阻断 info，否则 `--strict` 会因它们而失败。
- 仅当无法安全推断目标/操作、存在多个匹配目标，或已有报告无法映射到源码/数据时才询问。

生成产物之前，先声明解析得到的绝对 CTU 根目录以及 HTML/数据文件的绝对输出路径。

## 必需工作流

生成或更新报告时：

1. 解析 `CTU_HOME`（见 `CTU_HOME Bootstrap`），确定模式、目标、scope、语言与报告 slug，输出路径取 `$CTU_HOME/cache/<target-slug>_analysis.html` 或用户给出的路径。在任何写入之前，先把每个相对产物路径以 CTU 根目录为基准规范化。
2. （可选，推荐）对目标运行 `scan-target.js`，把输出的复杂度评分与覆盖度基线作为第一轮评分依据；随后通过阅读代码修正评分。
3. 运行 `plan-report.js`，从计划中取得：必需 section 与其所属类别、卡片下限与多类别分布要求、数据覆盖差异、PlantUML 可用性，以及下一步的 scaffold/validate 精确命令。scope、complexity、mode 以用户意图为准，可覆盖脚本建议。
4. 运行 `scaffold-report.js` 编译 HTML 外壳。数据尚未写入时可先用 `--categories` 建壳；外壳已存在时脚本自动切换为就地刷新。
5. 创作内容（唯一的 LLM 步骤）：编写 `$CTU_HOME/data/<report-slug>/` 下的 `.ctu` 文件——每个类别一个文件（必要时 `--2`、`--3` 续号），`Title:` 头是 tab 标签来源，`Describe:` 头是该类别概述段落来源；卡片内容按 `plan-report.js` 给出的必需 section 逐个覆盖。整份报告的 `<p data-markdown>` 概述通过 `--intro-file` 或直接编辑后交给脚本。
6. 数据写完后重新运行 `scaffold-report.js`（不带 `--categories`），同步 tab 标签与概述段落；不传 `--title` 时脚本会保留手工编辑过的 `<h1>` 与概述。
7. 运行 `validate-report.js`，使用计划中的 `--lang`、`--scope`、`--complexity`、`--mode` 与 `--strict`（`plan-report.js` 输出的命令已按需附加 `--render` 与 `--allow-external-assets`，可直接使用）；根据报错修复内容并重复，直到 0 error。
8. 需要运行时验证时运行 `check-runtime.js`（必要时加 `--start`），并把浏览器 URL 提供给用户。浏览器内行为（WASM 渲染、tab 点击）仍由你按需检查。

修复已有报告时：从步骤 1 与步骤 3 进入，用 `plan-report.js` 的覆盖差异定位缺失 section，只补齐差额内容，然后按步骤 6-8 刷新与验证。
仅评审时：只读取被评审的文件，运行 `validate-report.js` 复现结论，不做写入。

## 不可协商的检查

- 保持模板结构、数据约定、CSS/JS 依赖、脚本顺序、`[FIXED]` 选择器，以及允许的 `[EDIT]` / `[CONFIG]` 边界不变；HTML 外壳通过 `scaffold-report.js` 生成或刷新，不要手工重写固定区域。
- 写入之前，确认规范化后的 HTML 和数据路径位于解析后的 CTU 根目录之下，除非用户明确要求绝对的外部路径。
- 生成的 HTML 必须保持其相对运行时资源可解析：每个 `../main.css`、`../demo.js`、`../js/...` 或 `../component/...` 引用都必须指向存在的文件。validator 会拒绝缺失被引用资源的报告，因为这类页面会渲染为无样式、无脚本的页面。
- 生成的 HTML 和 `.ctu` 文件必须写为有效的 UTF-8；不要依赖 Windows shell 的默认编码。
- 报告语言必须与用户提问语言一致，除非用户明确要求其他语言。
- 每个必需的 `Section-ID: Sxx_...` 都必须使用目标相关的真实内容；绝不把 section 标记当作占位符。必需 section 清单以 `plan-report.js` 的输出为准。
- `S13_MAINTAINER_REFERENCE` 必须是 Markdown 表格，不能是散文或列表项。
- `[Description]` 和 `[Detail]` 必须使用与内容匹配的 Markdown 结构：段落、无序列表、编号步骤、缩进和 Markdown 表格。
- 当内容包含句号、分号等句末标点时应当断行；不要按视觉长度对散文硬换行。
- full 报告必须通过覆盖度和深度要求。大型或多子系统目标使用 `--complexity high`，并覆盖所有主要子系统。
- compact 报告可以合并 section，但每个被合并的 ID 必须包含具体证据，或说明为何不存在独立内容的明确理由。
- 开头的 `<p data-markdown>` 是整份报告的简明 Markdown 概述，而不是某一类别的概述。
- 分析由文字承载；图是可选的，每个非空 `[UML]` 块都需要有用的 `[Detail]`。
- 论断必须基于具体的源码证据：路径、符号、常量、路由、命令、副作用、失败路径、行/符号引用，或显式标注的推断。
- 审慎处理顶栏链接：保持真实、如实替换，或整体删除该链接。
- 仅当 Java 和 `$CTU_HOME/plantuml.jar` 都可用时才添加 `--render`；否则说明跳过了渲染验证。`plan-report.js` 会探测并显示该可用性。

## 参考映射表

| 需求 | 读取/使用 |
| --- | --- |
| 确定性地解析 `CTU_HOME` | `$CTU_SKILL_ROOT/scripts/resolve-ctu-home.js` |
| 目标行数/符号数统计与复杂度初评 | `$CTU_SKILL_ROOT/scripts/scan-target.js` |
| 必需 section、卡片下限、覆盖差异、下一步命令 | `$CTU_SKILL_ROOT/scripts/plan-report.js` |
| HTML 外壳编译与数据同步 | `$CTU_SKILL_ROOT/scripts/scaffold-report.js` |
| section 目录、scope 适用性、复杂度、质量门禁、最终响应形态 | `$CTU_SKILL_ROOT/references/report-contract.md` |
| HTML 外壳、`.ctu` 语法、路径/类别/运行时契约 | `$CTU_SKILL_ROOT/references/code-to-uml-template.md` |
| 图是否有用以及选择哪种图类型 | `$CTU_SKILL_ROOT/references/diagram-decision-table.md` |
| 编写或检查非空 PlantUML 块 | `$CTU_SKILL_ROOT/references/uml-standards.md` |
| 产物/内容验证 | `$CTU_SKILL_ROOT/scripts/validate-report.js` |
| 运行时/API/顶栏验证 | `$CTU_SKILL_ROOT/scripts/check-runtime.js` |
| validator 或报告契约的修改 | `$CTU_SKILL_ROOT/scripts/validate-fixtures.js` 和 `$CTU_SKILL_ROOT/fixtures/` |

对于仅评审的请求，默认不要加载全部参考文档。先阅读被评审的文件，然后只加载与被核查论断相关的参考文档。

## 验证命令

对生成或更新的 HTML 报告使用以下形式（参数值来自 `plan-report.js` 的输出）：

```bash
node "$CTU_SKILL_ROOT/scripts/validate-report.js" \
  --root "$CTU_HOME" \
  --html "$CTU_HOME/cache/<report-file>.html" \
  --lang <zh|en> \
  --scope <project|module|file|class|function> \
  --complexity <low|medium|high> \
  --mode <compact|full> \
  --strict [--allow-external-assets]
```

生成计划的命令：

```bash
node "$CTU_SKILL_ROOT/scripts/plan-report.js" \
  --root "$CTU_HOME" \
  --slug <report-slug> \
  --lang <zh|en> \
  --scope <project|module|file|class|function> \
  --complexity <low|medium|high> \
  --mode <compact|full>
```

编译或刷新外壳的命令：

```bash
node "$CTU_SKILL_ROOT/scripts/scaffold-report.js" \
  --root "$CTU_HOME" \
  --slug <report-slug> \
  --lang <zh|en> \
  --title "<report title>" \
  [--intro-file "$CTU_HOME/cache/<slug>-intro.md"] [--categories a,b,c]
```

运行时验证的命令：

```bash
node "$CTU_SKILL_ROOT/scripts/check-runtime.js" \
  --root "$CTU_HOME" \
  --html "$CTU_HOME/cache/<report-file>.html" \
  --lang <zh|en> [--start] [--render]
```

仅当 Java 和 `$CTU_HOME/plantuml.jar` 都可用时才添加 `--render`。
修改 validator 或报告契约后，运行：

```bash
node "$CTU_SKILL_ROOT/scripts/validate-fixtures.js"
```

## 完成

对生成/更新的报告，按 `$CTU_SKILL_ROOT/references/report-contract.md` 返回简明的最终状态：HTML 路径、模板复用情况、拆分文件决策、验证/PlantUML 结果、section 摘要，以及执行或预期进行运行时验证时的浏览器 URL。
对于仅评审或部分完成的工作，说明验证范围，以及未执行的运行时或渲染检查。