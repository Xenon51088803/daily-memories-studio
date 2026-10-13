# 日常留存 · Daily Memories Studio

一个以记录与回忆为主题的个人主页项目。用一句话留住当天的心情，用文章整理经历，用照片串起时间与地点，让生活中的点滴有处可寻。

界面采用温暖、简洁的纸质日记风格，提供本机网页工作室编辑内容，并支持将公开主页发布到 GitHub Pages。

## 功能

- **个人展示**：首页介绍、关于页面、文章和项目展示，构成自己的线上空间。
- **每日一句**：按日期记录短句，支持换行，并通过日历回看某一天留下的文字。
- **Markdown 写作**：输入与实时预览、导入已有 Markdown 文件，支持 KaTeX 数学公式。
- **摄影与足迹**：按相册、日期和地点浏览照片，通过地图、故地重游和旅程回放重温经历。
- **私密记录**：密码保护的本机日记，照片和相册也可设为私密；私密内容不进入公开网页。
- **网页工作室**：在浏览器中管理内容、上传图片、预览页面，并发布到 GitHub Pages。

## 快速开始

安装 [Node.js 24 LTS](https://nodejs.org/)，然后：

```sh
git clone https://github.com/Xenon51088803/daily-memories-studio.git
cd daily-memories-studio
npm ci
npm run studio
```

打开 [内容工作室](http://127.0.0.1:3310/studio)，即可从示例内容开始编辑主页。打开 [私密日记](http://127.0.0.1:3310/diary)，首次设置密码后即可记录。

内容工作室与日记在本机运行，个人内容存储在本机，需要自行备份。

## 发布与使用

公开主页以静态网页形式部署到 GitHub Pages，可使用 GitHub 提供的免费网址，无需购买域名。完成发布配置后，可通过工作室中的发布按钮更新网站。

发布只包含公开内容；本机修改需要重新发布才会显示在网站上。

- [部署到 GitHub Pages](docs/DEPLOY.md)
- [每日一句与私密日记](docs/DIARY.md)
- [摄影相册](docs/PHOTO_ALBUMS.md)

## 技术栈

Next.js · React · TypeScript · Sass · SQLite · Leaflet · KaTeX

## 来源与许可

本项目基于 [personal-homepage-studio](https://github.com/concorde-blade/personal-homepage-studio) 和 [Magic Portfolio](https://github.com/once-ui-system/magic-portfolio) 改编。

沿用上游 **CC BY-NC 4.0** 许可，允许在署名并遵守许可条款的前提下分享与改编，仅限非商业用途。第三方库按各自许可使用，详见 [LICENSE](LICENSE) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
