# Planner Regression Gate

## Goal

Lock the highest-risk planner refactor chain behind one stable merge gate:

1. `planner debug -> apply -> planner workspace`
2. `planner workspace -> debug run`
3. `debug run -> planner workspace`

If any step regresses, pull requests should fail before merge.

## Canonical Checks

- GitHub Actions workflow: `Planner Regression Gate`
- Gate job name: `Planner Regression Gate`
- Upstream jobs:
  - `Planner API Smoke`
  - `Planner Browser Smoke`
- Manual optional jobs:
  - `Planner Real Provider Smoke`
  - `Planner Real Provider Gate`

Branch protection should require the single final check:

- `Planner Regression Gate`

## Local Commands

### API smoke only

```bash
pnpm test:planner:api-smoke
```

Runs:

- API server bootstrap
- `/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts`

Log path:

- `/tmp/aiv-api-planner-smoke.log`

### Browser smoke only

```bash
pnpm test:planner:browser-smoke
```

Runs:

- `/Users/jiankunwu/project/aiv/scripts/smoke-browser-main-flow.py`

Artifacts:

- `/tmp/aiv-browser-regression/planner.png`
- `/tmp/aiv-browser-regression/creation.png`
- `/tmp/aiv-browser-regression/publish.png`
- `/tmp/aiv-browser-regression/settings-providers.png`
- `/tmp/aiv-browser-regression/api-server.log`
- `/tmp/aiv-browser-regression/web-server.log`

### Full local gate

```bash
pnpm test:planner:gate
```

### Full local gate + real provider

```bash
pnpm test:planner:gate:full
```

说明：

- 先跑普通 API / Browser gate
- 再跑 `pnpm test:planner:real-provider`
- 仅适用于本地已有真实 provider 配置的环境

## CI Runtime Contract

The workflow provisions:

- Node 22
- pnpm 10.25.0
- Python 3.13
- MySQL 8
- Prisma client generation
- Prisma schema push
- Python Playwright + Chromium

Required environment values are injected in workflow:

- `DATABASE_URL=mysql://root:password@127.0.0.1:3306/aiv`
- `API_PORT=8787`
- `AIV_API_BASE_URL=http://127.0.0.1:8787`

### Manual real-provider dispatch

`workflow_dispatch` 下可额外打开：

- `include_real_provider=true`

此时 workflow 会追加：

1. `seed:model-registry`
2. `seed:planner-agents`
3. `smoke:provider-ark-sync`
4. `pnpm test:planner:real-provider`
5. GitHub Step Summary 中写入 real-provider 成功/失败摘要
6. 上传 `/tmp/aiv-real-provider-full-planner-e2e` 与 `/tmp/aiv-real-provider-config-api.log`

前提：

- GitHub Actions secret `SMOKE_ARK_API_KEY` 已配置
- 仅建议人工触发，不作为普通 PR 必选门禁

## Why The Final Gate Matters

The planner debug/apply chain crosses:

- API services
- workspace contracts
- planner version activation
- planner main-flow UI
- planner debug UI
- route/query context preservation

Unit tests do not cover the whole interaction graph. The browser smoke is the last line of defense against silent integration regressions.
