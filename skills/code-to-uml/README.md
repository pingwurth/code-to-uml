# code-to-uml 调用示例

English version: [README.en.md](README.en.md)

这个 skill 用于在任意代码仓库中生成、更新、修复、验证或评审 Code-To-UML `.ctu` / HTML 源码分析报告。
调用时建议显式写出目标、范围、报告模式、语言和输出位置，避免模型误判为全量报告或普通 UML 解释。

## 快速模板

```text
使用 $code-to-uml，分析 <目标路径或符号>，范围是 <project|module|file|class|function>。
请生成 <compact|full> Code-To-UML 报告，语言为 <中文|英文>，输出到 <CTU_HOME/cache/...html>。
源码只读；复用 Code-To-UML 模板；完成后运行匹配模式的 validator，并给出浏览器 URL。
```

## 示例

### 1. 生成项目级完整报告

```text
使用 $code-to-uml，分析当前仓库，范围是 project。
请生成 full Code-To-UML 中文报告，输出到 $CTU_HOME/cache/current-project-analysis.html。
覆盖主要子系统、入口、架构边界、核心流程、调用关系、数据/状态流、风险和维护者速查表。
源码只读；完成后运行 --mode full validator；如果 plantuml.jar 和 Java 可用，也运行 --render；最后给出浏览器 URL。
```

### 2. 生成模块级完整报告

```text
使用 $code-to-uml，分析 src/auth/ 模块，范围是 module。
请生成 full 英文 Code-To-UML 报告，输出到 $CTU_HOME/cache/auth-module-analysis.html。
重点覆盖 public API、内部文件结构、依赖方向、状态所有权、错误路径和扩展点。
源码只读；复用模板；校验通过后返回 HTML 路径、校验结果和访问 URL。
```

### 3. 生成文件级紧凑报告

```text
使用 $code-to-uml，分析 src/utils/normalize.ts，范围是 file。
请生成 compact 中文 Code-To-UML 报告，输出到 $CTU_HOME/cache/normalize-file-analysis.html。
如果某些架构、调用或状态流内容很薄，请合并到相邻卡片并说明原因，不要为了 Section-ID 填充空洞内容。
运行 --mode compact validator，并返回结果。
```

### 4. 生成函数级紧凑报告

```text
使用 $code-to-uml，分析函数 parseUserInput，范围是 function。
请生成 compact 中文报告，输出到 $CTU_HOME/cache/parse-user-input-analysis.html。
重点解释签名、前置条件、分支、异常、返回值、调用方/被调用方、边界用法和风险。
只有当图能降低理解成本时才写 UML；简单关系用表格或文字。
```

### 5. 更新已有报告

```text
使用 $code-to-uml，更新 $CTU_HOME/cache/payment-flow-analysis.html 对应的报告。
目标源码是 src/payment/，范围是 module。
请保留仍然真实的内容，只刷新已过期的流程、调用关系、风险和维护者速查表。
保持现有 tab、data-dir、Section-ID 和 .ctu 文件命名对齐；更新后按原报告意图选择 --mode full 或 --mode compact 重新校验。
```

### 6. 修复校验或渲染失败

```text
使用 $code-to-uml，修复 $CTU_HOME/cache/order-state-analysis.html 的验证失败。
先复现这个命令：
node skills/code-to-uml/scripts/validate-report.js --root "$CTU_HOME" --html cache/order-state-analysis.html --lang zh --scope module --complexity medium --mode full --strict --render

然后只修改导致失败的 HTML、.ctu 或 validator 相关内容。
修复后重新运行同一条命令，并说明具体修复了哪些错误。
```

### 7. 只评审报告或 skill 本身

```text
使用 $code-to-uml，review-only 检查 skills/code-to-uml/。
请从 skill 可发现性、模式选择、引用加载、报告契约、validator 能力边界、fixture 覆盖和上下文成本角度提出问题。
不要生成 HTML，不要启动服务器；只输出按严重程度排序的 findings 和改进建议。
```

## 直接验证 fixture

修改 validator 或报告契约后，先跑完整 fixture 矩阵：

```bash
node skills/code-to-uml/scripts/validate-fixtures.js
```

也可以单独跑最小紧凑报告 fixture：

```bash
node skills/code-to-uml/scripts/validate-report.js \
  --root skills/code-to-uml/fixtures/minimal \
  --html cache/minimal-function.html \
  --lang en \
  --scope function \
  --complexity low \
  --mode compact \
  --strict
```
