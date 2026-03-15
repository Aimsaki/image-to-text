# AI 图生文 - 智能文案生成器

一个独立的AI图片文案生成工具，支持多平台文案风格。

## 功能特点

- 🖼️ 图片上传：支持拖拽上传，最多4张图片
- 📱 多平台支持：小红书、淘宝/天猫、亚马逊、TikTok
- 🎯 专业模式：演艺/音响专业术语增强
- 📋 一键复制：快速复制生成结果
- 📱 响应式设计：完美适配手机和电脑

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```
DASHSCOPE_API_KEY=your_api_key_here
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3001

## 部署到 Vercel

### 方法一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/image-to-text)

### 方法二：手动部署

1. 将代码推送到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 导入 GitHub 仓库
4. 配置环境变量 `DASHSCOPE_API_KEY`
5. 点击 Deploy

## 获取 API Key

1. 访问 [阿里云 DashScope](https://dashscope.console.aliyun.com/)
2. 开通服务并创建 API Key
3. 将 API Key 配置到环境变量

## 技术栈

- Next.js 14
- React 18
- Tailwind CSS
- 阿里云通义千问 VL (视觉语言模型)

## License

MIT
