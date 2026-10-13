import { openDiary } from '../src/lib/diary-store.mjs';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import path from 'node:path';
let muted = false;
const output = new Writable({write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); }});
const reader = createInterface({input:process.stdin,output,terminal:true});
const dir = process.env.DIARY_DATA_DIR || path.join(process.cwd(),'.diary-data');
let store;
try {
  process.stdout.write('新的日记密码（至少 10 个字符，输入不回显）：');
  muted = true;
  const first = await reader.question('');
  process.stdout.write('\n再输入一次：');
  const second = await reader.question('');
  process.stdout.write('\n');
  if(first !== second) throw new Error('两次密码不一致，未修改。');
  if(first.length < 10 || first.length > 200) throw new Error('密码长度需为 10–200 个字符。');
  store = openDiary(dir);
  store.resetPassword(first);
  console.log('密码已重置，旧会话已撤销，日记已保留。');
} catch(error) {console.error(error.message); process.exitCode=1;}
finally {muted=false; reader.close(); store?.close();}
