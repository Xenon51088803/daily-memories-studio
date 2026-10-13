# 发布到 GitHub Pages

需要 Node.js 24、Git 和已登录的 GitHub CLI（gh auth login）。源码仓库可以公开；个人内容应保留在 Git 忽略的本机文件中。

1. 克隆你自己的源码仓库并运行 npm ci。
2. 运行 npm run setup:github -- --repository my-homepage，配置独立的网页仓库名称；不要使用源码仓库名称。
3. 运行 npm run studio，修改、保存并预览内容。
4. 运行 npm run publish:web，或双击「发布公开主页.cmd」。也可以使用工作室发布按钮。
5. 等待“发布成功”，打开命令输出的网址。必要时使用 Ctrl + F5 刷新。

发布配置仅写入本机 publish-config.json，不提交到源码仓库。发布时会验证目标仓库标记，拒绝覆盖其他普通仓库。

GitHub Pages 只运行静态网页。日记、工作室、API、私密照片和未来日期的句子不会上传。每日一句到达展示日期后仍需重新发布，源码 push 不会自动同步本机内容。

没有文章或项目时，对应列表页正常保留，静态导出跳过不存在的详情页。

首次授权或网络失败时，可运行「登录GitHub.cmd」与「检查发布连接.cmd」。这些命令需要已安装 GitHub CLI；仓库不分发维护者的便携程序或登录凭据。

## 更新源码

修改代码后运行相关测试，检查 git diff 和 git status，再使用 git add、git commit、git push 同步。不要使用 git add -f 提交个人内容、数据库、配置或图片。不要将源码仓库设为个人内容备份仓库。

## 换电脑

克隆源码并 npm ci 只能获得示例内容。自己的 src/content/site.json、public/images/、.diary-data/ 和必要配置需要由本人通过安全的备份方式单独迁移。
