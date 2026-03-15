# 前端收口与重构 TODO（2026-03-15）

## P0

- [x] 拆分 `/Users/jiankunwu/project/aiv/apps/web/src/features/settings/components/catalog-management-page.tsx`
  - [x] toolbar
  - [x] grid / list
  - [x] subject dialog
  - [x] style dialog
  - [x] auth gate
- [x] 拆分 `/Users/jiankunwu/project/aiv/apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx`
  - [x] hero / top toolbar
  - [x] manage pane
  - [x] debug pane
  - [x] compare / history pane
- [x] 抽取共享卡片媒体组件 `CollectionCardMedia`
  - [x] 主体卡
  - [x] 画风卡
  - [x] 我的空间卡
- [x] 统一 auth gate
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/app/my-space`
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/app/settings/catalogs`

## P1

- [x] shared toolbar 继续全站收口
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/features/planner-debug/components/planner-sub-agent-browser.tsx`
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx`
- [x] 将 toolbar token 上提到全局设计 token
- [x] 后台页文案去开发味
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx`
  - [x] `/Users/jiankunwu/project/aiv/apps/web/src/features/admin/components/admin-model-directory-page.tsx`

## P2

- [x] 图片质量问题与布局问题分层
  - [x] 新增素材预处理 / 裁切策略层
  - [x] 页面 CSS 不再硬编码图片补偿
- [x] 清理 `/Users/jiankunwu/project/aiv/output/playwright` 中的中间态截图，仅保留最终验证图
