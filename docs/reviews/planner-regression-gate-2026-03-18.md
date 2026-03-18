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

## Why The Final Gate Matters

The planner debug/apply chain crosses:

- API services
- workspace contracts
- planner version activation
- planner main-flow UI
- planner debug UI
- route/query context preservation

Unit tests do not cover the whole interaction graph. The browser smoke is the last line of defense against silent integration regressions.
