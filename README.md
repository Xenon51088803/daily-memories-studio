# 日常留存 · Daily Memories Studio

一个温暖、简洁的个人主页：用每日一句、文字、照片和私密日记记录生活。内容在本机网页工作室编辑，公开页面可以发布到 GitHub Pages。

## 功能

- 首页、关于、文章与项目展示。
- 每日一句支持换行、指定展示日期和日历回看。
- 密码登录的本机私密日记；静态网页不包含日记和登录接口。
- Markdown 输入与实时预览、导入 Markdown 文件、KaTeX 数学公式。
- 照片上传、相册、逐日浏览、地点地图、故地重游、旅程回放和放大查看。
- 私密照片及相册不会进入静态导出，包括图片文件、地点和坐标。
- Windows / macOS 启动器和 GitHub Pages 发布工具。
- 不集成访问统计。

公开模板默认不启用任何私人扩展。已有个人站点可在 Git 忽略的本机扩展文件中保留自己的服务接入，这些文件不会随源码同步。

## 快速开始

安装 [Node.js 24 LTS](https://nodejs.org/)，然后：

```sh
git clone https://github.com/Xenon51088803/daily-memories-studio.git
cd daily-memories-studio
npm ci
npm run studio
```

打开 http://127.0.0.1:3310/studio 。首次安装只创建缺失的本机内容文件，不覆盖已有内容。仓库仅包含新编写的示例文章；摄影和项目列表默认留空。

Windows 也可以双击「启动日记主页.cmd」。日记在 http://127.0.0.1:3310/diary 首次设置密码后使用。工作室只允许本机访问，不要将开发服务器直接暴露到公网。

## 源码与个人内容

| 文件或目录 | 用途 | 是否提交源码仓库 |
| --- | --- | --- |
| src/content/site.example.json | 通用示例内容 | 是 |
| src/content/site.json | 你的主页、文章、照片清单 | 否 |
| public/images/ | 你的图片 | 否 |
| .diary-data/ | 私人日记、每日一句、登录数据 | 否 |
| publish-config.json | 你的发布目标 | 否 |
| .content-backups/、.publish-state/、.tools/ | 备份、日志、工具与凭据 | 否 |
| src/content/local-extensions.tsx、scripts/local-export.mjs | 本机私人扩展 | 否 |

个人内容默认由 Git 忽略。请自行备份这些本机文件；克隆源码仓库不会恢复它们。仓库不包含任何维护者的本机文章、照片、日记、账户配置或备份。

## 发布与更新

[发布指南](docs/DEPLOY.md) · [每日一句与私密日记](docs/DIARY.md) · [摄影相册](docs/PHOTO_ALBUMS.md)

源码仓库和生成的网页仓库使用不同名称。网页发布只上传公开静态文件，不提交源码或私密数据。源码修改使用正常的 Git commit / push 同步；GitHub Pages 更新使用工作室发布按钮或 npm run publish:web，两者互不替代。

## 开发

```sh
npm run dev          # 本机开发，端口 3310
npm test             # 单元与隐私隔离测试
npm run typecheck    # TypeScript 检查
npm run test:e2e     # Chrome 浏览器测试，需要已安装 Chrome
npm run export:web   # 只生成静态文件，不上传
```

摄影地点需要在工作室中填写确认过的 WGS84 坐标。地图底图由 Esri 提供，网络不可用时仍能通过地点列表浏览。到访分组按相邻拍摄日间隔不超过 3 天进行归并，是辅助整理规则，不代表精确旅行行程。

## 来源与许可

本项目基于 [personal-homepage-studio](https://github.com/concorde-blade/personal-homepage-studio) 和 [Magic Portfolio](https://github.com/once-ui-system/magic-portfolio) 改编。

保留上游 **CC BY-NC 4.0**：允许署名分享与改编，仅限非商业用途。因此这是公开源码项目，不是允许自由商用的 MIT / Apache 或 OSI 开源许可。第三方库按各自许可使用，详见 [LICENSE](LICENSE) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
