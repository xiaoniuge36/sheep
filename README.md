# 🐑 羊了个羊 (Web版)

这是一个使用 HTML/CSS/JS 开发的“羊了个羊”风格的 Web 小游戏，包含关卡难度递增、3D 卡片效果、排行榜（模拟）等功能。

## 🚀 部署指南 (替代 Gitee Pages)

由于 Gitee Pages 目前暂停服务，推荐以下 **国内可访问** 的替代方案。

### 方案一：Vercel (推荐)
Vercel 是全球最流行的静态网站托管服务之一，国内访问速度尚可，且部署非常简单。

1. 注册 [Vercel](https://vercel.com) 账号 (使用 GitHub 登录)。
2. 点击 **"Add New..."** -> **"Project"**。
3. 导入你的 GitHub 仓库 (需要先将代码 Push 到 GitHub)。
4. 点击 **"Deploy"**，等待几秒即可生成访问链接 (例如 `https://sheep-game.vercel.app`)。

### 方案二：Cloudflare Pages (速度快)
Cloudflare 拥有全球 CDN 节点，国内访问速度通常优于 GitHub Pages。

1. 注册 [Cloudflare](https://pages.cloudflare.com/) 账号。
2. 进入 **"Pages"** 页面，点击 **"Create a project"** -> **"Connect to Git"**。
3. 选择你的 GitHub 仓库并部署。

### 方案三：GitHub Pages (备用)
如果上述方案无法使用，可以使用 GitHub 自带的 Pages 服务，但国内访问可能较慢。

1. 将代码上传到 GitHub 仓库。
2. 进入仓库 **Settings** -> **Pages**。
3. 在 **Branch** 处选择 `master` 或 `main` 分支，点击 Save。

### 5. 分享给朋友
直接复制那个网址发给微信好友即可畅玩！

---

## 💾 关于数据存储

目前的“排行榜”数据是存储在玩家浏览器本地（LocalStorage）的，仅供演示。
如果需要实现**全网真实联机排行榜**，您需要一个后端数据库。

推荐方案（免费）：
- **LeanCloud** (国内版)：提供免费的 Serverless 数据库，适合前端直接调用。
- **微信云开发**：如果是开发微信小程序，这是最佳选择。
