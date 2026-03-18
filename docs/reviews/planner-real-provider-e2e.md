# Planner 真实 Provider 端到端回归

状态：可执行  
适用范围：本地 API + Web 开发环境、Planner 主链路真实模型验证  
最后验证：2026-03-18

## 1. 目的

该回归用于验证策划页真实模型主链路是否仍然成立：

1. 登录真实 provider 测试账号
2. 创建新项目与默认集
3. 在 Planner 页触发大纲生成
4. 确认大纲
5. 触发 refinement 细化
6. 验证页面成功渲染真实模型结果

它不是普通 smoke：

1. 需要本地数据库里已有可用的真实 provider 配置
2. 会真实调用文本模型
3. 为避免共享队列噪音，使用定点 run 处理脚本直接消费对应 Planner Run

## 2. 入口命令

仓库统一入口：

```bash
pnpm test:planner:real-provider
```

该命令实际调用：

1. `scripts/smoke-browser-real-provider-planner.py`
2. `apps/api/scripts/process-planner-run.ts`

当前终端默认只打印精简摘要；完整细节统一写入 `result.json`。

## 3. 默认验证内容

脚本默认会验证以下结果：

1. outline run 成功完成
2. refinement run 成功完成
3. Planner 页面出现 `本次执行：真实模型`
4. 右侧文档出现 `故事梗概`
5. 右侧文档出现 `分镜剧本`
6. refinement 的 `generatedText` 已包含原生 `structuredDoc` 键：
   - `projectTitle`
   - `summaryBullets`
   - `acts`
7. refinement 的 `generatedText` 不应再依赖旧的中文替代键：
   - `故事梗概`
   - `三幕主体剧情`
   - `分镜剧本（适配模型）`

## 4. 输出产物

默认输出目录：

```bash
/tmp/aiv-real-provider-full-planner-e2e
```

关键产物：

1. `result.json`
2. `cli-summary.json`
3. `failure-summary.json`（失败时）
4. `outline-live.png`
5. `refinement-live.png`
6. `real-provider-api.log`
7. `real-provider-web.log`
8. `<run-id>-process.stdout.log`
9. `<run-id>-process.stderr.log`

终端摘要默认包含：

1. `projectId`
2. `episodeId`
3. `outlineRunId`
4. `refinementRunId`
5. `actCount`
6. `shotCount`
7. `subjectTitles`
8. 第一条 `summaryBullet`

失败时会额外输出：

1. `failure-summary.json`
2. `partial-result.json`（如果脚本已经拿到部分上下文）

## 5. 环境变量

脚本支持以下覆盖项：

```bash
AIV_REAL_PROVIDER_EMAIL
AIV_REAL_PROVIDER_PASSWORD
AIV_REAL_PROVIDER_PROJECT_PROMPT
AIV_REAL_PROVIDER_REFINEMENT_PROMPT
AIV_REAL_PROVIDER_TARGET_VIDEO_MODEL_FAMILY_SLUG
AIV_REAL_PROVIDER_OUT_DIR
AIV_REAL_PROVIDER_API_PORT
AIV_REAL_PROVIDER_WEB_PORT
```

示例：

```bash
AIV_REAL_PROVIDER_OUT_DIR=/tmp/aiv-real-provider-custom \
AIV_REAL_PROVIDER_PROJECT_PROMPT='写一个都市犯罪短剧，单集，三幕结构。' \
pnpm test:planner:real-provider
```

## 6. 使用前提

运行前需要满足：

1. `apps/api/.env` 可正常连接本地数据库
2. 本地数据库中已存在可登录测试账号
3. 该账号已配置并启用可用文本模型 provider
4. `ark-doubao-seed-1-8-251228` 或等价可用 endpoint 对该账号可访问
5. 本地已安装 Playwright 运行依赖

如果 provider 不可用，脚本应失败，不允许自动 mock 成功。

## 7. 失败定位

优先检查：

1. `result.json` 是否生成
2. `real-provider-api.log`
3. `real-provider-web.log`
4. 对应 run 的 `-process.stderr.log`

常见失败类型：

1. 账号登录失败：测试账号丢失或密码不一致
2. provider 不可用：endpoint 权限、配置或密钥失效
3. 页面断链：outline 成功但无法确认或 refinement 页面未渲染
4. schema 不命中：模型返回不符合 `structuredDoc` 结构

## 8. 维护约定

1. 真实 provider 回归只验证 Planner 主链路，不负责 Creation/Publish 端到端
2. 若后续主链路改为后台 worker 常驻消费，可保留当前定点 run 处理模式作为稳定兜底
3. 若测试账号或默认 endpoint 变更，必须同步更新：
   - `docs/reviews/local-test-accounts.md`
   - `scripts/smoke-browser-real-provider-planner.py`
4. 若 refinement schema 变更，必须同步更新脚本中的原生键断言
