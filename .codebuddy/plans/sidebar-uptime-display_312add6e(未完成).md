---
name: sidebar-uptime-display
overview: 在侧边栏 Logo 下方新增一行，通过 /api/stats/overview 接口获取 startup_timestamp，动态显示人类可读的运行时间（xx天 xx小时 xx分 xx秒）。
todos:
  - id: create-server-uptime-component
    content: 新建 server-uptime.tsx 组件，实现 API 获取 startup_timestamp + 每秒动态计算运行时长
    status: pending
  - id: integrate-into-side-nav
    content: 在 side-nav.tsx 的 Logo Stack 与 Divider 之间插入 ServerUptime 组件
    status: pending
    dependencies:
      - create-server-uptime-component
  - id: integrate-into-mobile-nav
    content: 在 mobile-nav.tsx 同步插入 ServerUptime 组件，保持移动端一致
    status: pending
    dependencies:
      - create-server-uptime-component
---

## 用户需求

在侧边栏 Logo 区域下方新增一行，动态显示 SmartDNS 服务器运行时长（人类可读格式：xx天 xx小时 xx分钟 xx秒）。

## 核心功能

- 通过已有的 `/api/stats/overview` 接口获取 `startup_timestamp`（毫秒时间戳）
- 在侧边栏 Logo + "SmartDNS" 标题行下方、分割线之上，新增一行显示运行时长
- 时间动态更新（每秒刷新）
- 加载中/错误状态优雅降级（不显示或显示占位文本）

## 技术方案

### 数据获取策略

采用"单次获取 + 本地定时计算"模式，而非持续轮询 API：

- 挂载时调用一次 `smartdnsServer.GetOverView()` 获取 `startup_timestamp`
- 用 `setInterval(1000)` 在本地计算时间差，每秒更新显示
- 可选：每 60 秒轻量 refetch 检测服务端重启（`startup_timestamp` 变化则重置基准时间）

此方案的优势：服务端零负担（每分钟仅 1 次 HTTP 请求），时间显示精度为秒级，服务重启后自动检测。

### 组件设计

新建 `ServerUptime` 组件（`src/components/dashboard/layout/server-uptime.tsx`）：

- `useEffect` 触发首次数据获取，存储 `startup_timestamp` 到 state
- 第二个 `useEffect` 依赖 `startupTimestamp`，启动 1 秒 `setInterval` 计算时间差
- 时间差计算：`(Date.now() - startupTimestamp) / 1000`，分解为天/时/分/秒
- 卸载时清理 interval
- 使用 MUI `Typography` 组件，`variant="caption"`，颜色使用 `var(--SideNav-color)` 保持与侧边栏风格一致

### 错误处理

- API 请求失败时不渲染任何内容（静默失败），不影响侧边栏其他功能
- 不需要 `checkSessionError` 回调，因为 401 场景下 `DataServer.fetch` 已经自动触发 signOut

### 修改范围

- 新增 1 个文件：`src/components/dashboard/layout/server-uptime.tsx`
- 修改 1 个文件：`src/components/dashboard/layout/side-nav.tsx`（第 67 行 Divider 前插入组件）
- 可选修改：`src/components/dashboard/layout/mobile-nav.tsx`（同样在 Logo 下方插入，保持一致性）

### 目录结构

```
src/components/dashboard/layout/
├── server-uptime.tsx   # [NEW] 服务器运行时长显示组件
├── side-nav.tsx        # [MODIFY] 在 Logo Stack 与 Divider 之间插入 ServerUptime
└── mobile-nav.tsx      # [MODIFY] 同步插入 ServerUptime（保持桌面/移动端一致）
```