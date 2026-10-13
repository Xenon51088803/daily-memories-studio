# Windows 使用说明

## 第一次启动

1. 安装 [Node.js 22 或 24 LTS](https://nodejs.org/) 的 Windows 版本，保留安装器默认的 PATH 设置。
2. 下载 [Release 中的 ZIP](https://github.com/concorde-blade/personal-homepage-studio/releases/latest)，右键「全部解压」。不要直接在 ZIP 预览窗口中运行。
3. 将项目放在普通本地目录，例如 `C:\Projects\personal-homepage-studio`。
4. 双击项目根目录的 **start-windows.cmd**。
5. 首次会安装依赖；等待浏览器打开 **http://127.0.0.1:3310/studio**。

修改文字、博客、照片或项目后，点「保存到网页」即可在本机预览。编辑期间保持命令提示符窗口打开，结束时按 Ctrl+C。

这是 Windows 可用的本地网页工作室，需要 Node.js；不包含原生桌面安装程序。已经发布的公网网站在 Windows 的 Edge / Chrome 中可以直接访问，不需要启动本地工作室。

## 发布到公网

本地编辑只需要 Node.js。发布还需要 [Git for Windows](https://git-scm.com/downloads/win)、[GitHub CLI](https://cli.github.com/) 和自己的 GitHub 账号。装好后重新打开命令提示符，让新 PATH 生效。

按 [发布指南](DEPLOY.md) 创建自己的私有源码副本、克隆到本机并配置发布。启动器使用 `.cmd`，不要求修改 PowerShell 的执行策略；安装和运行都不要求管理员权限。

## 换电脑后继续编辑已有网站

在 Windows 命令提示符中登录并克隆你原来的**私有源码仓库**，然后双击其中的 `start-windows.cmd`。不要用示例模板覆盖自己的源码。

```bat
gh auth login
gh auth setup-git
gh repo clone YOUR_ACCOUNT/YOUR_PRIVATE_SOURCE
cd YOUR_PRIVATE_SOURCE
start-windows.cmd
```

把上面的占位名称换成自己的账号和仓库。已有仓库里的 `publish-config.json` 会继续使用原公网网址。未发布的本机修改需要先从旧电脑复制过来。

## 常见情况

- **提示找不到 Node.js**：确认安装了 LTS 版本，关闭启动窗口后重新双击。可以在新的命令提示符运行 `node --version` 和 `npm --version` 检查。
- **依赖没有安装完整**：在项目文件夹地址栏输入 `cmd` 打开命令提示符，运行 `npm ci`，再启动。升级项目依赖后也运行一次 `npm ci`。
- **浏览器没有自动打开**：手动访问 http://127.0.0.1:3310/studio 。
- **3310 端口被占用**：关闭之前的主页项目启动窗口，再运行当前项目。
- **首次启动比较慢**：正在安装依赖或下载字体；保持联网并查看窗口中的进度。
- **发布按钮不可用**：先按发布指南配置；有未保存修改时，先保存。
- **发布失败**：查看界面提示与 `.publish-state/publish.log`，确认 `git --version`、`gh --version` 和 `gh auth status` 正常。

目前已完成跨平台脚本与构建检查，尚未做 Windows 实机验收；若发现 Windows 专属问题，请在仓库提交 Issue 并附 Node.js 版本及错误内容。
