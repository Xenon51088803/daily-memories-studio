# 参与贡献

欢迎改进交互、无障碍、文档、Windows/macOS 兼容性和发布体验。可以先提 Issue 说明使用场景，也可以直接提交小范围修复的 Pull Request。

## 本地开发

Fork 公开模板、克隆自己的 Fork，然后运行：

```sh
npm ci
npm run dev
```

开发服务位于 http://127.0.0.1:3307 ，编辑页位于 `/studio`。贡献代码的公开 Fork 不用于保存个人草稿；个人网站的发布设置见 [DEPLOY.md](docs/DEPLOY.md)。

## 提交前

- 运行 `npm test`、`npm run typecheck`；涉及页面或构建时运行 `npm run export:web`。
- 页面调整请附桌面和手机截图，并说明验证过的系统与浏览器。
- 使用 Once UI 布局组件、语义颜色和 SCSS；项目专用组件放在 `src/components/personal/`。
- 保留简约背景和格点鼠标轨迹，不添加跟随光标的圆圈。
- 保留第三方许可与来源。新增素材需说明来源与授权。
- 不提交个人发布配置、`.env`、访问令牌、本机备份、node_modules 或构建目录。

PR 描述说明解决的问题、最终行为和验证结果。多人协作内容模型尚未实现；较大的内容模型改动建议先通过 Issue 讨论迁移方案。

提交的改动采用仓库当前许可；已有第三方组件和引用代码仍保留各自许可。
