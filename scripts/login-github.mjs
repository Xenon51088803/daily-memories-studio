import { spawn } from 'node:child_process';
import { ghPath, ghConfigDirectory, githubEnv } from './github.mjs';

console.log(`登录使用的 GitHub 配置：${ghConfigDirectory || 'CLI default'}`);
console.log('将使用 GitHub 官方设备授权；请按下方提示在浏览器中操作。');
console.log('看到“Press Enter”时，请在当前窗口按回车，再到浏览器输入验证码并确认授权。这行提示不是报错。');
const child = spawn(ghPath,['auth','login','--hostname','github.com','--git-protocol','https','--web','--skip-ssh-key'],{
  env:githubEnv,stdio:'inherit',windowsHide:false,
});
child.on('error',error=>{console.error(`无法启动 GitHub 登录：${error.message}`);process.exitCode=1;});
child.on('exit',code=>{
  process.exitCode=code ?? 1;
  console.log(code === 0 ? '授权完成。请双击「检查发布连接.cmd」验证。' : '授权未完成。请保留上方错误文字；浏览器登录成功不一定代表设备授权完成。');
});
