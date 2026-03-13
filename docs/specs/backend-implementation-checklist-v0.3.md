# 后端实施检查清单（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：执行清单（P0-P4）

## 1. 目标

将 `v0.3` 文档基线拆成可执行任务，并按依赖顺序组织。

## 2. 开始前检查

开始编码前必须确认：

1. 数据库选型已冻结为 `MySQL`
2. `apps/api` 与 `apps/worker` 目录将正式创建
3. `Run` 为统一异步账本
4. `GenerationRecipe / RecipeExecution` 为正式对象
5. `ModelFamily / ModelProvider / ModelEndpoint` 为正式模型目录

## 3. P0：基础设施与查询层

### P0-1 MySQL + Prisma 初始化

1. 创建 MySQL datasource
2. 初始化 Prisma Client
3. 建立第一批 migration
4. 建立 `users / user_sessions` 最小认证表

DoD：

1. 本地可连接 MySQL
2. migration 可重复执行
3. Prisma Client 可在 API 中读写

### P0-1A 最小用户系统

1. 实现 `register / login / logout / me`
2. 密码使用安全 hash
3. 登录后创建 HttpOnly session cookie
4. 业务接口接入会话校验

DoD：

1. 用户可自行注册
2. 用户可账号密码登录
3. 未登录无法访问业务接口
4. 项目列表只返回当前用户的数据

### P0-2 项目与工作区查询

1. 实现 `GET /api/studio/projects`
2. 实现 `GET /api/studio/projects/:projectId`
3. 实现 Planner / Creation / Publish workspace 查询
4. 所有查询按当前用户归属过滤

DoD：

1. 前端可在无 mock 情况下渲染三大工作区首屏

### P0-3 Run 骨架

1. 建 `runs` 表
2. 建 `event_logs` 表
3. 接入 Redis 队列
4. API 可创建 `QUEUED` Run
5. `runs` 表补齐 `provider_job_id / provider_status / next_poll_at / poll_attempt_count`

DoD：

1. 命令接口可返回稳定 `runId`
2. `GET /api/runs/:runId` 可查询

## 4. P1：Creation 主链路

### P1-1 素材与资产链路

1. 资产上传准备接口
2. 资产完成回写接口
3. `assets` 与 `shot_material_bindings` 落库

### P1-2 生图命令

1. 实现 `POST /api/shots/:shotId/generate-image`
2. Worker 消费并产出 `Asset + ShotVersion`
3. 兼容同步 provider 与异步 provider 首次回执

### P1-3 生视频命令

1. 实现 `POST /api/shots/:shotId/generate-video`
2. 支持首帧 / 尾帧参数
3. 支持 provider 异步 job polling

### P1-4 版本应用

1. 实现 `POST /api/shots/:shotId/versions/:versionId/apply`
2. 更新 `Shot.activeVersionId`

DoD：

1. 前端 generate-image / generate-video / apply-version 全链路联通
2. 页面刷新后状态不丢失
3. 异步 provider 返回 `jobId` 时，任务仍能最终收敛到成功或失败

## 5. P2：音频与对口型

### P2-1 配音上传

1. `voice_drafts`
2. `POST /api/projects/:projectId/voice/upload`

### P2-2 音乐生成

1. `music_drafts`
2. `POST /api/projects/:projectId/music/generate`

### P2-3 对口型生成

1. `lipsync_drafts`
2. `POST /api/shots/:shotId/lipsync`

DoD：

1. 音频工作区刷新可恢复
2. 任务失败可回看

## 6. P3：Recipe 与模型目录

### P3-1 Model Registry

1. 建立 `model_families`
2. 建立 `model_providers`
3. 建立 `model_endpoints`
4. 建立模型解析服务
5. 建立 fallback 候选顺序与策略配置

### P3-2 Recipe

1. 建立 `generation_recipes`
2. 建立 `recipe_executions`
3. 实现导出 / 导入 / 执行

DoD：

1. 同一逻辑模型可区分官方与第三方来源
2. “类似视频一键生成”可跑通最小闭环

## 7. P4：导出与发布

### P4-1 导出

1. Export Run
2. 导出资产回写

### P4-2 发布

1. `publish_drafts`
2. `publish_records`
3. 发布命令接口

## 8. 前端迁移清单

### 8.1 第一批迁移

1. `studio-service` 改读真实 API
2. 页面 loader 改为工作区查询

### 8.2 第二批迁移

1. `submitInlineGeneration`
2. `applyUploadedMaterial`
3. `submitLipsync`
4. `setMusicField` 提交态

### 8.3 第三批迁移

1. 删除前端业务状态模拟完成逻辑
2. 所有长任务统一改成 `runId` 驱动

## 9. 回归场景

必须验证：

1. 创建项目后可持久化进入 planner
2. creation 生图后刷新不丢失
3. creation 生视频后版本切换正常
4. 模型策略可解析到不同 provider
5. recipe 可导出 JSON
6. recipe 导入后可执行
7. run 失败后可重试
8. provider 首次只返回 `jobId` 时，系统可持续轮询并最终收敛
9. 主 endpoint 超时后，可按策略切到候选 endpoint 并留下审计记录
10. A 用户无法读取 B 用户的项目、任务和 recipe

## 10. 联调顺序

建议顺序：

1. P0
2. P1
3. 前端第一批迁移
4. P2
5. P3
6. P4

## 11. 完成定义

后端文档工作完成的标志：

1. `v0.3` 索引齐全
2. `v0.3` 数据、接口、状态机、执行文档齐全
3. 后端实现可直接按本清单分任务开工
