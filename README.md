# SmartDNS WebUI

[SmartDNS Pro Max](https://github.com/onion83/smartdns)（基于 [pymumu/smartdns](https://github.com/pymumu/smartdns) 的增强分支）的配套 WebUI 前端源码仓。

主要特性：

- 仪表盘 / 查询日志 / 上游服务器 / 终端等完整管理界面
- **Geosite 管理**：数据文件浏览、内容查看、配置管理（见 smartdns 主仓 README）
- **规则检查器**：输入域名即可查看完整规则匹配链与各上游服务器的真实查询结果
- **配置在线编辑**：主配置与子配置多文件切换编辑

基于 Next.js + MUI 构建，开发与构建：

```shell
npm install
npm run dev      # 开发
npm run build    # 构建
```

## License

MIT
