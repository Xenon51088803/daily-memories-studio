import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=files.filter(file=>
  /^(?:\.tools|\.diary-data|\.diary-test-data|\.analytics-data|\.content-backups|\.publish-build|\.publish-state|\.local-tests|\.source-release|photos|passage|test-results)\//.test(file)
  || ['src/content/site.json','src/content/public-quotes.json','publish-config.json','src/content/local-extensions.tsx','scripts/local-export.mjs','src/content/analytics-public.json','src/components/personal/AnalyticsPanel.tsx','src/components/personal/AnalyticsPanel.module.scss','src/lib/analytics-config.mjs','src/lib/analytics-store.mjs'].includes(file)
  || /^(?:src\/components\/analytics|src\/app\/api\/studio\/analytics)\//.test(file)
  || file.startsWith('public/images/')&&!file.startsWith('public/images/examples/')
  || /(?:^|\/)\.env(?:\.|$)/.test(file)&&file!=='.env.example'
  || /\.(?:sqlite(?:3)?|db|log|pem)$/.test(file));
const secrets=files.filter(file=>{
  if(/\.(?:webp|png|jpe?g|ico|woff2?|ttf)$/i.test(file))return false;
  const text=fs.readFileSync(file,'utf8');
  return /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text);
});
if(forbidden.length||secrets.length) {
  console.error('源码检查未通过（只显示文件路径，不显示敏感内容）：', [...new Set([...forbidden,...secrets])]);
  process.exitCode=1;
} else console.log(`源码检查通过：${files.length} 个跟踪文件，无禁止的本机数据路径或常见凭据。`);
