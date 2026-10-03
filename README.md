# SaaS Starter

[English](./README.en.md) | 简体中文

自用 SaaS 项目模板，包含独立前台和管理后台，共享认证、数据库、支付和存储模块。适合复制后开发新产品；品牌、商品、业务权益和法律文案需要按新项目调整。

## 技术栈

| 层级 | 技术与用途 |
| --- | --- |
| 语言与运行环境 | TypeScript、Node.js 24、React 19 |
| 项目管理 | pnpm 11 workspace、Turborepo，管理两个应用和共享包 |
| Web 框架 | TanStack Start / Router，文件路由、服务端渲染和服务端接口 |
| 构建与部署 | Vite、Nitro、Vercel，前台与后台独立部署 |
| 样式 | Tailwind CSS 4 |
| 业务接口 | oRPC + TanStack Query，类型安全接口与客户端查询缓存；Zod 校验输入 |
| 认证 | Better Auth，使用 Drizzle 数据库适配器 |
| 数据库 | PostgreSQL、Drizzle ORM / Kit；本地通过 Docker Compose 运行 PostgreSQL 18 |
| 国际化与内容 | Paraglide，中英文消息；React Markdown + remark-gfm 渲染博客 |
| 代码检查 | Oxlint、Oxfmt、TypeScript |
| 环境变量 | @t3-oss/env-core + Zod，区分服务端与浏览器配置 |

## 已接入的基础设施

| 能力 | 服务 / 实现 | 当前范围 |
| --- | --- | --- |
| 用户认证 | Better Auth、Google OAuth | 邮箱注册与登录、Google 登录、找回密码，重置密码后撤销会话 |
| 防机器人 | Cloudflare Turnstile | 邮箱注册、登录和找回密码接口验证，检查 action 与允许的 hostname |
| 事务邮件 | Resend | 发送密码重置邮件，需配置 API key、发件人和发信域名 |
| 支付与订阅 | Waffo Pancake SDK | 一次性商品与订阅结账、Webhook 验签、事件去重、订单与订阅状态存储 |
| 图片存储 | Cloudflare R2、AWS S3 SDK | 后台获取预签名 PUT 地址上传博客图片，通过公共域名访问 |
| 管理后台 | 独立 Better Auth 会话、管理员邮箱白名单 | 用户启用 / 禁用、支付与订阅记录、博客管理、审计日志 |
| 错误监控 | Sentry | 前台浏览器与服务端错误监控接线，需配置 DSN；构建插件已接入 |
| 访问分析 | Google Analytics 4、Microsoft Clarity | 前台按环境变量加载访问分析与会话分析脚本 |
| 内容与 SEO | 中英文博客、Markdown、sitemap、robots、基础元信息 | 提供博客发布入口和搜索引擎基础配置 |

支付模块不包含积分、配额、会员权限等业务权益。新项目需要根据确认后的订单与订阅状态实现权益发放、撤销和退款规则。Sentry、GA4、Clarity 的接线已存在，是否启用取决于对应配置。

## 项目结构

```text
apps/
  web/          # 用户前台，localhost:3001
  admin/        # 管理后台，localhost:3002
packages/
  api/          # 前台 oRPC 路由与上下文
  auth/         # 用户认证、Waffo 结账与事件处理
  db/           # 数据库连接、schema、Drizzle 和本地数据库
  env/          # 环境变量加载与校验
  storage/      # R2 博客图片预签名上传
  config/       # 共享 TypeScript 配置
```

后台 oRPC 路由位于 `apps/admin/src/server`。两个应用共享数据库，但后台使用独立的认证地址、密钥与 Cookie 前缀。

## 本地启动

准备 Node.js 24、pnpm 11.26.0 和 Docker。

```bash
pnpm install
cp apps/web/env.local.example apps/web/env.local
```

填写 `apps/web/env.local` 后运行：

```bash
pnpm db:start
pnpm db:push
pnpm dev
```

前台地址为 <http://localhost:3001>，后台地址为 <http://localhost:3002>。本地 PostgreSQL 使用 `localhost:5433`。后台默认也会读取前台的 `env.local`，需要覆盖时可创建 `apps/admin/env.local`。

示例文件中的空值需要替换。当前环境校验要求 Google、Turnstile、Resend、Waffo 和 R2 等服务配置，不能只填写数据库连接就启动完整应用。

## igame9 结构与部署

本仓库是 monorepo：根目录是游戏目录站（前台 `apps/web`、后台 `apps/admin`），`static/` 是原 igame9 静态游戏页（每个关键词一个页面，自带构建脚本）。

```bash
pnpm sync:static           # 本地：构建 static/，把游戏页复制进 apps/web/public 并写入数据库
pnpm sync:static --files   # 只复制文件（Docker 构建时用，不需要数据库）
pnpm sync:static --db      # 只写数据库（容器启动时用）
```

静态页仍在 `/<slug>/` 原样输出（页头注入 Submit 链接），在 `game` 表里记为 plan=own；描述少于 50 字的半成品页会被跳过。静态站的首页、sitemap、robots 不复制，由本应用动态生成。新增或修改游戏页：改 `static/data/pages/*.mjs`，提交后部署会自动同步。

数据库结构变更：改 `packages/db/src/schema` 后运行 `pnpm db:generate` 生成迁移文件并提交；生产容器启动时 `pnpm db:migrate` 只应用新迁移。

### AnySites 部署

仓库自带 `Dockerfile`：构建时同步静态页并构建前台，启动时执行迁移、同步游戏表、在 3000 端口启动。推送到 `main` 即自动部署。必需环境变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | AnySites 分配的 PostgreSQL |
| `BETTER_AUTH_SECRET` | 32 位以上随机字符串 |
| `BETTER_AUTH_URL` | 站点地址，如 `https://igame9.ai` |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` / `TURNSTILE_HOSTNAMES` | Cloudflare Turnstile，hostnames 填站点域名 |
| `ADMIN_EMAILS` | 管理员邮箱 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe；Webhook 地址 `/api/webhooks/stripe`，事件 `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`charge.refunded` |
| `FEATURED_LISTING_PRICE_USD` | 付费推荐收录价格（美元，默认 29） |

可选：`GOOGLE_CLIENT_ID/SECRET`（Google 登录，后台登录也需要）、`RESEND_API_KEY/RESEND_FROM`（找回密码邮件）、`R2_*`（后台博客图片上传）。

## 服务配置

所有变量以 [`apps/web/env.local.example`](./apps/web/env.local.example) 为准。

- 数据库与认证：设置 `DATABASE_URL`、`BETTER_AUTH_URL` 和至少 32 字符的 `BETTER_AUTH_SECRET`。生产后台必须设置独立的 `ADMIN_BETTER_AUTH_URL` 与 `ADMIN_BETTER_AUTH_SECRET`；`ADMIN_EMAILS` 使用逗号分隔。
- Google OAuth：设置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，分别登记前台与后台的 `/api/auth/callback/google` 回调地址。
- Turnstile：设置 `VITE_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET` 与逗号分隔的 `TURNSTILE_HOSTNAMES`，在服务控制台配置对应域名。
- Resend：设置 `RESEND_API_KEY`、`RESEND_FROM`，使用已验证的发信域名。
- Waffo：设置商户 ID、私钥、store ID、成功回跳地址和 `WAFFO_ENVIRONMENT`，支持 `test` / `prod`。`WAFFO_PRODUCTS` 是商品 JSON 数组，包含 `id`、`name`、`type`，类型为 `onetime` 或 `subscription`。Webhook 地址为 `https://<web-domain>/api/webhooks/waffo`。
- R2：设置账号 ID、访问密钥、bucket 与 `R2_PUBLIC_BASE_URL`。为 bucket 配置上传来源的 PUT CORS，并确认公共图片地址可访问。
- 监控与分析：`VITE_SENTRY_DSN` 用于浏览器，`SENTRY_DSN` 用于服务端；Sentry 构建配置使用 `SENTRY_ORG`、`SENTRY_PROJECT`、`SENTRY_AUTH_TOKEN`。GA4 与 Clarity 分别使用 `VITE_GA_MEASUREMENT_ID`、`VITE_CLARITY_PROJECT_ID`。

`VITE_` 前缀的变量会进入浏览器构建，只用于公开配置，服务端密钥不要使用该前缀。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 同时启动前台和后台 |
| `pnpm build` | 通过 Turborepo 构建应用 |
| `pnpm check-types` | 运行类型检查 |
| `pnpm check` | 运行 Oxlint 和 Oxfmt 检查 |
| `pnpm db:start` / `pnpm db:stop` | 启动 / 停止本地数据库 |
| `pnpm db:push` | 将当前 schema 同步到配置的数据库 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 新项目与部署

1. 使用全新 Git 历史创建项目，修改包名、站点名称、首页、应用页和样式。
2. 使用新项目自己的服务账号、域名、密钥与存储桶，配置商品和业务权益。
3. 补齐法律页面、隐私说明与退款规则，在真实支付环境验证 Webhook 字段和订阅状态后再开放支付。
4. 在 Vercel 创建两个项目，根目录分别设为 `apps/web` 和 `apps/admin`，分别填写所需环境变量。浏览器变量需要在构建前配置。
5. schema 变更时使用目标环境的 `DATABASE_URL` 执行 `pnpm db:push`，执行前确认数据库目标。
6. 在 Google Search Console 验证新域名并提交 `/sitemap.xml`。
