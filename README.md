# AI API 中转站集合导航

> 汇聚优质 AI API 接口，一站式中转与调用指南

一个基于 Astro 构建的静态导航网站，收录各类 AI API 中转服务，提供分类浏览、搜索筛选和详情查看功能。

## ✨ 特性

- 🚀 **零 JS 运行时** — 基于 Astro SSG，首屏极速加载
- 🔍 **SEO 友好** — 自动生成 sitemap、robots.txt，每页独立 meta 标签和结构化数据
- 📱 **响应式设计** — 移动端、平板、桌面端完美适配
- 🔄 **自动化更新** — GitHub Actions 定时健康检查与数据更新
- 🏷️ **分类筛选** — 支持按分类浏览和关键词搜索
- 📊 **数据校验** — Zod Schema 严格校验，确保数据完整性

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Astro 5.x](https://astro.build) | 静态站点框架 |
| [Tailwind CSS](https://tailwindcss.com) | 样式系统 |
| [Content Collections](https://docs.astro.build/en/guides/content-collections/) | 数据管理 + Zod 类型校验 |
| [GitHub Actions](https://github.com/features/actions) | 定时数据更新 |

## 📁 项目结构

```text
ai-api-hub/
├── .github/workflows/
│   └── update-apis.yml       # API 数据自动更新工作流
├── public/
│   ├── favicon.ico
│   └── favicon.svg
├── scripts/
│   ├── collect-apis.ts       # 数据采集与健康检查
│   ├── sources.json          # 数据源配置
│   └── validate-data.ts      # API 数据校验
├── src/
│   ├── components/           # 页面组件
│   ├── content/apis/         # API JSON 数据
│   ├── layouts/              # 页面布局
│   ├── pages/                # 首页、详情页与 robots.txt
│   ├── styles/               # 全局样式
│   └── content.config.ts     # Content Collections Schema
├── astro.config.mjs          # Astro、sitemap 与 Tailwind 配置
├── package.json
└── tailwind.config.mjs
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/ai-api-hub.git
cd ai-api-hub

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

### 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 本地预览构建结果 |
| `pnpm update:apis` | 运行数据采集与健康检查 |
| `pnpm validate:data` | 校验所有 API 数据 |

## 📝 数据管理

### 添加新 API

在 `src/content/apis/` 目录下创建新的 JSON 文件：

```json
{
  "name": "API 名称",
  "description": "简短描述（最多 200 字）",
  "url": "https://api-url.com",
  "docsUrl": "https://api-url.com/docs",
  "models": ["model-1", "model-2"],
  "category": "openai-compatible",
  "tags": ["标签1", "标签2"],
  "authType": "api-key",
  "pricing": "freemium",
  "hasFreeQuota": true,
  "status": "active",
  "lastVerified": "2026-09-01T00:00:00Z",
  "addedAt": "2026-09-01T00:00:00Z",
  "weight": 50
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | API 服务名称 |
| description | string | ✅ | 简短描述（最多 200 字） |
| url | string | ✅ | 服务访问地址 |
| docsUrl | string | ❌ | API 文档地址 |
| models | string[] | ❌ | 支持的模型列表 |
| category | enum | ✅ | 分类（见下方可选值） |
| tags | string[] | ❌ | 标签列表 |
| authType | enum | ✅ | 认证方式：api-key / oauth / token / free / mixed |
| pricing | enum | ❌ | 定价：free / freemium / paid / pay-as-you-go |
| hasFreeQuota | boolean | ❌ | 是否有免费额度 |
| status | enum | ❌ | 状态：active / maintenance / deprecated |
| lastVerified | datetime | ✅ | 最后验证时间（ISO 8601） |
| addedAt | datetime | ✅ | 收录时间（ISO 8601） |
| weight | number | ❌ | 排序权重（越大越靠前） |

### 可用分类

| 值 | 说明 |
|----|------|
| openai-compatible | OpenAI 兼容 API |
| multi-provider | 多模型聚合 |
| claude-api | Claude API |
| image-gen | 图像生成 |
| speech | 语音合成 |
| embedding | 向量嵌入 |
| other | 其他 |

### 数据更新方式

1. **手动更新**：直接编辑 JSON 文件并提交
2. **自动更新**：GitHub Actions 每周一自动运行健康检查
3. **社区贡献**：提交 PR 添加新的 API

## 🚀 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. Vercel 自动检测 Astro 项目，无需额外配置
4. 点击 Deploy 即可

Vercel 会自动设置：

- 构建命令：`astro build`（或使用 package.json 中的 build script）
- 输出目录：`dist/`
- Node.js 版本：20

### Cloudflare Pages 部署

1. 将代码推送到 GitHub 仓库
2. 在 [Cloudflare Pages](https://pages.cloudflare.com) 创建新项目
3. 连接 GitHub 仓库
4. 配置构建设置：
   - 构建命令：`pnpm build`
   - 构建输出目录：`dist/`
   - Node.js 版本：20
5. 点击 Save and Deploy

### 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `GITHUB_TOKEN` | GitHub Actions 推送代码（自动提供） | 仅 CI |

> 注意：如果使用自定义域名，请在 `astro.config.mjs` 中更新 `site` 配置。

## 🔄 自动化更新

项目配置了 GitHub Actions 工作流（`.github/workflows/update-apis.yml`），功能包括：

- **定时执行**：每周一 UTC 02:00 自动运行
- **手动触发**：在 GitHub Actions 页面手动运行
- **健康检查**：检测所有 API 服务的可用性
- **自动提交**：如有数据变更，自动提交到 main 分支
- **触发重新部署**：推送后自动触发 Vercel/Cloudflare 重新构建

## 📄 License

MIT
