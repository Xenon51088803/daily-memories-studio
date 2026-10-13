export function makePublishConfig(owner, sourceRepository, repository) {
  const validRepo = (name) => typeof name === "string" && /^[a-zA-Z0-9_.-]+$/.test(name) && ![".", ".."].includes(name);
  if (!owner || !/^[a-zA-Z0-9-]+$/.test(owner) || !validRepo(sourceRepository) || !validRepo(repository))
    throw new Error("请提供有效的 GitHub 用户名和仓库名称。");
  if (sourceRepository.toLowerCase() === repository.toLowerCase())
    throw new Error("源码仓库和网页仓库必须使用不同名称。");
  const basePath = repository.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "" : `/${repository}`;
  return { owner, repository, sourceRepository, branch: "main", basePath, url: `https://${owner.toLowerCase()}.github.io${basePath}` };
}

export function validatePublishConfig(config) {
  if (!config.owner || !config.sourceRepository || !config.repository)
    throw new Error("还没有配置公网发布。请按 docs/DEPLOY.md 配置自己的源码与网页仓库，再运行 npm run setup:github。");
  const expected = makePublishConfig(config.owner, config.sourceRepository, config.repository);
  if (config.branch !== "main" || config.basePath !== expected.basePath || config.url !== expected.url)
    throw new Error("发布地址或分支不匹配，请重新运行 npm run setup:github。");
  return config;
}
