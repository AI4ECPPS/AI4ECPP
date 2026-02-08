# 🚀 AI4ECPP 启动指南

## 快速启动

### 第一步：启动后端服务器

打开终端，运行：

```bash
cd server
npm start
```

后端服务器将在 **http://localhost:3001** 启动

### 第二步：启动前端服务器

打开**另一个终端窗口**，运行：

```bash
npm run dev
```

前端服务器将在 **http://localhost:1307** 启动

### 第三步：访问应用

在浏览器中打开：**http://localhost:1307**

---

## 📋 重要信息

### 端口配置
- **前端**: 1307
- **后端**: 3001

### 环境变量
后端服务器的配置在 `server/.env` 文件中：
- `OPENAI_API_KEY` - 从 [OpenAI](https://platform.openai.com/api-keys) 获取
- `JWT_SECRET` - 使用 `openssl rand -base64 32` 生成
- `FRONTEND_URL` - http://localhost:1307

### 依赖安装
如果遇到问题，确保已安装所有依赖：

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

---

## 🛑 停止服务器

在运行服务器的终端窗口中按 `Ctrl + C` 即可停止服务器。

---

## 📝 功能说明

应用包含以下功能模块：

1. **Policy Memo Generator** - 生成政策备忘录
2. **Paper Deconstructor** - 论文解构分析
3. **Empirical Copilot** - 生成实证分析代码
4. **Interview Trainer** - 面试训练
5. **Offer Generator** - 生成有趣的PhD offer

---

## ⚠️ 注意事项

- 确保 OpenAI API Key 在 `server/.env` 中已正确配置
- 两个服务器需要**同时运行**才能正常工作
- 如果端口被占用，检查是否有其他进程在使用这些端口

---

## 🆘 遇到问题？

1. 检查后端服务器是否正常运行（访问 http://localhost:3001/api/health）
2. 检查前端服务器是否正常运行（访问 http://localhost:1307）
3. 查看终端中的错误信息
4. 确认 `.env` 文件中的配置是否正确

---

**祝使用愉快！** 🎉

