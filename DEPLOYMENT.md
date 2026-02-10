# AI4ECPP - Railway 部署指南

本指南介绍如何将 AI4ECPP 部署到 Railway，使其成为公开可访问的网站。

## 前置准备

1. **Railway 账号**：前往 [railway.app](https://railway.app) 注册
2. **GitHub 仓库**：将项目推送到 GitHub（Railway 从 GitHub 部署）
3. **OpenAI API Key**：从 [OpenAI API Keys](https://platform.openai.com/api-keys) 获取

## 部署步骤

### 1. 连接 GitHub

1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 授权 Railway 访问你的 GitHub
4. 选择 AI4ECPP 项目仓库

### 2. 配置环境变量

在 Railway 项目 → 选择服务 → **Variables** 中添加：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | 你的 OpenAI API 密钥 |
| `JWT_SECRET` | ✅ | JWT 签名密钥，可用 `openssl rand -base64 32` 生成 |
| `NODE_ENV` | - | 自动设为 `production` |
| `FRONTEND_URL` | - | 部署后填写你的 Railway 域名（如 `https://xxx.railway.app`）|

**重要**：`OPENAI_API_KEY` 和 `JWT_SECRET` 不要泄露，不要提交到 Git。

### 3. 部署

- Railway 会自动检测 `Dockerfile` 并执行构建
- 构建完成后会自动部署
- 首次构建可能需 5–10 分钟（含 Python/PyTorch 依赖）

### 4. 获取公开 URL

1. 在 Railway 项目中选择你的服务
2. 点击 **Settings** → **Networking** → **Generate Domain**
3. Railway 会分配一个 `xxx.railway.app` 域名
4. 用浏览器访问该 URL 即可使用

### 5. 配置 FRONTEND_URL（可选）

如果启用了自定义域名或需要 CORS，将 `FRONTEND_URL` 设为你的实际前端访问地址。

### 6. 用户数据持久化（可选）

若希望注册/登录用户在重启或重新部署后仍保留，可添加 PostgreSQL 数据库：

1. 在 Railway 项目中点击 **+ New** → **Database** → **PostgreSQL**
2. 创建完成后，点击该 PostgreSQL 服务 → **Variables**，复制或查看 `DATABASE_URL`
3. 在 **AI4ECPP 应用服务** 中 → **Variables** → **Add Variable**（或从 Postgres 服务 **Connect** 到应用），确保应用能拿到 **DATABASE_URL**
4. 若 Railway 未自动注入，可手动添加变量：名称 `DATABASE_URL`，值为 PostgreSQL 提供的连接字符串
5. 保存后 Railway 会重新部署；启动日志中若出现 `Database connected (users will persist)` 即表示已启用数据库存储

未设置 `DATABASE_URL` 时，用户数据仍使用内存存储，重启后会丢失。

**RAG 知识库**：使用同一 PostgreSQL 数据库。需确保数据库支持 **pgvector** 扩展（Neon、Supabase 等均支持）。首次启动时会自动执行 `CREATE EXTENSION vector` 并创建 `rag_documents`、`rag_chunks` 表。

## 项目结构说明

- **Dockerfile**：构建 Node.js + Python 环境，包含前端构建与后端服务
- **railway.toml**：Railway 配置（健康检查等）
- **server/server.js**：生产环境下会托管前端静态文件，前后端同域部署

## 成本说明

- Railway 提供约 $5/月免费额度
- 超出后按用量计费（CPU、内存、流量等）
- OpenAI API 调用费用单独由 OpenAI 收取

## 常见问题

### 构建失败：Python 依赖安装超时

PyTorch 体积较大，首次构建可能较慢。若多次超时，可考虑在 `Dockerfile` 中使用 `--no-cache-dir` 减小缓存占用。

### Policy DL Agent 报错 "Python is not installed"

确认 Dockerfile 已正确安装 Python 及 `server/scripts/` 下的依赖。本地可运行 `pip3 install -r server/scripts/requirements.txt` 和 `pip3 install -r server/scripts/policy_dl_agent/requirements.txt` 验证。

### 用户注册后重启丢失

在 Railway 中为项目添加 **PostgreSQL** 数据库，并在应用的环境变量中配置 **DATABASE_URL**（见上文「用户数据持久化」）。配置成功后用户数据会写入数据库，重启与重新部署后仍保留。

### API 请求跨域错误

前后端已同域部署，正常情况下不会有 CORS 问题。若仍有跨域报错，检查 `FRONTEND_URL` 是否与实际访问域名一致。
