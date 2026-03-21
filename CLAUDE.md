# CLAUDE.md

本仓库的执行硬约束以 [AGENTS.md](/Users/jiankunwu/project/aiv/AGENTS.md) 为准。

进入仓库后，必须优先遵守其中的 `Current Hard Guardrails`，尤其是：

1. 不得重新引入 Planner runtime mock 依赖。
2. 不得绕开统一错误模型继续扩散手写错误响应。
3. 不得把跨域副作用重新堆回 `run-lifecycle`。
4. 不得恢复大量纯代理 BFF route。
5. 触达主链路时，必须优先验证 `typecheck`、`test:unit` 和 `test:planner:api-smoke`。

如果 `CLAUDE.md` 与 `AGENTS.md` 有冲突，以 `AGENTS.md` 为准。
