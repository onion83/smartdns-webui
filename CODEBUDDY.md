# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Project Overview

SmartDNS WebUI — a management dashboard for the SmartDNS DNS proxy server. Built with Next.js 16 (App Router), React 19, MUI 7, TypeScript, and TanStack Query. The UI is a **pure client-side SPA** that communicates with a separate SmartDNS backend via REST API.

## Build & Development Commands

- `npm run dev` — Start dev server (proxies `/api/*` to `http://127.0.0.1:6080`, backend must be running)
- `npm run build` — Lint then produce static export (`next build` with `output: 'export'`)
- `npm run lint` — ESLint on `src/`
- `npm run lint:fix` — ESLint with auto-fix
- `npm run typecheck` — TypeScript type-check (`tsc --noEmit`, no emit)
- `npm run format:check` — Prettier dry-run
- `npm run format:write` — Prettier auto-format

No test runner is configured. No test scripts in `package.json`.

## Architecture

### Dual-Mode Next.js Config (`next.config.mjs`)

- **Dev mode**: `rewrites` proxy all `/api/*` requests to `http://127.0.0.1:6080` (SmartDNS Rust plugin backend must be running locally). No CORS needed — same-origin proxy.
- **Production mode**: `output: 'export'` — fully static SPA with no SSR. The built `out/` directory is served directly by the SmartDNS Rust plugin's embedded HTTP server (Hyper). API requests go to same-origin `/api/`.

### Authentication Chain

The auth system forms a closed loop across 3 files:

1. **`AuthClient`** (`src/lib/auth/client.ts`) — manages JWT token lifecycle:
   - Login → `smartdnsServer.Login()` → backend returns `{token, token_type, expires_in}`
   - Frontend wraps backend token into a local token: `{randomHex, expiresAt}` stored in `localStorage('custom-auth-token')`
   - 60-second interval auto-refreshes via `smartdnsServer.RefreshToken()`, re-wrapping the local token
   - Token expiry triggers `signOut()`

2. **`DataServer.fetch()`** (`src/lib/backend/server.ts`) — base HTTP method:
   - Uses `credentials: 'include'` (cookie-based session)
   - On 401 response, auto-calls the `signOut` callback (injected at construction via `smartdnsServer.setSignOut(authClient.signOut)`)
   - Returns `{ error?, data? }` tuples for all API methods

3. **`AuthGuard`** (`src/app/dashboard/layout.tsx`) — wraps all `/dashboard/*` routes, calls `authClient.checkLogin()`, redirects to `/auth/sign-in` on failure.

The chain: `AuthGuard` → `AuthClient.checkLogin()` → `SmartDNSAPI` → `DataServer.fetch()` → 401 → `DataServer.signOut()` → `AuthClient.signOut()` → clear localStorage → redirect to sign-in.

### Backend API Layer (`src/lib/backend/server.ts`)

`SmartDNSAPI` class (singleton `smartdnsServer`) wraps all REST API calls. Key method groups:

| Group | Methods | Paths |
|-------|---------|-------|
| Auth | Login, Logout, RefreshToken, CheckLoginStatus, UpdatePassword | `/api/auth/*` |
| Stats | GetOverView, GetHourlyQueryCount, GetDailyQueryCount, GetTopDomains, GetTopClients | `/api/stats/*` |
| Query Log | GetQueryLogs (complex URLSearchParams) | `/api/domain` |
| Clients | GetClients, DeleteClientById | `/api/client/*` |
| Upstream | GetUpstreamServers | `/api/upstream-server` |
| Cache | FlushCache, CacheFlush, CacheCount, GetCacheDomains | `/api/cache/*` |
| Settings | GetSettings, UpdateSettings | `/api/config/settings` |
| Config Files | GetConfFiles, GetConfigFile, SaveConfigFile, ValidateConfig | `/api/config/*` |
| Domain Rule Check | CheckDomainRule | `/api/config/check-domain-rule?domain=...` |
| Geosite | GetGeositeList, GetGeositeFile, SaveGeositeFile, DownloadGeositeFile, DownloadGeositeFiles | `/api/config/geosite/*` |
| Service | RestartServer, GetVersion, GetLogLevel, SetLogLevel | `/api/service/*`, `/api/server/*`, `/api/log/*` |

All request/response types are defined in `src/lib/backend/server.ts`.

### CheckDomainRule Feature

Full-stack feature for debugging DNS resolution chains:

- **C side** (`dns_conf/domain_rule.c`): `dns_conf_resolve_domain()` runs rule matching, fills server list, queries each server synchronously (UDP/TCP/TLS/HTTPS supported; QUIC/HTTP3/mDNS skipped), selects final result by priority (first with IPs → first with CNAME → first with rcode)
- **Rust side** (`plugin/smartdns-ui/src/smartdns.rs`): FFI call to C, converts `domain_rule_resolve_chain` struct to JSON. Critical: `#[repr(C)]` structs must match C layout exactly (past SIGSEGV was caused by missing `server_meta` field)
- **Frontend** (`check-domain-rule-panel.tsx`): 4-section visualization — Rule Match Flow (Chip chain), Action Details, Per-Server Results (Table), Final Result (Card). Condition for showing query results: `(hasNameserver || !hasAddress)` — both NAMESERVER and NONE (PASS) actions display the table.

### Routing & Layout

Next.js App Router:
- `/` → redirects to `/dashboard`
- `/auth/sign-in` — login page
- `/dashboard` — `AuthGuard` + `ClientLayout` (sidebar + top nav)
  - Sub-pages: overview, query-log, upstream-servers, clients, settings, log, term (xterm)

Root layout (`src/app/layout.tsx`): `LocalizationProvider` → `UserProvider` → `ThemeProvider` → children

### Theme System (`src/styles/theme/`)

- **CSS variable mode**: `colorSchemeSelector: "class"` — light/dark toggle via CSS class
- **Custom palette extensions**: `neutral` (gray), `toolbar` (nav colors + navItem), `dashboard` (6 chart color mappings)
- Light primary = `lightenedGrassGreen`; Dark primary = `neonBlue`
- Component overrides in `theme/components/` directory (avatar, button, card, link, tab, table, etc.)
- Breakpoints: xs=0, sm=600, md=900, lg=1200, xl=1440; border-radius: 8px

### i18n

`react-i18next` + `i18next-browser-languagedetector`. Translation files in `public/locales/` (zh-CN, de-DE). `LocalizationProvider` wraps root layout. No `src/locales/` directory — all translations are in `public/locales/`.

### Data Fetching

TanStack React Query used per-component. `CheckDomainRulePanel` has its own `QueryClientProvider` with isolated `QueryClient` (gcTime=0, retry=false, refetchOnWindowFocus=false). Other dashboard components use the shared provider from root layout.

Charts: ApexCharts + Chart.js (with zoom, annotation, date-fns plugins).

### Settings Panels

`src/components/dashboard/settings/` contains: `settings-tab.tsx` (tab container), `main-config-panel.tsx` (config file editor with CodeMirror), `geosite-config-panel.tsx` (geosite dat file management), `check-domain-rule-panel.tsx` (domain rule debugger), `update-password-form.tsx`, `change-lang.tsx`, `notifications.tsx`. CodeMirror language definition for SmartDNS config is in `config-languages/smartdns.ts`.

### Path Aliases & Code Style

- `@/*` maps to `./src/*` (tsconfig.json + ESLint)
- Prettier import order: `node:` → `react/next` → third-party → `@/` groups (types, config, lib, hooks, components, styles) → relative paths
- Tabs for indentation, LF line endings, 120 char print width, ES5 trailing commas, double quotes
- ESLint: unused vars prefixed with `_` allowed; many unicorn rules disabled (see `eslint.config.mjs`)
- `toSorted()` preferred over `.sort()` (ESLint rule)

### SmartDNS Backend Context

The backend is a C-language DNS proxy (~265 source files, ~100K lines). The WebUI plugin (`plugin/smartdns-ui/`) is a Rust cdylib loaded via `dlopen/dlsym`, running an embedded Hyper HTTP server + SQLite inside the smartdns process. Plugin crashes propagate to the main process (no isolation). The `--check-domain-rule` CLI flag and `/api/config/check-domain-rule` API share the same C code path (`dns_conf_resolve_domain`).

### Docker Build & Testing

Docker image must use legacy builder (BuildKit fails pulling base images):
```bash
DOCKER_BUILDKIT=0 docker build -f Dockerfile.dynamic-x86_64 --platform linux/amd64 -t smartdns-dynamic-x86_64 .
```
Base image (one-time):
```bash
docker buildx build -f Dockerfile.builder-base --platform linux/amd64 -t smartdns-builder-x86_64-base .
```

**Container startup test** (kill old container first):
```bash
docker stop $(docker ps -q --filter ancestor=smartdns-dynamic-x86_64) 2>/dev/null
docker run --platform linux/amd64 --rm -d \
  -v /Users/onion/C/smartdns/smartdns-geosite-ui.conf:/etc/smartdns/smartdns.conf \
  -v /Users/onion/C/smartdns/data:/smartdns/data \
  -v /tmp/smartdns-lib:/var/lib/smartdns \
  -p 53:53/udp -p 53:53 -p 6080:6080 \
  smartdns-dynamic-x86_64 smartdns -f -x
```

#### Docker 构建踩坑记录

1. **Legacy builder 层缓存问题**: `DOCKER_BUILDKIT=0 docker build --no-cache` 不一定生效。修改 C 源码后重建，镜像中的二进制可能仍是旧版本。**验证方法**: `strings /usr/sbin/smartdns | grep "特定字符串"` 检查二进制是否包含新代码中的字符串。

2. **可靠的增量构建方案** (当 legacy builder 缓存异常时):
   ```bash
   # 1. 启动 base 容器，挂载源码
   docker run --platform linux/amd64 --rm -it \
     -v /Users/onion/C/smartdns:/build \
     smartdns-builder-x86_64-base bash
   # 2. 容器内编译
   cd /build && make clean && make
   # 3. 新终端：docker commit 创建运行镜像
   docker commit <container_id> smartdns-dynamic-x86_64:manual
   ```
   这样保证编译产物一定是最新的。

3. **heredoc Dockerfile 在 macOS 上不可用**: `docker build - << EOF ... COPY /tmp/binary ... EOF` 会失败，因为 macOS arm64 主机无法 COPY x86 二进制。用 `docker commit` 替代。

4. **容器内调试技巧**: 外部 `dig` 测试可能因网络/超时产生误导。应进入容器内部用 `curl http://127.0.0.1:6080/api/...` 直接测试，并用 `dmesg | grep -c segfault` 或 `journalctl -u docker` 观察崩溃次数。

### dualstack.c TCP Loopback 崩溃修复

**根因**: `speed-check-mode tcp` 启用时，`dualstack.c` 中 `dns_server_check_ipv6_ready()` 用 `fast_ping_start(PING_TYPE_TCP, "::1", count=1)` 做 IPv6 就绪检测。`count=1` TCP ping 到 loopback 瞬间完成，worker 线程调用 `_fast_ping_host_remove()` 释放 `ping_host`，然后 `fast_ping_stop()` 访问已释放内存 → SIGSEGV。

**修复**: `dualstack.c` 中新增 `_check_ipv6_tcp_loopback()` 函数，用同步 `socket(AF_INET6) + connect(::1) + close()` 替代异步 `fast_ping_start/stop`，消除 use-after-free 竞态。

**两种触发路径**:
1. 启动时: `dns_server_check_ipv6_ready()` → dualstack IPv6 检测
2. 查询时: `_dns_server_ping()` 对 IPv6 地址做 count=1 TCP ping（此路径调用者不持有 ping_host 指针，无 use-after-free，但 `ping [IPv6]:80 with tcp` 日志后可能紧跟 dualstack 路径的崩溃）