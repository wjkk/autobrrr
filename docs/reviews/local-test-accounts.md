# 本地测试账号记录

状态：可用
适用范围：本地开发环境（`localhost:3000` / `localhost:8787`）
最后验证时间：2026-03-14

## 1. 固定测试账号

### QA Local

- 用途：登录后访问需要鉴权的页面，例如：
  - `/my-space`
  - `/internal/planner-agents`
  - `/internal/planner-debug/*`
  - `/projects/:projectId/planner`
  - `/projects/:projectId/creation`
  - `/projects/:projectId/publish`
- 邮箱：`qa.local@aiv.dev`
- 密码：`AivLocal123!`
- 显示名：`QA Local`
- 本地用户 ID：`cmmqi5vmg0000z52tiuguqmpg`

### Planner Real Provider

- 用途：真实 provider 的 Planner 浏览器端到端回归
- 邮箱：`smoke-ark-image-1773673889902@example.com`
- 密码：`password123`
- 说明：
  - 当前默认用于 `pnpm test:planner:real-provider`
  - 该账号需要在本地数据库中保留可用文本模型 provider 配置
  - 当前默认验证使用的文本 endpoint 需具备真实可调用权限

## 2. 创建与验证结果

本账号已通过本地接口创建并验证：

1. `POST /api/auth/register` -> `201`
2. `POST /api/auth/login` -> `200`
3. `GET /api/auth/me` -> `200`
4. `GET /api/studio/projects` -> `200`

说明：

- 当前该账号可正常登录。
- 当前该账号下还没有项目数据，项目列表为空是正常现象。

## 3. 后续使用方式

### 浏览器中登录

直接通过前端登录页或调用登录接口：

- `POST http://localhost:3000/api/auth/login`

请求体：

```json
{
  "email": "qa.local@aiv.dev",
  "password": "AivLocal123!"
}
```

### 命令行快速验证

```bash
cat >/tmp/aiv-login.json <<'EOF2'
{"email":"qa.local@aiv.dev","password":"AivLocal123!"}
EOF2

curl -c /tmp/aiv-test.cookies \
  -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data @/tmp/aiv-login.json

curl -b /tmp/aiv-test.cookies http://localhost:3000/api/auth/me
```

## 4. 维护约定

1. 该账号仅用于本地开发与测试，不用于生产或共享外部环境。
2. 如果本地数据库被重建，账号可能丢失；此时可使用同一邮箱和密码重新创建。
3. 若后续新增更多测试账号，继续追加在本文件中，不另起零散记录。
4. 若真实 provider 回归账号变更，需同步更新 `docs/reviews/planner-real-provider-e2e.md` 与 `scripts/smoke-browser-real-provider-planner.py`。
