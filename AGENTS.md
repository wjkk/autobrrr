# AGENTS.md

文件路径、模块划分、代码文件，均需要遵守语言和框架的最佳实践。
避免巨大的文件，需要时立即进行重构，确保文件干净整洁。
避免重复代码，确保 DRY。
预留出足够的可扩展性，但不要过度设计。

## Current Hard Guardrails

以下要求属于当前仓库的硬约束，适用于 Codex、Claude Code 和其他进入该仓库执行改动的 AI agent。

### 1. 先守住现有收口成果，再做新改动

任何改动都不得破坏以下已完成的基线：

1. Planner 运行时不得重新引入 `@aiv/mock-data` 参与真实业务决策。
2. API 必须优先沿用统一错误模型，不得在新代码中继续扩散手写错误响应结构。
3. `run-lifecycle` 必须保持薄协调入口，不允许把跨域副作用重新堆回单文件热点。
4. Web BFF 不得重新回到“一个后端接口对应一个纯代理 route”的模式。
5. 已删除的休眠 schema 模型不得在无明确设计评审前重新加入当前主路径。

### 2. 变更优先级规则

后续工作优先级固定如下：

1. 主链路稳定性与业务正确性
2. 错误模型一致性
3. smoke / unit / typecheck 护栏
4. 可观测性与运行边界说明
5. 局部结构优化

禁止把“目录更整齐”“文件更小”“继续 facade 化”当成高于主链路稳定性的目标。

### 3. 任何改动前必须先检查的护栏

在提交任何实现前，必须先确认是否影响以下基线：

1. `pnpm --filter @aiv/api test:unit`
2. `pnpm --filter @aiv/api exec tsc --noEmit`
3. `pnpm typecheck`
4. `pnpm --filter @aiv/web test:unit`
5. `pnpm test:planner:api-smoke`

如果改动触达 Planner、Creation、Run、Worker、Provider callback、BFF route、schema 或共享契约层，上述护栏默认视为相关。

### 4. 新增代码的行为要求

1. 新 route 优先复用 `AppError` / `parseOrThrow` / 统一 envelope。
2. 新的 run / worker / callback 逻辑必须明确终态、重试和重复调用边界。
3. 新的 Planner / Creation 主链路变更，至少要补一条 unit test 或纳入现有 smoke 证据。
4. 不允许用 fixture、mock、fallback 文本去替代真实运行时必需字段。
5. 不允许为了“先跑通”而引入新的 `any` 扩散到页面总装配器或共享契约边界。

### 5. 文档同步要求

如果改动影响上述基线之一，必须同步检查：

1. `/Users/jiankunwu/project/aiv/todo.list`
2. `/Users/jiankunwu/project/aiv/docs/specs/architecture-8-score-roadmap-v0.1.md`
3. `/Users/jiankunwu/project/aiv/docs/reviews/aiv-studio-architecture-review.md`

文档里禁止继续保留与当前代码矛盾的“已完成”“已达到 8 分”“结构性重构已完成”之类表述。

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills
- `agent-browser`: Automates browser interactions for web testing, form filling, screenshots, and data extraction. Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, test web applications, or extract information from web pages. (file: `/Users/jiankunwu/project/skills/unified-local-skills/agent-browser/SKILL.md`)
- `algorithmic-art`: Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations. (file: `/Users/jiankunwu/project/skills/unified-local-skills/algorithmic-art/SKILL.md`)
- `brand-guidelines`: Applies Anthropic's official brand colors and typography to artifacts that benefit from brand styling. (file: `/Users/jiankunwu/project/skills/unified-local-skills/brand-guidelines/SKILL.md`)
- `canvas-design`: Create beautiful visual art in `.png` and `.pdf` documents using design philosophy. (file: `/Users/jiankunwu/project/skills/unified-local-skills/canvas-design/SKILL.md`)
- `claude-api`: Build apps with the Claude API or Anthropic SDK. (file: `/Users/jiankunwu/project/skills/unified-local-skills/claude-api/SKILL.md`)
- `clone-website`: Clone and faithfully recreate existing websites or pages for high-fidelity visual replication work, including layout, spacing, hierarchy, and interaction details. Use when users ask to reproduce an existing site/page as closely as possible. (file: `/Users/jiankunwu/project/skills/unified-local-skills/clone-website/SKILL.md`)
- `doc-coauthoring`: Guide users through a structured workflow for co-authoring documentation. (file: `/Users/jiankunwu/project/skills/unified-local-skills/doc-coauthoring/SKILL.md`)
- `docx`: Use whenever the user wants to create, read, edit, or manipulate Word documents. (file: `/Users/jiankunwu/project/skills/unified-local-skills/docx/SKILL.md`)
- `frontend-design`: Create distinctive, production-grade frontend interfaces with high design quality. (file: `/Users/jiankunwu/project/skills/unified-local-skills/frontend-design/SKILL.md`)
- `internal-comms`: Resources for writing internal communications. (file: `/Users/jiankunwu/project/skills/unified-local-skills/internal-comms/SKILL.md`)
- `mcp-builder`: Guide for creating high-quality MCP servers. (file: `/Users/jiankunwu/project/skills/unified-local-skills/mcp-builder/SKILL.md`)
- `pdf`: Use whenever the user wants to work with PDF files. (file: `/Users/jiankunwu/project/skills/unified-local-skills/pdf/SKILL.md`)
- `pptx`: Use any time a `.pptx` file is involved. (file: `/Users/jiankunwu/project/skills/unified-local-skills/pptx/SKILL.md`)
- `skill-creator`: Create or improve skills. (file: `/Users/jiankunwu/project/skills/unified-local-skills/skill-creator/SKILL.md`)
- `slack-gif-creator`: Create animated GIFs optimized for Slack. (file: `/Users/jiankunwu/project/skills/unified-local-skills/slack-gif-creator/SKILL.md`)
- `theme-factory`: Toolkit for styling artifacts with a theme. (file: `/Users/jiankunwu/project/skills/unified-local-skills/theme-factory/SKILL.md`)
- `web-artifacts-builder`: Build elaborate web artifacts using modern frontend stacks. (file: `/Users/jiankunwu/project/skills/unified-local-skills/web-artifacts-builder/SKILL.md`)
- `webapp-testing`: Toolkit for interacting with and testing local web applications using Playwright. (file: `/Users/jiankunwu/project/skills/unified-local-skills/webapp-testing/SKILL.md`)
- `xlsx`: Use any time a spreadsheet file is the primary input or output. (file: `/Users/jiankunwu/project/skills/unified-local-skills/xlsx/SKILL.md`)

### How to use skills
- Discovery: The list above is the skills available in this repo context.
- Trigger rules: If the user names a skill, or the task clearly matches a skill's description, you must use that skill for that turn.
- Missing/blocked: If a named skill cannot be read, say so briefly and continue with the best fallback.
- Progressive disclosure:
  1. Open the skill's `SKILL.md` after deciding to use it.
  2. Resolve relative paths relative to the skill directory first.
  3. Load only the files needed for the task.
  4. Reuse scripts/templates/assets when available.
- Coordination:
  - Use the minimal set of skills that covers the request.
  - State which skill(s) are being used and why.
- Context hygiene:
  - Keep context small and avoid bulk-loading references.
- Safety and fallback:
  - If a skill can't be applied cleanly, state the issue and continue with the next-best approach.
