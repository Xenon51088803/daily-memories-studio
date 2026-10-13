#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null || ! command -v npm >/dev/null || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"; then
  print '请先安装 Node.js 22 或 24 LTS，然后重新打开。'
  read '?按回车关闭。'
  exit 1
fi
if [[ ! -f node_modules/next/dist/bin/next ]]; then
  print '首次启动，正在安装网站依赖…'
  npm ci || { read '?安装失败，按回车关闭。'; exit 1; }
fi
node scripts/start-studio.mjs
result=$?
if (( result != 0 )); then
  read '?启动失败，请查看上方提示。按回车关闭。'
fi
exit $result
