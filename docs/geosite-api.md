# SmartDNS Geosite & Config API 接口文档

## 概述

本文档定义了 SmartDNS WebUI 管理**配置文件**和 **Geosite 数据文件**所需的后端 API 接口。

- **配置文件**：SmartDNS 主配置文件及 `include` 引入的子配置
- **Geosite 文件**：用于定义域名集合，可在配置中通过 `geosite-set` 和 `domain-rules` 指令引用

> **安全说明**：本文档仅包含安全的读取和更新操作，不包含创建/删除文件等高危操作。

---

## 数据模型

### ConfigFileInfo（配置文件信息）

```typescript
interface ConfigFileInfo {
  name: string;           // 配置文件名称（如 "smartdns.conf" 或 "conf.d/custom.conf"）
  path: string;           // 文件在服务器上的路径
  size?: number;          // 文件大小（字节）
  modified?: number;      // 最后修改时间戳（Unix 时间戳）
  is_main: boolean;      // 是否为主配置文件
}
```

### GeositeFileInfo（Geosite 文件信息）

```typescript
interface GeositeFileInfo {
  tag: string;           // Geosite 标签名（对应 geosite-dat 指令中的 <set_name>）
  path: string;           // 文件在服务器上的路径（本地路径或远程 URL）
  source: "local" | "remote";  // 来源：本地文件或远程 URL
  url?: string;           // 如果是远程文件，原始的 URL 地址
  size?: number;          // 文件大小（字节）
  modified?: number;      // 最后修改时间戳（Unix 时间戳）
}
```

### FileContent（文件内容）

```typescript
interface FileContent {
  name: string;           // 文件名称或标签名
  content: string;        // 文件内容（文本格式）
  encoding?: string;      // 编码格式，默认 "utf-8"
}
```

---

## API 接口列表

## 一、配置文件管理

---

### 1. 获取配置文件列表

获取服务器上所有配置文件信息（主配置 + include 的子配置）。

- **端点**: `/api/config/files`
- **方法**: `GET`
- **认证**: 需要（Bearer Token）

#### 请求参数

无

#### 响应格式

```json
{
  "files": [
    {
      "name": "smartdns.conf",
      "path": "/etc/smartdns/smartdns.conf",
      "size": 4096,
      "modified": 1714387200,
      "is_main": true
    },
    {
      "name": "conf.d/custom.conf",
      "path": "/etc/smartdns/conf.d/custom.conf",
      "size": 1024,
      "modified": 1714387300,
      "is_main": false
    }
  ]
}
```

#### 错误响应

- `401 Unauthorized` - 未认证
- `500 Internal Server Error` - 服务器错误

---

### 2. 获取配置文件内容

获取指定配置文件的文本内容。

- **端点**: `/api/config/file`
- **方法**: `GET`
- **认证**: 需要（Bearer Token）

#### 请求参数

| 参数   | 类型   | 必填 | 说明           |
| ------ | ------ | ---- | -------------- |
| `name` | string | 是   | 配置文件名称或路径 |

#### 示例请求

```
GET /api/config/file?name=smartdns.conf
GET /api/config/file?name=conf.d/custom.conf
```

#### 响应格式

```json
{
  "name": "smartdns.conf",
  "content": "bind [::]:53\nlog-level info\n...",
  "encoding": "utf-8"
}
```

#### 错误响应

- `400 Bad Request` - 缺少 `name` 参数
- `404 Not Found` - 指定的文件不存在
- `500 Internal Server Error` - 读取文件失败

---

### 3. 保存/更新配置文件内容

保存或更新指定配置文件的内容。

- **端点**: `/api/config/file`
- **方法**: `PUT`
- **认证**: 需要（Bearer Token）

#### 请求参数

| 参数       | 类型   | 必填 | 说明                     |
| ---------- | ------ | ---- | ------------------------ |
| `name`     | string | 是   | 配置文件名称或路径       |
| `content`  | string | 是   | 文件内容                 |
| `encoding` | string | 否   | 编码格式，默认 "utf-8" |

#### 请求体示例

```json
{
  "name": "smartdns.conf",
  "content": "bind [::]:53\nlog-level info\n...",
  "encoding": "utf-8"
}
```

#### 响应格式

```json
{
  "success": true,
  "message": "File saved successfully"
}
```

#### 错误响应

- `400 Bad Request` - 参数错误
- `404 Not Found` - 指定的文件不存在
- `500 Internal Server Error` - 保存文件失败

---

## 二、Geosite 文件管理

---

### 4. 获取 Geosite 文件列表

获取服务器上所有已配置的 Geosite 文件信息。

- **端点**: `/api/geosite/files`
- **方法**: `GET`
- **认证**: 需要（Bearer Token）

#### 请求参数

无

#### 响应格式

```json
{
  "files": [
    {
      "tag": "tencent",
      "path": "/smartdns/data/tencent.list",
      "source": "local",
      "size": 2048,
      "modified": 1714387200
    },
    {
      "tag": "gfw",
      "path": "https://raw.githubusercontent.com/.../gfw.list",
      "source": "remote",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.list",
      "size": 5120,
      "modified": 1714387300
    }
  ]
}
```

#### 错误响应

- `401 Unauthorized` - 未认证
- `500 Internal Server Error` - 服务器错误

---

### 5. 获取 Geosite 文件内容

根据标签名获取指定 Geosite 文件的文本内容。

- **端点**: `/api/geosite/file`
- **方法**: `GET`
- **认证**: 需要（Bearer Token）

#### 请求参数

| 参数  | 类型   | 必填 | 说明           |
| ----- | ------ | ---- | -------------- |
| `tag` | string | 是   | Geosite 标签名 |

#### 示例请求

```
GET /api/geosite/file?tag=tencent
```

#### 响应格式

```json
{
  "tag": "tencent",
  "content": "# Tencent Services\ninclude:qq.com\ninclude:tencent.com\n...",
  "encoding": "utf-8"
}
```

#### 错误响应

- `400 Bad Request` - 缺少 `tag` 参数
- `404 Not Found` - 指定的文件不存在
- `500 Internal Server Error` - 读取文件失败

---

### 6. 保存/更新 Geosite 文件内容

保存或更新指定 Geosite 文件的内容。

- **端点**: `/api/geosite/file`
- **方法**: `PUT`
- **认证**: 需要（Bearer Token）

#### 请求参数

| 参数       | 类型   | 必填 | 说明                     |
| ---------- | ------ | ---- | ------------------------ |
| `tag`      | string | 是   | Geosite 标签名           |
| `content`  | string | 是   | 文件内容                 |
| `encoding` | string | 否   | 编码格式，默认 "utf-8" |

#### 请求体示例

```json
{
  "tag": "tencent",
  "content": "# Tencent Services\ninclude:qq.com\ninclude:tencent.com\n...",
  "encoding": "utf-8"
}
```

#### 响应格式

```json
{
  "success": true,
  "message": "File saved successfully"
}
```

#### 错误响应

- `400 Bad Request` - 参数错误
- `404 Not Found` - 指定的文件不存在
- `500 Internal Server Error` - 保存文件失败

---

### 7. 从 URL 重新获取 Geosite 文件（下载/同步）

从远程 URL 下载并更新 Geosite 文件内容。适用于 `source: "remote"` 的文件。

- **端点**: `/api/geosite/file`
- **方法**: `POST`
- **认证**: 需要（Bearer Token）

#### 请求参数

| 参数    | 类型    | 必填 | 说明                                                                              |
| ------- | ------- | ---- | --------------------------------------------------------------------------------- |
| `tag`   | string  | 是   | Geosite 标签名                                                                    |
| `url`   | string  | 否   | 可选：指定新的下载 URL（如果不提供，使用已有的 URL）                              |
| `force` | boolean | 否   | 是否强制更新（忽略缓存/ETag），默认 false |

#### 请求体示例

```json
{
  "tag": "gfw",
  "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.list",
  "force": false
}
```

#### 响应格式

```json
{
  "success": true,
  "message": "File updated successfully",
  "file": {
    "tag": "gfw",
    "path": "https://raw.githubusercontent.com/.../gfw.list",
    "source": "remote",
    "size": 6144,
    "modified": 1714387500,
    "etag": "\"abc123\"",
    "last_download": 1714387500
  }
}
```

#### 错误响应

- `400 Bad Request` - 参数错误
- `404 Not Found` - 指定的文件不存在
- `400 Bad Request` - 文件不是 remote 类型（如果未提供 url）
- `502 Bad Gateway` - 下载失败（无法访问远程 URL）
- `500 Internal Server Error` - 保存下载内容失败

---

## 三、文件格式规范

---

### 配置文件格式

SmartDNS 配置文件为纯文本格式，每行一条指令：

```
# 注释以 # 开头
bind [::]:53
log-level info
cache-size 10000

# 引入子配置
include:conf.d/custom.conf

# Geosite 数据源
geosite-dat tencent /smartdns/data/tencent.list
geosite-dat gfw https://example.com/gfw.list 10

# Geosite 集合
geosite-set cn-services tencent sina

# 域名规则
domain-rules /geosite-set:cn-services/ -n cn
```

### Geosite 文件格式

Geosite 文件是纯文本文件，每行一个条目：

#### 注释

以 `#` 开头的行是注释，会被忽略：

```
# 这是注释
include:example.com  # 这也是注释
```

#### 域名条目

使用 `include:` 前缀指定域名：

```
include:qq.com
include:tencent.com
include:weixin.com
```

#### 文件格式要求

1. 文件编码：UTF-8
2. 换行符：LF (`\n`) 或 CRLF (`\r\n`)
3. 最大文件大小：建议限制为 10MB
4. 域名格式：符合 DNS 标准域名格式

---

## 错误码统一格式

所有错误响应应使用以下统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Optional additional details"
  }
}
```

### 常见错误码

| 错误码           | HTTP 状态码 | 说明                 |
| ---------------- | ----------- | -------------------- |
| `UNAUTHORIZED`   | 401         | 未认证或 Token 过期  |
| `FORBIDDEN`      | 403         | 无权限执行此操作     |
| `BAD_REQUEST`    | 400         | 请求参数错误         |
| `NOT_FOUND`      | 404         | 资源不存在           |
| `INTERNAL_ERROR` | 500         | 服务器内部错误       |
| `BAD_GATEWAY`    | 502         | 远程下载失败         |

---

## 认证

所有 API 请求都需要在 HTTP Header 中提供认证 Token：

```
Authorization: Bearer <token>
```

Token 可以通过 `/api/auth/login` 获取，通过 `/api/auth/refresh` 刷新。

---

## 实现建议

### 后端实现要点

1. **文件存储路径**：
   - 配置文件：从 SmartDNS 配置目录读取（如 `/etc/smartdns/`）
   - 本地 Geosite 文件：建议存储在 `/smartdns/data/` 或配置指定的目录
   - 文件命名建议：`<tag>.list` 或 `<tag>.geosite`

2. **远程文件缓存**：
   - 下载的远程文件应缓存在本地
   - 支持 ETag/Last-Modified 头部实现条件请求
   - 定期自动更新（可配置）

3. **并发安全**：
   - 文件读写操作需要加锁，防止并发写入冲突
   - 建议实现文件锁或使用原子操作（write to temp → rename）

4. **备份机制**：
   - 保存文件前自动创建备份（如 `<name>.conf.bak` 或 `<tag>.list.bak`）
   - 支持回滚到上一个版本（未来扩展）

5. **与 SmartDNS 配置集成**：
   - 文件保存后，可能需要触发 SmartDNS 配置重新加载
   - 考虑提供"应用配置"或"重启服务"的接口（未来扩展）

6. **解析主配置文件**：
   - 扫描主配置文件中的 `include:` 指令，获取子配置列表
   - 扫描 `geosite-dat` 指令，获取 Geosite 文件列表

### 前端集成要点

1. **API 调用封装**：
   在 `src/lib/backend/server.ts` 中添加：

   ```typescript
   // ==================== 配置文件管理 ====================

   // 获取配置文件列表
   async GetConfigFiles(): Promise<{ error?: ServerError, data?: ConfigFileInfo[] | null }> {
     const ret = await this.server.fetch<{ files: ConfigFileInfo[] }>('/api/config/files', 'GET', {}, {});
     if (ret.error) return { error: ret.error };
     return { data: ret.data?.files ?? null };
   }

   // 获取配置文件内容
   async GetConfigFile(name: string): Promise<{ error?: ServerError, data?: FileContent | null }> {
     const ret = await this.server.fetch<FileContent>(`/api/config/file?name=${encodeURIComponent(name)}`, 'GET', {}, {});
     if (ret.error) return { error: ret.error };
     return { data: ret.data ?? null };
   }

   // 保存配置文件内容
   async SaveConfigFile(name: string, content: string): Promise<{ error?: ServerError }> {
     return this.server.fetch<null>('/api/config/file', 'PUT', {}, { name, content });
   }

   // ==================== Geosite 文件管理 ====================

   // 获取 Geosite 文件列表
   async GetGeositeFiles(): Promise<{ error?: ServerError, data?: GeositeFileInfo[] | null }> {
     const ret = await this.server.fetch<{ files: GeositeFileInfo[] }>('/api/geosite/files', 'GET', {}, {});
     if (ret.error) return { error: ret.error };
     return { data: ret.data?.files ?? null };
   }

   // 获取 Geosite 文件内容
   async GetGeositeFile(tag: string): Promise<{ error?: ServerError, data?: FileContent | null }> {
     const ret = await this.server.fetch<FileContent>(`/api/geosite/file?tag=${encodeURIComponent(tag)}`, 'GET', {}, {});
     if (ret.error) return { error: ret.error };
     return { data: ret.data ?? null };
   }

   // 保存 Geosite 文件内容
   async SaveGeositeFile(tag: string, content: string): Promise<{ error?: ServerError }> {
     return this.server.fetch<null>('/api/geosite/file', 'PUT', {}, { tag, content });
   }

   // 从 URL 重新获取 Geosite 文件
   async SyncGeositeFile(tag: string, url?: string, force?: boolean): Promise<{ error?: ServerError, data?: GeositeFileInfo | null }> {
     const ret = await this.server.fetch<{ file: GeositeFileInfo }>('/api/geosite/file', 'POST', {}, { tag, url, force });
     if (ret.error) return { error: ret.error };
     return { data: ret.data?.file ?? null };
   }
   ```

---

## 版本历史

| 版本 | 日期       | 变更内容                                       |
| ---- | ---------- | ---------------------------------------------- |
| v1.0 | 2026-04-29 | 初始版本，定义配置文件和 Geosite 文件的读写接口 |
| v1.1 | 2026-04-29 | 移除创建/删除接口，仅保留安全操作              |

---

## 附录：与 SmartDNS 配置的关联

在 SmartDNS 主配置文件中，相关指令示例：

```
# 主配置文件: /etc/smartdns/smartdns.conf

# 引入子配置
include:conf.d/custom.conf

# 定义 Geosite 数据源（tag = tencent, 路径 = /smartdns/data/tencent.list）
geosite-dat tencent /smartdns/data/tencent.list

# 远程 Geosite 数据源（每 10 小时自动更新）
geosite-dat gfw https://example.com/gfw.list 10

# 定义 Geosite 集合（将多个 geosite 标签组合为一个集合）
geosite-set cn-services tencent sina blibli

# 在域名规则中引用 geosite-set
domain-rules /geosite-set:cn-services/ -n cn
```

后端在实现时，建议：

1. 解析主配置文件，自动获取 `include:` 和 `geosite-dat` 条目
2. 监听 Geosite 文件变化，自动触发配置重载（可选）
3. 提供配置语法检查接口（未来扩展）
