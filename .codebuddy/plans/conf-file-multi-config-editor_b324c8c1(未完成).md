---
name: conf-file-multi-config-editor
overview: 移除硬编码 smartdns.conf 限制，后端新增 conf-file 列表 API，前端改为多文件 Chip 平铺切换编辑
todos:
  - id: backend-rust-fileops
    content: Rust 后端：Cargo.toml 添加 glob 依赖，file_ops.rs 新增 ConfFileInfo、parse_conf_files()、read/write_config_file()
    status: pending
  - id: backend-rust-api
    content: Rust 后端：http_server_api.rs 新增 conf-files 端点、移除 file 端点硬编码限制并添加路径安全校验
    status: pending
    dependencies:
      - backend-rust-fileops
  - id: frontend-types-api
    content: 前端：server.ts 新增 ConfFileInfo 类型和 GetConfFiles() API 方法
    status: pending
    dependencies:
      - backend-rust-api
  - id: frontend-panel
    content: 前端：重写 main-config-panel.tsx 为多文件 Chip 平铺切换编辑器
    status: pending
    dependencies:
      - frontend-types-api
---

## 需求概述

WebUI 主配置文件设置页改造：从硬编码单文件编辑变为动态多文件编辑器。

## 核心功能

- 动态从后端获取主配置文件名（不再前端硬编码 smartdns.conf）
- 自动解析主配置文件中的 `conf-file` 指令，发现子配置文件
- 主配置文件与子配置文件以不同颜色 Chip 平铺显示在一行
- 点击 Chip 切换编辑对应配置文件，共用同一个编辑器

## UI 效果

顶部一行平铺 Chip：

- 主配置文件：primary 色调 Chip（如蓝色）
- 子配置文件：secondary/warning 色调 Chip（如橙色/绿色）
- 当前选中的 Chip 使用 filled variant，未选中使用 outlined variant
- 切换文件时编辑器内容随之切换，脏状态独立跟踪

## 技术栈

- 前端：Next.js 16 + React 19 + MUI 7 + TanStack Query + TypeScript
- 后端：Rust (cdylib 插件) + Hyper HTTP

## 实现方案

### 整体策略

采用方案 B（Rust 端解析），不修改 C 代码。原因：C 侧 `conf_file_table` 在配置加载后被立即销毁，无法查询；而主配置文件是纯文本，Rust 端正则解析 `conf-file` 行 + glob 展开即可，无需改 C 代码和重编译 smartdns 本体。

### 后端改动（Rust 插件）

#### 1. 新增 `glob` 依赖

`Cargo.toml` 添加 `glob = "0.3"` 用于 conf-file 的通配符展开（如 `conf-file *.conf`）。

#### 2. `file_ops.rs` — 新增 conf-file 解析 + 通用文件读写

- **新增 `ConfFileInfo` 结构体**：`{ name: String, path: String, type: "main" | "sub" }`
- **新增 `parse_conf_files()` 函数**：

1. 通过 FFI `conf_get_conf_file()` 获取主配置文件路径
2. 读取主配置文件内容，逐行解析 `conf-file` 指令（跳过注释和空行）
3. 处理 `-group` 选项（跳过，仅提取文件路径参数）
4. 相对路径基于主配置文件所在目录解析
5. 使用 `glob` crate 展开通配符模式
6. 去重 + 过滤只保留普通文件
7. 返回 `Vec<ConfFileInfo>`，主配置文件始终为第一个元素

- **新增 `read_config_file(path)` 函数**：通用读取任意配置文件（不仅限于 smartdns.conf）
- **新增 `write_config_file(path, content)` 函数**：通用写入任意配置文件
- **保留** `read_main_config()` / `write_main_config()` 不删除（避免影响其他调用方）

#### 3. `http_server_api.rs` — API 端点改造

- **新增 `GET /api/config/conf-files`**：调用 `parse_conf_files()` 返回文件列表
- 响应：`{ "files": [{ "name": "smartdns.conf", "path": "/etc/smartdns/smartdns.conf", "type": "main" }, { "name": "misc.conf", "path": "/etc/smartdns/misc.conf", "type": "sub" }] }`
- **修改 `api_config_get_file`**：
- 移除 `path != "smartdns.conf"` 硬编码检查
- 改用安全校验：路径必须位于主配置文件所在目录下（防止路径遍历攻击）
- 调用新的 `read_config_file(path)` 代替 `read_main_config()`
- **修改 `api_config_put_file`**：
- 同样移除硬编码检查 + 添加安全校验
- 调用新的 `write_config_file(path, content)` 代替 `write_main_config()`

### 前端改动

#### 4. `server.ts` — 新增类型和 API 方法

- **新增 `ConfFileInfo` 类型**：`{ name: string, path: string, type: "main" | "sub" }`
- **新增 `GetConfFiles()` 方法**：`GET /api/config/conf-files`
- `GetConfigFile(path)` / `SaveConfigFile(path)` 已存在且通用，无需改动

#### 5. `main-config-panel.tsx` — 重写为多文件编辑器

核心改造逻辑：

- `useQuery` 获取 conf-files 列表
- 默认选中第一个文件（主配置）
- 顶部 Chip 行：主配置用 `color="primary"` + `variant={selected ? "filled" : "outlined"}`，子配置用 `color="success"` 或 `color="warning"` + 同样 variant 逻辑
- 切换文件时用 `useQuery({ queryKey: ["config", "file", filePath], enabled: !!filePath })` 加载内容
- 保存时调用 `SaveConfigFile(filePath, content)` + `invalidateQueries` 刷新
- 脏状态（isModified）需在切换文件前提示未保存变更

## 实现备注

- **路径安全**：后端校验路径必须以主配置文件目录为前缀，且不含 `..`，防止路径遍历
- **glob 依赖**：`glob` crate 是成熟稳定的 Rust crate，Cargo.toml 中 `glob = "0.3"` 即可
- **conf-file 解析**：正则匹配 `^\s*conf-file\s+` 行，跳过 `-group` 选项提取文件路径模式，与 C 端 `config_additional_file()` 逻辑对齐
- **ESLint**：使用 `toSorted()` 而非 `sort()`，unused 变量加 `_` 前缀

## 目录结构

```
# 后端 (smartdns 插件)
/Users/onion/C/smartdns/plugin/smartdns-ui/
├── Cargo.toml                          # [MODIFY] 添加 glob = "0.3" 依赖
├── src/
│   ├── file_ops.rs                     # [MODIFY] 新增 ConfFileInfo、parse_conf_files()、read_config_file()、write_config_file()
│   └── http_server_api.rs              # [MODIFY] 新增 conf-files 端点、移除 file 端点硬编码

# 前端 (WebUI)
/Users/onion/C/smartdns-webui/
└── src/
    ├── lib/backend/
    │   └── server.ts                   # [MODIFY] 新增 ConfFileInfo 类型、GetConfFiles() 方法
    └── components/dashboard/settings/
        └── main-config-panel.tsx       # [MODIFY] 重写为多文件 Chip 切换编辑器
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索 Rust 插件中 `conf-file` 解析相关的模式和安全校验最佳实践
- Expected outcome: 确认路径安全校验逻辑的实现细节和 conf-file 解析边界情况