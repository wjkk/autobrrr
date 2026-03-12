# AGENTS.md

文件路径、模块划分、代码文件，均需要遵守语言和框架的最佳实践。
避免巨大的文件，需要时立即进行重构，确保文件干净整洁。
避免重复代码，确保 DRY。
预留出足够的可扩展性，但不要过度设计。

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
